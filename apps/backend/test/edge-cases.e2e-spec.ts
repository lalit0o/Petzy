import { writeFileSync } from 'fs';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { PostModule } from '../src/post/post.module';
import { PostPhotoService } from '../src/post/post-photo.service';
import { CommentsModule } from '../src/comments/comments.module';
import { LikesModule } from '../src/likes/likes.module';
import { PetModule } from '../src/pet/pet.module';
import { PetPhotoService } from '../src/pet/pet-photo.service';
import { UserModule } from '../src/user/user.module';
import { AvatarService } from '../src/user/avatar.service';
import { CommunityModule } from '../src/community/community.module';
import { CommunityPhotoService } from '../src/community/community-photo.service';
import { EventModule } from '../src/event/event.module';
import { ChatModule } from '../src/chat/chat.module';
import { ChatRealtimeService } from '../src/chat/chat-realtime.service';
import { ChatSocketAuthService } from '../src/chat/chat-socket-auth.service';
import { AdoptionModule } from '../src/adoption/adoption.module';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

// Casos límite de todos los módulos con la app completa (22-11-2026).
// Cada caso registra estado esperado y obtenido; la regla común es que
// ninguna entrada del cliente produzca un error 5xx.
type Row = {
  module: string;
  name: string;
  expected: number[];
  actual: number;
  ok: boolean;
};
const rows: Row[] = [];

const describeDatabase = process.env.POST_TEST_DATABASE_URL
  ? describe
  : describe.skip;
