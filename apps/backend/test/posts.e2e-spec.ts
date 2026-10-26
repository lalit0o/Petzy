import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PostType } from '../src/generated/prisma/enums';
import { PostModule } from '../src/post/post.module';
import { PostPhotoService } from '../src/post/post-photo.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CommentsModule } from '../src/comments/comments.module';

const describeWithDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase('Publicaciones: separación, permisos y escritura (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const ana = `posts-ana-${suffix}`;
  const luis = `posts-luis-${suffix}`;
  let communityId: number;
  let otherCommunityId: number;
  let anaPetId: number;
  let homePostId: number;
  let communityPostId: number;
  let otherCommunityPostId: number;
  const photos = {
    upload: jest.fn().mockResolvedValue('checks/post.jpg'),
    download: jest.fn().mockResolvedValue({ bytes: Buffer.from([0xff, 0xd8, 0xff]), contentType: 'image/jpeg' }),
    removeAfterCommit: jest.fn().mockResolvedValue(undefined),
  };

  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, userId = ana) =>
    request(app.getHttpServer())[method](path).set('x-test-user-id', userId);

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, PostModule, CommentsModule] })
      .overrideProvider(PostPhotoService).useValue(photos).compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => {
      req.user = { id: String(req.headers['x-test-user-id']) };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.createMany({ data: [
      { id: ana, email: `${ana}@example.test`, username: ana, locatedAt: 'BAJA_CALIFORNIA' },
      { id: luis, email: `${luis}@example.test`, username: luis, locatedAt: 'BAJA_CALIFORNIA' },
    ] });
    const community = await prisma.community.create({ data: { name: `Prueba ${suffix}`, description: 'Prueba de posts', topic: 'Publicaciones' } });
    const other = await prisma.community.create({ data: { name: `Otra ${suffix}`, description: 'Otra comunidad', topic: 'Consejos' } });
    communityId = community.id;
    otherCommunityId = other.id;
    await prisma.communityMember.create({ data: { userId: ana, communityId, role: 'MEMBER' } });
    await prisma.communityMember.create({ data: { userId: luis, communityId: otherCommunityId, role: 'MEMBER' } });
    anaPetId = (await prisma.pet.create({ data: {
      ownerId: ana, name: 'Luna', species: 'Perro', breed: 'Mestiza',
      birthYear: 2024, birthMonth: 5, birthDay: null,
    } })).id;
    homePostId = (await prisma.post.create({ data: {
      userId: ana, title: 'General', description: 'En Inicio', type: PostType.GENERAL,
    } })).id;
    communityPostId = (await prisma.post.create({ data: {
      userId: ana, communityId, title: 'En comunidad', description: 'Solo miembros', type: PostType.HELP,
    } })).id;
    otherCommunityPostId = (await prisma.post.create({ data: {
      userId: luis, communityId: otherCommunityId, title: 'En otra comunidad', description: 'Solo sus miembros', type: PostType.TIP,
    } })).id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.moderationRemoval.deleteMany({ where: { moderatorId: { in: [ana, luis] } } });
      await prisma.comment.deleteMany({ where: { userId: { in: [ana, luis] } } });
      await prisma.postLike.deleteMany({ where: { userId: { in: [ana, luis] } } });
      await prisma.post.deleteMany({ where: { userId: { in: [ana, luis] } } });
      await prisma.pet.deleteMany({ where: { ownerId: { in: [ana, luis] } } });
      await prisma.communityMember.deleteMany({ where: { userId: { in: [ana, luis] } } });
      await prisma.community.deleteMany({ where: { id: { in: [communityId, otherCommunityId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [ana, luis] } } });
      await prisma.$disconnect();
    }
    await app?.close();
  });

  it('keeps community posts out of Home and filters categories', async () => {
    const all = await call('get', '/posts').expect(200);
    expect(all.body.items.map((post: { id: number }) => post.id)).toContain(homePostId);
    expect(all.body.items.map((post: { id: number }) => post.id)).not.toContain(communityPostId);
    expect(all.body.items.map((post: { id: number }) => post.id)).not.toContain(otherCommunityPostId);
    const help = await call('get', '/posts?type=HELP').expect(200);
    expect(help.body.items).toEqual([]);
  });

  it('continues a filtered page without duplicating or mixing posts', async () => {
    for (const title of ['Ayuda uno', 'Ayuda dos', 'Ayuda tres']) {
      await prisma.post.create({ data: { userId: ana, type: PostType.HELP, title, description: title } });
    }
    const first = await call('get', '/posts?type=HELP&limit=2').expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toEqual(expect.any(Number));
    const second = await call('get', `/posts?type=HELP&limit=2&cursor=${first.body.nextCursor}`).expect(200);
    expect(second.body.items).toHaveLength(1);
    const ids = [...first.body.items, ...second.body.items].map((post: { id: number }) => post.id);
    expect(new Set(ids).size).toBe(3);
    await call('get', `/posts?type=GENERAL&cursor=${first.body.nextCursor}`).expect(400);
  });

  it('checks community membership in the list and direct detail', async () => {
    await call('get', `/communities/${communityId}/posts`, luis).expect(403);
    await call('get', `/posts/${communityPostId}`, luis).expect(404);
    const allowed = await call('get', `/communities/${communityId}/posts`).expect(200);
    expect(allowed.body.items.map((post: { id: number }) => post.id)).toContain(communityPostId);
    expect(allowed.body.items.map((post: { id: number }) => post.id)).not.toContain(otherCommunityPostId);
    const otherAllowed = await call('get', `/communities/${otherCommunityId}/posts`, luis).expect(200);
    expect(otherAllowed.body.items.map((post: { id: number }) => post.id)).toContain(otherCommunityPostId);
    expect(otherAllowed.body.items.map((post: { id: number }) => post.id)).not.toContain(communityPostId);
  });

  it('rejects invalid content, client owned fields and a foreign pet', async () => {
    await call('post', '/posts').send({ title: 'Título', description: 'Texto' }).expect(400);
    await call('post', '/posts').send({ type: 'HELP', title: '   ', description: 'Texto' }).expect(400);
    await call('post', '/posts').send({ type: 'HELP', title: 'Título', description: 'Texto', communityId }).expect(400);
    await call('post', '/posts', luis).send({ type: 'HELP', title: 'Título', description: 'Texto', petId: anaPetId }).expect(400);
    await call('post', '/posts').send({ type: 'GENERAL', title: 'x'.repeat(121), description: 'Texto' }).expect(400);
    await call('post', '/posts').send({ type: 'GENERAL', title: 'Título', description: 'x'.repeat(3001) }).expect(400);
  });

  it('accepts each approved category when the author selects it', async () => {
    for (const type of Object.values(PostType)) {
      const created = await call('post', '/posts').send({ type, title: `Categoría ${type}`, description: 'Elegida por el autor' }).expect(201);
      expect(created.body.type).toBe(type);
    }
  });

  it('creates with the token author and route community, and prevents moving a post', async () => {
    const created = await call('post', `/communities/${communityId}/posts`).send({
      type: 'HELP', title: '  Necesito ayuda  ', description: '  Busco consejo  ', petId: anaPetId,
    }).expect(201);
    expect(created.body).toMatchObject({
      userId: ana, communityId, title: 'Necesito ayuda',
      pet: { id: anaPetId, name: 'Luna', species: 'Perro', isAgeApproximate: true, photoUrl: null },
    });
    expect(created.body.pet.age).toEqual(expect.any(Number));
    await call('patch', `/posts/${created.body.id}`, luis).send({ title: 'Ajeno' }).expect(404);
    await call('patch', `/posts/${created.body.id}`).send({ communityId: otherCommunityId }).expect(400);
    const withoutPet = await call('patch', `/posts/${created.body.id}`).send({ removePet: true }).expect(200);
    expect(withoutPet.body.pet).toBeNull();
    expect((await prisma.post.findUnique({ where: { id: created.body.id } }))?.petId).toBeNull();
  });

  it('keeps a post when its linked pet is deactivated, without showing the pet complement', async () => {
    const created = await call('post', '/posts').send({
      type: 'GENERAL', title: 'Luna en el parque', description: 'Una tarde agradable', petId: anaPetId,
    }).expect(201);
    expect(created.body.pet).toMatchObject({ id: anaPetId, name: 'Luna', photoUrl: null });
    await prisma.pet.update({ where: { id: anaPetId }, data: { isActive: false } });
    const stillVisible = await call('get', `/posts/${created.body.id}`).expect(200);
    expect(stillVisible.body.title).toBe('Luna en el parque');
    expect(stillVisible.body.pet).toBeNull();
    await call('get', `/pets/${anaPetId}`).expect(404);
  });

  it('moves an edited post to its new category and keeps author removal out of moderation', async () => {
    const created = await call('post', '/posts').send({
      type: 'GENERAL', title: 'Antes', description: 'Contenido inicial',
    }).expect(201);
    const postId = created.body.id as number;
    await call('patch', `/posts/${postId}`, luis).send({ title: 'Ajeno' }).expect(404);
    const changed = await call('patch', `/posts/${postId}`).send({
      type: 'HELP', title: 'Después', description: 'Contenido editado',
    }).expect(200);
    expect(changed.body).toMatchObject({ type: 'HELP', title: 'Después', description: 'Contenido editado' });
    const general = await call('get', '/posts?type=GENERAL').expect(200);
    const help = await call('get', '/posts?type=HELP').expect(200);
    expect(general.body.items.map((item: { id: number }) => item.id)).not.toContain(postId);
    expect(help.body.items.map((item: { id: number }) => item.id)).toContain(postId);
    await call('delete', `/posts/${postId}`).expect(200);
    await call('get', `/posts/${postId}`).expect(404);
    expect(await prisma.moderationRemoval.count({ where: { postId } })).toBe(0);
  });

  it('hides inactive posts and posts from deactivated authors', async () => {
    await call('delete', `/posts/${homePostId}`).expect(200);
    await call('get', `/posts/${homePostId}`).expect(404);
    await prisma.user.update({ where: { id: ana }, data: { isActive: false } });
    await call('get', `/posts/${communityPostId}`).expect(404);
    await prisma.user.update({ where: { id: ana }, data: { isActive: true } });
    await call('get', `/posts/${communityPostId}`).expect(200);
  });

  it('lets a moderator remove and only an admin restore a community post', async () => {
    await prisma.communityMember.create({ data: { userId: luis, communityId, role: 'MODERATOR' } });
    await call('delete', `/communities/${communityId}/posts/${communityPostId}`, luis).expect(200);
    await call('get', `/posts/${communityPostId}`).expect(404);
    await call('get', `/communities/${communityId}/moderation/posts`, luis).expect(403);
    await call('post', `/communities/${communityId}/moderation/posts/${communityPostId}/restore`, luis).expect(403);
    await prisma.communityMember.update({
      where: { userId_communityId: { userId: luis, communityId } }, data: { role: 'ADMIN' },
    });
    const removed = await call('get', `/communities/${communityId}/moderation/posts`, luis).expect(200);
    expect(removed.body.items.map((item: { post: { id: number } }) => item.post.id)).toContain(communityPostId);
    await call('post', `/communities/${otherCommunityId}/moderation/posts/${communityPostId}/restore`, luis).expect(403);
    await call('post', `/communities/${communityId}/moderation/posts/${communityPostId}/restore`, luis).expect(201);
    await call('get', `/posts/${communityPostId}`, luis).expect(200);
    await call('post', `/communities/${communityId}/moderation/posts/${communityPostId}/restore`, luis).expect(404);
  });

  it('rejects member moderation, self moderation and a second removal', async () => {
    const authoredByLuis = await prisma.post.create({ data: {
      userId: luis, communityId, title: 'Aviso de Luis', description: 'Contenido de la comunidad', type: PostType.GENERAL,
    } });
    await call('delete', `/communities/${communityId}/posts/${authoredByLuis.id}`, ana).expect(403);
    await call('delete', `/communities/${communityId}/posts/${authoredByLuis.id}`, luis).expect(403);
    const authoredByAna = await prisma.post.create({ data: {
      userId: ana, communityId, title: 'Aviso de Ana', description: 'Otro contenido', type: PostType.TIP,
    } });
    await call('delete', `/communities/${communityId}/posts/${authoredByAna.id}`, luis).expect(200);
    await call('delete', `/communities/${communityId}/posts/${authoredByAna.id}`, luis).expect(404);
  });

  it('authorizes each photo request and prevents shared caching', async () => {
    const created = await call('post', '/posts')
      .field('type', 'GENERAL')
      .field('title', 'Foto de Luna')
      .field('description', 'La comparto aquí')
      .attach('photo', Buffer.from([0xff, 0xd8, 0xff]), { filename: 'luna.jpg', contentType: 'image/jpeg' })
      .expect(201);
    expect(created.body).toMatchObject({ hasPhoto: true, photoPath: `/posts/${created.body.id}/photo` });
    const photo = await call('get', `/posts/${created.body.id}/photo`, luis).expect(200);
    expect(photo.headers['cache-control']).toBe('private, no-store');
    expect(photo.headers['vary']).toContain('Authorization');
    expect(photos.download).toHaveBeenCalledWith('checks/post.jpg');
    await prisma.user.update({ where: { id: ana }, data: { isActive: false } });
    await call('get', `/posts/${created.body.id}/photo`, luis).expect(404);
    await prisma.user.update({ where: { id: ana }, data: { isActive: true } });
    await call('delete', `/posts/${created.body.id}`).expect(200);
    await call('get', `/posts/${created.body.id}/photo`, luis).expect(404);
  });

  it('rejects a second attached photo before creating a post', async () => {
    const countBefore = await prisma.post.count({ where: { userId: ana } });
    await call('post', '/posts')
      .field('type', 'GENERAL').field('title', 'Dos fotos').field('description', 'No debe guardarse')
      .attach('photo', Buffer.from('first'), { filename: 'uno.jpg', contentType: 'image/jpeg' })
      .attach('photo', Buffer.from('second'), { filename: 'dos.jpg', contentType: 'image/jpeg' })
      .expect(400);
    expect(await prisma.post.count({ where: { userId: ana } })).toBe(countBefore);
  });

  it('rejects a photo over 5 MB before creating a post', async () => {
    const countBefore = await prisma.post.count({ where: { userId: ana } });
    await call('post', '/posts')
      .field('type', 'GENERAL').field('title', 'Foto demasiado grande').field('description', 'No debe guardarse')
      .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'grande.jpg', contentType: 'image/jpeg' })
      .expect(413);
    expect(await prisma.post.count({ where: { userId: ana } })).toBe(countBefore);
  });

  it('revokes access to a community photo as soon as membership is removed', async () => {
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId: luis, communityId } },
      update: { role: 'MEMBER' }, create: { userId: luis, communityId, role: 'MEMBER' },
    });
    const created = await call('post', `/communities/${communityId}/posts`)
      .field('type', 'GENERAL').field('title', 'Foto comunitaria').field('description', 'Solo miembros')
      .attach('photo', Buffer.from([0xff, 0xd8, 0xff]), { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .expect(201);
    await call('get', `/posts/${created.body.id}/photo`, luis).expect(200);
    await prisma.communityMember.delete({ where: { userId_communityId: { userId: luis, communityId } } });
    await call('get', `/posts/${created.body.id}/photo`, luis).expect(404);
  });

  it('blocks comment changes while the parent post is hidden', async () => {
    const post = await prisma.post.create({ data: { userId: ana, type: PostType.GENERAL, title: 'Conversación', description: 'Prueba de acceso' } });
    const comment = await call('post', `/posts/${post.id}/comments`, luis).send({ body: 'Hola' }).expect(201);
    await call('patch', `/posts/${post.id}/comments/${comment.body.id}`, luis).send({ body: 'Hola de nuevo' }).expect(200);
    await call('delete', `/posts/${post.id}`).expect(200);
    await call('post', `/posts/${post.id}/comments`, luis).send({ body: 'Oculto' }).expect(404);
    await call('patch', `/posts/${post.id}/comments/${comment.body.id}`, luis).send({ body: 'Oculto' }).expect(404);
    await call('delete', `/posts/${post.id}/comments/${comment.body.id}`, luis).expect(404);
    expect((await prisma.comment.findUnique({ where: { id: comment.body.id } }))?.isActive).toBe(true);
  });

  it('rejects null required fields when editing without changing the post', async () => {
    const created = await call('post', '/posts').send({ type: 'GENERAL', title: 'Conservar título', description: 'Conservar texto' }).expect(201);
    for (const field of ['type', 'title', 'description']) {
      await call('patch', `/posts/${created.body.id}`).send({ [field]: null }).expect(400);
    }
    expect((await call('get', `/posts/${created.body.id}`).expect(200)).body).toMatchObject({ type: 'GENERAL', title: 'Conservar título', description: 'Conservar texto' });
  });
});