describeDatabase('Casos límite de toda la API (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const prefix = `edge${Date.now()}`;
  const [ana, luis, sara] = ['ana', 'luis', 'sara'].map(
    (n) => `${prefix}-${n}`,
  );
  const users = [ana, luis, sara];
  const stored = new Map<string, Buffer>();
  const bucket = {
    upload: jest.fn(async (path: string, bytes: Buffer) => {
      stored.set(path, bytes);
      return { error: null };
    }),
    download: jest.fn(async (path: string) =>
      stored.has(path)
        ? { data: new Blob([new Uint8Array(stored.get(path)!)]), error: null }
        : { data: null, error: { message: 'not found' } },
    ),
    remove: jest.fn(async (paths: string[]) => {
      paths.forEach((p) => stored.delete(p));
      return { error: null };
    }),
  };
  const supabase = {
    getClient: () => ({
      storage: {
        from: () => bucket,
        createBucket: jest.fn(async () => ({ error: null })),
      },
    }),
  };
  const photoFake = {
    upload: jest.fn().mockResolvedValue('edge/photo.jpg'),
    download: jest.fn().mockResolvedValue({
      bytes: Buffer.from([0xff, 0xd8, 0xff]),
      contentType: 'image/jpeg',
    }),
    removeAfterCommit: jest.fn().mockResolvedValue(undefined),
  };
  const realtime = {
    emitToUser: jest.fn(),
    isOnline: jest.fn(() => false),
    attach: jest.fn(),
    connected: jest.fn(() => true),
    disconnected: jest.fn(() => true),
  };
  const jpeg = (n = 1) =>
    Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(20, n),
      Buffer.from([0xff, 0xd9]),
    ]);
  const key = () => `k${Math.random().toString(36).slice(2, 12)}`;
  const hours = (h: number) =>
    new Date(Date.now() + h * 3600_000).toISOString();

  const call = (
    m: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    u = ana,
  ) =>
    request(app.getHttpServer())
      [m](path)
      .set('x-test-user', u)
      .set('x-test-user-id', u);
  const check = (
    module: string,
    name: string,
    res: Response,
    expected: number[],
  ) => {
    rows.push({
      module,
      name,
      expected,
      actual: res.status,
      ok: expected.includes(res.status) && res.status < 500,
    });
    return res;
  };
  const failures = (module: string) =>
    rows
      .filter((r) => r.module === module && !r.ok)
      .map(
        (r) =>
          `${r.name}: esperado ${r.expected.join('/')}, obtenido ${r.actual}`,
      );

  let postId = 0;
  let petAna = 0;
  let petLuis = 0;
  let communityId = 0;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({
      imports: [
        PrismaModule,
        PostModule,
        CommentsModule,
        LikesModule,
        PetModule,
        UserModule,
        CommunityModule,
        EventModule,
        ChatModule,
        AdoptionModule,
      ],
    })
      .overrideProvider(SupabaseService)
      .useValue(supabase)
      .overrideProvider(PostPhotoService)
      .useValue(photoFake)
      .overrideProvider(PetPhotoService)
      .useValue(photoFake)
      .overrideProvider(AvatarService)
      .useValue(photoFake)
      .overrideProvider(CommunityPhotoService)
      .useValue(photoFake)
      .overrideProvider(ChatRealtimeService)
      .useValue(realtime)
      .overrideProvider(ChatSocketAuthService)
      .useValue({ verify: jest.fn() })
      .compile();
    app = module.createNestApplication();
    app.use(
      (
        req: { user?: { id: string }; headers: Record<string, unknown> },
        _res: unknown,
        next: () => void,
      ) => {
        req.user = { id: String(req.headers['x-test-user']) };
        next();
      },
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    await db.user.createMany({
      data: users.map((id) => ({
        id,
        username: id.slice(-24),
        email: `${id}@example.test`,
        locatedAt: 'BAJA_CALIFORNIA',
      })),
    });
    postId = (
      await call('post', '/posts')
        .send({
          type: 'GENERAL',
          title: 'Base',
          description: 'Publicación base',
        })
        .expect(201)
    ).body.id;
    petAna = (
      await call('post', '/pets')
        .send({
          name: 'Luna',
          species: 'Perro',
          breed: 'Mestiza',
          birth: { year: 2023, month: 5 },
        })
        .expect(201)
    ).body.id;
    petLuis = (
      await call('post', '/pets', luis)
        .send({
          name: 'Toby',
          species: 'Gato',
          breed: 'Mestiza',
          birth: { year: 2022, month: 1 },
        })
        .expect(201)
    ).body.id;
    communityId = (
      await call('post', '/communities')
        .send({
          name: `${prefix} base`,
          topic: 'Pruebas',
          description: 'Comunidad para casos límite.',
        })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    if (process.env.EDGE_REPORT)
      writeFileSync(process.env.EDGE_REPORT, JSON.stringify(rows, null, 2));
    if (db) {
      const communities = (
        await db.community.findMany({
          where: { name: { startsWith: prefix } },
          select: { id: true },
        })
      ).map((c) => c.id);
      await db.eventNotice.deleteMany({
        where: { event: { communityId: { in: communities } } },
      });
      await db.eventAttendance.deleteMany({
        where: { event: { communityId: { in: communities } } },
      });
      await db.event.deleteMany({
        where: { communityId: { in: communities } },
      });
      await db
        .$executeRawUnsafe(
          `DELETE FROM "ChatReportMessage" WHERE "reportId" IN (SELECT id FROM "ChatReport" WHERE "reporterId" = ANY($1))`,
          users,
        )
        .catch(() => undefined);
      await db.$disconnect();
    }
    await app?.close();
  });

  it('IDs, paginación y parámetros de consulta', async () => {
    const M = 'IDs y paginación';
    check(M, 'publicación con id 0', await call('get', '/posts/0'), [400, 404]);
    check(
      M,
      'publicación con id negativo',
      await call('get', '/posts/-1'),
      [400, 404],
    );
    check(
      M,
      'publicación con id de texto',
      await call('get', '/posts/abc'),
      [400],
    );
    check(
      M,
      'publicación con id mayor a int32 (2147483648)',
      await call('get', '/posts/2147483648'),
      [400, 404],
    );
    check(
      M,
      'publicación con id de 30 dígitos',
      await call('get', `/posts/${'9'.repeat(30)}`),
      [400, 404],
    );
    check(
      M,
      'publicación con id decimal',
      await call('get', '/posts/1.5'),
      [400],
    );
    check(
      M,
      'mascota con id mayor a int32',
      await call('get', '/pets/9999999999'),
      [400, 404],
    );
    check(
      M,
      'comunidad con id mayor a int32',
      await call('get', '/communities/9999999999'),
      [400, 404],
    );
    check(
      M,
      'evento con id mayor a int32',
      await call('get', '/events/9999999999'),
      [400, 404],
    );
    check(
      M,
      'conversación con id mayor a int32',
      await call('get', '/conversations/9999999999'),
      [400, 404],
    );
    check(
      M,
      'adopción con id mayor a int32',
      await call('get', '/adoptions/9999999999'),
      [400, 404],
    );
    check(M, 'feed con limit=0', await call('get', '/posts?limit=0'), [400]);
    check(
      M,
      'feed con limit=31 (máximo 30)',
      await call('get', '/posts?limit=31'),
      [400],
    );
    check(
      M,
      'feed con limit=30 (en el límite)',
      await call('get', '/posts?limit=30'),
      [200],
    );
    check(
      M,
      'feed con cursor de texto',
      await call('get', '/posts?cursor=abc'),
      [400],
    );
    check(
      M,
      'feed con cursor negativo',
      await call('get', '/posts?cursor=-5'),
      [400],
    );
    check(
      M,
      'feed con cursor mayor a int32',
      await call('get', '/posts?cursor=9999999999'),
      [200, 400],
    );
    check(
      M,
      'feed con categoría inexistente',
      await call('get', '/posts?type=FOO'),
      [400],
    );
    check(
      M,
      'feed con parámetro desconocido',
      await call('get', '/posts?admin=true'),
      [200, 400],
    );
    check(
      M,
      'comentarios con limit=1000',
      await call('get', `/posts/${postId}/comments?limit=1000`),
      [400],
    );
    check(
      M,
      'comunidades con limit negativo',
      await call('get', '/communities?limit=-1'),
      [400],
    );
    check(
      M,
      'adopciones con cursor basura',
      await call('get', '/adoptions?cursor=%%%'),
      [400],
    );
    check(
      M,
      'adopciones con estado inexistente',
      await call('get', '/adoptions?status=VENDIDO'),
      [400],
    );
    expect(failures(M)).toEqual([]);
  });

  it('Publicaciones, comentarios y «Me gusta»', async () => {
    const M = 'Publicaciones';
    const post = (body: Record<string, unknown>, u = ana) =>
      call('post', '/posts', u).send({
        type: 'GENERAL',
        title: 'Título',
        description: 'Texto',
        ...body,
      });
    check(
      M,
      'título de 120 caracteres (límite)',
      await post({ title: 't'.repeat(120) }),
      [201],
    );
    check(
      M,
      'título de 121 caracteres',
      await post({ title: 't'.repeat(121) }),
      [400],
    );
    check(M, 'título solo con espacios', await post({ title: '    ' }), [400]);
    check(M, 'título vacío', await post({ title: '' }), [400]);
    check(
      M,
      'descripción de 3 000 caracteres (límite)',
      await post({ description: 'd'.repeat(3000) }),
      [201],
    );
    check(
      M,
      'descripción de 3 001 caracteres',
      await post({ description: 'd'.repeat(3001) }),
      [400],
    );
    check(
      M,
      'descripción de 100 000 caracteres',
      await post({ description: 'd'.repeat(100_000) }),
      [400, 413],
    );
    const emoji = await post({
      title: '🐶 Luna 🐾 ñandú ü 日本',
      description: 'Texto con emoji 🐕‍🦺',
    });
    check(M, 'título con emoji y acentos', emoji, [201]);
    expect(emoji.body.title).toBe('🐶 Luna 🐾 ñandú ü 日本');
    check(
      M,
      'título con inyección SQL',
      await post({ title: '\'); DROP TABLE "Post";--' }),
      [201],
    );
    check(
      M,
      'título con HTML/script',
      await post({ title: '<script>alert(1)</script>' }),
      [201],
    );
    check(
      M,
      'enviar userId de otra persona',
      await post({ userId: luis }),
      [400],
    );
    check(M, 'categoría inválida', await post({ type: 'VENTA' }), [400]);
    check(M, 'categoría en minúsculas', await post({ type: 'general' }), [400]);
    check(
      M,
      'enlazar mascota de otra persona',
      await post({ petId: petLuis }),
      [400, 403, 404],
    );
    check(
      M,
      'enlazar mascota inexistente',
      await post({ petId: 2147483000 }),
      [400, 404],
    );
    check(
      M,
      'enlazar mascota con id de texto',
      await post({ petId: 'uno' }),
      [400],
    );
    check(
      M,
      'editar publicación ajena',
      await call('patch', `/posts/${postId}`, luis).send({ title: 'Ajeno' }),
      [403, 404],
    );
    check(
      M,
      'retirar publicación ajena',
      await call('delete', `/posts/${postId}`, luis),
      [403, 404],
    );
    check(
      M,
      'editar con cuerpo vacío',
      await call('patch', `/posts/${postId}`).send({}),
      [200, 400],
    );
    const comment = (body: unknown, id = postId) =>
      call('post', `/posts/${id}/comments`, luis).send({ body });
    check(
      M,
      'comentario de 500 caracteres (límite)',
      await comment('c'.repeat(500)),
      [201],
    );
    check(
      M,
      'comentario de 501 caracteres',
      await comment('c'.repeat(501)),
      [400],
    );
    check(M, 'comentario vacío', await comment(''), [400]);
    check(
      M,
      'comentario con saltos de línea solamente',
      await comment('\n\n\n'),
      [400],
    );
    check(M, 'comentario numérico', await comment(12345), [400]);
    check(
      M,
      'comentario en publicación inexistente',
      await comment('hola', 2147483000),
      [404],
    );
    // Diez «Me gusta» simultáneos de la misma persona cuentan una sola vez.
    const likes = await Promise.all(
      Array.from({ length: 10 }, () =>
        call('put', `/posts/${postId}/like`, sara).send({ liked: true }),
      ),
    );
    likes.forEach((r, i) =>
      check(M, `«Me gusta» simultáneo #${i + 1}`, r, [200]),
    );
    const detail = await call('get', `/posts/${postId}`, sara).expect(200);
    rows.push({
      module: M,
      name: '10 «Me gusta» simultáneos cuentan 1',
      expected: [1],
      actual: detail.body.likeCount,
      ok: detail.body.likeCount === 1,
    });
    // «Me gusta» no recibe cuerpo: PUT lo da y DELETE lo quita; un cuerpo extra se ignora.
    check(
      M,
      '«Me gusta» con cuerpo inesperado (se ignora)',
      await call('put', `/posts/${postId}/like`, sara).send({ liked: 'sí' }),
      [200],
    );
    check(
      M,
      'quitar «Me gusta» dos veces',
      (await call('delete', `/posts/${postId}/like`, sara),
      await call('delete', `/posts/${postId}/like`, sara)),
      [200],
    );
    check(
      M,
      '«Me gusta» en publicación inexistente',
      await call('put', '/posts/2147483000/like', sara).send({ liked: true }),
      [404],
    );
    expect(failures(M)).toEqual([]);
  });

  it('Mascotas', async () => {
    const M = 'Mascotas';
    const pet = (over: Record<string, unknown>) =>
      call('post', '/pets').send({
        name: 'Luna',
        species: 'Perro',
        breed: 'Mestiza',
        birth: { year: 2023, month: 5 },
        ...over,
      });
    const year = new Date().getFullYear();
    check(
      M,
      'nombre de 2 caracteres (mínimo)',
      await pet({ name: 'Al' }),
      [201],
    );
    check(M, 'nombre de 1 carácter', await pet({ name: 'A' }), [400]);
    check(
      M,
      'nombre de 50 caracteres (máximo)',
      await pet({ name: 'n'.repeat(50) }),
      [201],
    );
    check(
      M,
      'nombre de 51 caracteres',
      await pet({ name: 'n'.repeat(51) }),
      [400],
    );
    check(M, 'raza solo con espacios', await pet({ breed: '   ' }), [400]);
    check(
      M,
      'especie «Otra» sin decir cuál',
      await pet({ species: 'Otra' }),
      [400],
    );
    check(
      M,
      'nacimiento en el futuro',
      await pet({ birth: { year: year + 1, month: 1 } }),
      [400],
    );
    check(
      M,
      'nacimiento el mes que viene',
      await pet({ birth: { year, month: 12, day: 31 } }),
      new Date().getMonth() === 11 && new Date().getDate() === 31
        ? [201]
        : [400],
    );
    check(M, 'mes 13', await pet({ birth: { year: 2023, month: 13 } }), [400]);
    check(M, 'mes 0', await pet({ birth: { year: 2023, month: 0 } }), [400]);
    check(
      M,
      '31 de febrero',
      await pet({ birth: { year: 2023, month: 2, day: 31 } }),
      [400],
    );
    check(
      M,
      '29 de febrero de año bisiesto (2024)',
      await pet({ birth: { year: 2024, month: 2, day: 29 } }),
      [201],
    );
    check(
      M,
      '29 de febrero de año no bisiesto (2023)',
      await pet({ birth: { year: 2023, month: 2, day: 29 } }),
      [400],
    );
    // La ficha no fija un año mínimo de nacimiento (solo prohíbe fechas futuras); se registra el comportamiento.
    check(
      M,
      'año 1800 (sin mínimo definido en la ficha)',
      await pet({ birth: { year: 1800, month: 1 } }),
      [201, 400],
    );
    check(M, 'sin fecha de nacimiento', await pet({ birth: undefined }), [400]);
    check(M, 'enviar edad directamente', await pet({ age: 3 }), [400]);
    check(
      M,
      'enviar dueño de otra persona',
      await pet({ ownerId: luis }),
      [400],
    );
    check(
      M,
      'descripción de 300 caracteres (límite)',
      await pet({ bio: 'b'.repeat(300) }),
      [201],
    );
    check(
      M,
      'descripción de 301 caracteres',
      await pet({ bio: 'b'.repeat(301) }),
      [400],
    );
    check(
      M,
      'editar mascota ajena',
      await call('patch', `/pets/${petLuis}`).send({ name: 'Mía' }),
      [403, 404],
    );
    check(
      M,
      'retirar mascota ajena',
      await call('delete', `/pets/${petLuis}`),
      [403, 404],
    );
    check(M, 'ver ficha propia', await call('get', `/pets/${petAna}`), [200]);
    expect(failures(M)).toEqual([]);
  });

  it('Perfiles y búsqueda', async () => {
    const M = 'Perfiles';
    check(M, 'buscar con 1 carácter', await call('get', '/users?q=a'), [400]);
    check(
      M,
      'buscar con 2 caracteres (mínimo)',
      await call('get', '/users?q=ed'),
      [200],
    );
    check(
      M,
      'buscar con 51 caracteres',
      await call('get', `/users?q=${'a'.repeat(51)}`),
      [400],
    );
    check(M, 'buscar sin texto', await call('get', '/users'), [400]);
    const percent = await call('get', '/users?q=%25%25');
    check(M, 'buscar «%%» (comodín SQL)', percent, [200, 400]);
    if (percent.status === 200)
      rows.push({
        module: M,
        name: '«%%» no devuelve a todas las cuentas',
        expected: [0],
        actual: percent.body.items.length,
        ok: !percent.body.items.some(
          (i: { username: string }) => !i.username.includes('%'),
        ),
      });
    check(
      M,
      'buscar con inyección SQL',
      await call('get', `/users?q=${encodeURIComponent("' OR 1=1 --")}`),
      [200, 400],
    );
    check(
      M,
      'nombre de usuario de 2 caracteres',
      await call('patch', '/users/me', sara).send({ username: 'ab' }),
      [400],
    );
    check(
      M,
      'nombre de usuario de 31 caracteres',
      await call('patch', '/users/me', sara).send({ username: 'u'.repeat(31) }),
      [400],
    );
    check(
      M,
      'nombre de usuario de 30 caracteres (límite)',
      await call('patch', '/users/me', sara).send({
        username: `s${Date.now()}`.padEnd(30, 'x').slice(0, 30),
      }),
      [200],
    );
    check(
      M,
      'biografía de 301 caracteres',
      await call('patch', '/users/me', sara).send({ bio: 'b'.repeat(301) }),
      [400],
    );
    check(
      M,
      'estado de México inexistente',
      await call('patch', '/users/me', sara).send({ locatedAt: 'TEXAS' }),
      [400],
    );
    check(
      M,
      'intentar cambiar el correo',
      await call('patch', '/users/me', sara).send({
        email: 'otro@example.test',
      }),
      [400],
    );
    check(
      M,
      'intentar volverse inactivo/activo por PATCH',
      await call('patch', '/users/me', sara).send({ isActive: false }),
      [400],
    );
    check(
      M,
      'perfil público inexistente',
      await call('get', '/users/no-existe-0000'),
      [404],
    );
    const pub = await call('get', `/users/${ana}`, luis);
    check(M, 'perfil público de otra persona', pub, [200]);
    rows.push({
      module: M,
      name: 'el perfil público no expone el correo',
      expected: [0],
      actual: pub.body.email ? 1 : 0,
      ok: !pub.body.email,
    });
    expect(failures(M)).toEqual([]);
  });

  it('Comunidades', async () => {
    const M = 'Comunidades';
    const create = (over: Record<string, unknown>) =>
      call('post', '/communities').send({
        name: `${prefix} c${Math.random()}`.slice(0, 40),
        topic: 'Tema',
        description: 'Descripción suficiente.',
        ...over,
      });
    check(M, 'nombre de 2 caracteres', await create({ name: 'ab' }), [400]);
    check(
      M,
      'nombre de 61 caracteres',
      await create({ name: `${prefix}`.padEnd(61, 'n') }),
      [400],
    );
    check(
      M,
      'nombre de 60 caracteres (límite)',
      await create({ name: `${prefix}`.padEnd(60, 'n') }),
      [201],
    );
    check(
      M,
      'nombre repetido (permitido, D-72)',
      await create({ name: `${prefix} base` }),
      [201],
    );
    check(
      M,
      'descripción de 9 caracteres',
      await create({ description: '123456789' }),
      [400],
    );
    check(
      M,
      'descripción de 501 caracteres',
      await create({ description: 'd'.repeat(501) }),
      [400],
    );
    check(M, 'tema de 1 carácter', await create({ topic: 'a' }), [400]);
    check(
      M,
      'tema de 51 caracteres',
      await create({ topic: 't'.repeat(51) }),
      [400],
    );
    // Cinco «Unirme» simultáneos de la misma persona dejan una sola membresía.
    const joins = await Promise.all(
      Array.from({ length: 5 }, () =>
        call('post', `/communities/${communityId}/members/me`, luis),
      ),
    );
    joins.forEach((r, i) =>
      check(M, `unirse simultáneo #${i + 1}`, r, [200, 201]),
    );
    const members = await db.communityMember.count({
      where: { communityId, userId: luis },
    });
    rows.push({
      module: M,
      name: '5 «Unirme» simultáneos dejan 1 membresía',
      expected: [1],
      actual: members,
      ok: members === 1,
    });
    check(
      M,
      'miembro intenta cambiar roles',
      await call(
        'patch',
        `/communities/${communityId}/members/${ana}/role`,
        luis,
      ).send({ role: 'MEMBER' }),
      [403],
    );
    check(
      M,
      'rol inexistente',
      await call(
        'patch',
        `/communities/${communityId}/members/${luis}/role`,
      ).send({ role: 'DUEÑO' }),
      [400],
    );
    check(
      M,
      'expulsarse a sí mismo',
      await call('post', `/communities/${communityId}/expulsions`).send({
        userId: ana,
      }),
      [400, 403, 409],
    );
    check(
      M,
      'miembro intenta expulsar',
      await call('post', `/communities/${communityId}/expulsions`, luis).send({
        userId: ana,
      }),
      [403],
    );
    check(
      M,
      'único admin intenta salir',
      await call('delete', `/communities/${communityId}/members/me`),
      [200, 400, 409],
    );
    check(
      M,
      'salir sin ser miembro',
      await call('delete', `/communities/${communityId}/members/me`, sara),
      [200, 204, 403, 404, 409],
    );
    check(
      M,
      'no miembro intenta publicar en la comunidad',
      await call('post', `/communities/${communityId}/posts`, sara).send({
        type: 'GENERAL',
        title: 'Hola',
        description: 'Texto',
      }),
      [403],
    );
    check(
      M,
      'no miembro intenta leer publicaciones',
      await call('get', `/communities/${communityId}/posts`, sara),
      [403],
    );
    expect(failures(M)).toEqual([]);
  });

  it('Eventos', async () => {
    const M = 'Eventos';
    const draft = (over: Record<string, unknown>) => ({
      title: 'Paseo',
      description: 'Caminata con perros.',
      placeLabel: 'Parque Morelos',
      latitude: 32.5,
      longitude: -117.0,
      startsAt: hours(48),
      endsAt: hours(50),
      timeZone: 'America/Tijuana',
      ...over,
    });
    const create = (over: Record<string, unknown>, u = ana) =>
      call('post', `/communities/${communityId}/events`, u).send(draft(over));
    const ok = await create({});
    check(M, 'evento válido', ok, [201]);
    check(
      M,
      'fin antes del inicio',
      await create({ endsAt: hours(47) }),
      [400],
    );
    check(M, 'fin igual al inicio', await create({ endsAt: hours(48) }), [400]);
    check(
      M,
      'inicio en el pasado',
      await create({ startsAt: hours(-1), endsAt: hours(2) }),
      [400],
    );
    check(
      M,
      'fin al día siguiente (permitido)',
      await create({ startsAt: hours(48), endsAt: hours(70) }),
      [201],
    );
    check(M, 'latitud 91', await create({ latitude: 91 }), [400]);
    check(M, 'latitud -90 (límite)', await create({ latitude: -90 }), [201]);
    check(M, 'longitud 181', await create({ longitude: 181 }), [400]);
    check(
      M,
      'coordenada como texto',
      await create({ latitude: 'norte' }),
      [400],
    );
    check(
      M,
      'zona horaria inexistente',
      await create({ timeZone: 'Marte/Fobos' }),
      [400],
    );
    check(
      M,
      'fecha con formato inválido',
      await create({ startsAt: '31/12/2030' }),
      [400],
    );
    check(
      M,
      'título de 121 caracteres',
      await create({ title: 't'.repeat(121) }),
      [400],
    );
    check(
      M,
      'lugar de 201 caracteres',
      await create({ placeLabel: 'l'.repeat(201) }),
      [400],
    );
    check(
      M,
      'miembro (no admin/mod) crea evento',
      await create({}, luis),
      [403],
    );
    check(M, 'no miembro crea evento', await create({}, sara), [403]);
    const eventId = ok.body.id;
    check(
      M,
      'respuesta de asistencia inválida',
      await call('put', `/events/${eventId}/attendance`, luis).send({
        response: 'TAL_VEZ',
      }),
      [400],
    );
    check(
      M,
      'no miembro confirma asistencia',
      await call('put', `/events/${eventId}/attendance`, sara).send({
        response: 'GOING',
      }),
      [403],
    );
    const going = await Promise.all(
      Array.from({ length: 5 }, () =>
        call('put', `/events/${eventId}/attendance`, luis).send({
          response: 'GOING',
        }),
      ),
    );
    going.forEach((r, i) => check(M, `«Iré» simultáneo #${i + 1}`, r, [200]));
    const count = (await call('get', `/events/${eventId}`, luis).expect(200))
      .body.goingCount;
    rows.push({
      module: M,
      name: '5 «Iré» simultáneos cuentan 1',
      expected: [1],
      actual: count,
      ok: count === 1,
    });
    check(
      M,
      'miembro intenta cancelar',
      await call('post', `/events/${eventId}/cancel`, luis).send({}),
      [403],
    );
    check(
      M,
      'cancelar dos veces',
      await call('post', `/events/${eventId}/cancel`).send({
        requestKey: 'cancel-edge-1',
      }),
      [200, 201],
    );
    check(
      M,
      'segunda cancelación (no se repite)',
      await call('post', `/events/${eventId}/cancel`).send({
        requestKey: 'cancel-edge-2',
      }),
      [200, 201, 409],
    );
    check(
      M,
      'responder a un evento cancelado',
      await call('put', `/events/${eventId}/attendance`, luis).send({
        response: 'NOT_GOING',
      }),
      [409],
    );
    check(
      M,
      'editar un evento cancelado',
      await call('patch', `/events/${eventId}`).send({ title: 'Otro' }),
      [409],
    );
    expect(failures(M)).toEqual([]);
  });

  it('Chat privado', async () => {
    const M = 'Chat';
    check(
      M,
      'abrir chat consigo misma',
      await call('post', '/conversations').send({ userId: ana }),
      [400],
    );
    check(
      M,
      'abrir chat con cuenta inexistente',
      await call('post', '/conversations').send({ userId: 'no-existe-0000' }),
      [404],
    );
    check(
      M,
      'abrir chat sin userId',
      await call('post', '/conversations').send({}),
      [400],
    );
    const opens = await Promise.all(
      Array.from({ length: 5 }, () =>
        call('post', '/conversations').send({ userId: luis }),
      ),
    );
    opens.forEach((r, i) =>
      check(M, `abrir el mismo chat simultáneo #${i + 1}`, r, [200, 201]),
    );
    const ids = new Set(opens.map((r) => r.body.id));
    rows.push({
      module: M,
      name: '5 aperturas simultáneas crean 1 conversación',
      expected: [1],
      actual: ids.size,
      ok: ids.size === 1,
    });
    const id = opens[0].body.id;
    const send = (body: unknown, clientKey: unknown = key(), u = ana) =>
      call('post', `/conversations/${id}/messages`, u).send({
        body,
        clientKey,
      });
    check(
      M,
      'mensaje de 250 caracteres (límite)',
      await send('m'.repeat(250)),
      [201],
    );
    check(M, 'mensaje de 251 caracteres', await send('m'.repeat(251)), [400]);
    check(M, 'mensaje vacío', await send(''), [400]);
    check(M, 'mensaje solo con espacios', await send('     '), [400]);
    check(M, 'mensaje con emoji', await send('Hola 🐶🐾'), [201]);
    check(
      M,
      'clave de reintento con formato inválido',
      await send('hola', 'clave con espacios!'),
      [400],
    );
    const k = key();
    const twice = await Promise.all([send('una vez', k), send('una vez', k)]);
    twice.forEach((r, i) =>
      check(M, `mismo mensaje con la misma clave #${i + 1}`, r, [200, 201]),
    );
    const copies = await db.message.count({
      where: { conversationId: id, body: 'una vez' },
    });
    rows.push({
      module: M,
      name: 'reintento con la misma clave no duplica',
      expected: [1],
      actual: copies,
      ok: copies === 1,
    });
    check(
      M,
      'tercera persona lee la conversación',
      await call('get', `/conversations/${id}/messages`, sara),
      [404],
    );
    check(
      M,
      'tercera persona escribe',
      await send('intruso', key(), sara),
      [404],
    );
    check(
      M,
      'reporte sin mensajes',
      await call('post', `/conversations/${id}/reports`, luis).send({
        messageIds: [],
        clientKey: key(),
      }),
      [400],
    );
    check(
      M,
      'reporte con explicación de 501 caracteres',
      await call('post', `/conversations/${id}/reports`, luis).send({
        messageIds: [1],
        note: 'n'.repeat(501),
        clientKey: key(),
      }),
      [400],
    );
    check(
      M,
      'reporte con mensaje de otra conversación',
      await call('post', `/conversations/${id}/reports`, luis).send({
        messageIds: [2147483000],
        clientKey: key(),
      }),
      [400, 404],
    );
    check(
      M,
      'bloquear y luego escribir',
      (await call('post', `/conversations/${id}/block`, luis),
      await send('¿me lees?')),
      [403, 409],
    );
    check(
      M,
      'leído con id de mensaje inexistente',
      await call('post', `/conversations/${id}/read`, luis).send({
        messageId: 2147483000,
      }),
      [200, 400, 404],
    );
    expect(failures(M)).toEqual([]);
  });

  it('Adopción', async () => {
    const M = 'Adopción';
    const create = (
      fields: Record<string, string> = {},
      photos = 1,
      u = ana,
      accept = true,
    ) => {
      let r = call('post', '/adoptions', u)
        .field('title', fields.title ?? 'Michi busca hogar')
        .field(
          'description',
          fields.description ?? 'Gatita de 2 años, muy cariñosa.',
        );
      if (accept) r = r.field('acceptNoSale', 'true');
      for (const [k, v] of Object.entries(fields))
        if (k !== 'title' && k !== 'description') r = r.field(k, v);
      for (let i = 0; i < photos; i++)
        r = r.attach('photos', jpeg(i + 1), {
          filename: `f${i}.jpg`,
          contentType: 'image/jpeg',
        });
      return r;
    };
    const ok = await create();
    check(M, 'anuncio válido con 1 foto', ok, [201]);
    check(M, 'anuncio con 3 fotos (máximo)', await create({}, 3), [201]);
    check(M, 'anuncio con 4 fotos', await create({}, 4), [400]);
    check(M, 'anuncio sin fotos', await create({}, 0), [400]);
    check(
      M,
      'sin aceptar «solo adopción»',
      await create({}, 1, ana, false),
      [400],
    );
    check(
      M,
      'título de 121 caracteres',
      await create({ title: 't'.repeat(121) }),
      [400],
    );
    check(M, 'título solo con espacios', await create({ title: '   ' }), [400]);
    check(
      M,
      'descripción de 3 001 caracteres',
      await create({ description: 'd'.repeat(3001) }),
      [400],
    );
    check(
      M,
      'archivo que no es imagen',
      await call('post', '/adoptions')
        .field('title', 'x')
        .field('description', 'y')
        .field('acceptNoSale', 'true')
        .attach('photos', Buffer.from('no soy imagen'), {
          filename: 'x.jpg',
          contentType: 'image/jpeg',
        }),
      [400],
    );
    check(
      M,
      'imagen de más de 5 MB',
      await call('post', '/adoptions')
        .field('title', 'Grande')
        .field('description', 'Foto enorme')
        .field('acceptNoSale', 'true')
        .attach(
          'photos',
          Buffer.concat([jpeg(), Buffer.alloc(5 * 1024 * 1024 + 10, 1)]),
          { filename: 'g.jpg', contentType: 'image/jpeg' },
        ),
      [400, 413],
    );
    check(
      M,
      'enlazar mascota ajena',
      await create({ petId: String(petLuis) }),
      [400, 403, 404],
    );
    const id = ok.body.id;
    check(
      M,
      'reportar anuncio propio',
      await call('post', `/adoptions/${id}/reports`).send({ reason: 'OTHER' }),
      [400, 403],
    );
    check(
      M,
      'reporte sin motivo',
      await call('post', `/adoptions/${id}/reports`, luis).send({}),
      [400],
    );
    check(
      M,
      'reporte con motivo inexistente',
      await call('post', `/adoptions/${id}/reports`, luis).send({
        reason: 'ME_CAE_MAL',
      }),
      [400],
    );
    check(
      M,
      'reportar anuncio ajeno',
      await call('post', `/adoptions/${id}/reports`, luis).send({
        reason: 'POSSIBLE_SALE',
        explanation: 'Parece venta',
      }),
      [200, 201],
    );
    check(
      M,
      'reportar dos veces el mismo anuncio',
      await call('post', `/adoptions/${id}/reports`, luis).send({
        reason: 'OTHER',
      }),
      [200, 201, 409],
    );
    check(
      M,
      'reporte con explicación de 501 caracteres',
      await call('post', `/adoptions/${id}/reports`, sara).send({
        reason: 'OTHER',
        explanation: 'n'.repeat(501),
      }),
      [400],
    );
    check(
      M,
      'editar anuncio ajeno',
      await call('patch', `/adoptions/${id}`, luis).field('title', 'Mío'),
      [403, 404],
    );
    check(
      M,
      'estado inválido',
      await call('patch', `/adoptions/${id}/status`).send({
        status: 'VENDIDO',
      }),
      [400, 404],
    );
    expect(failures(M)).toEqual([]);
  });
});
