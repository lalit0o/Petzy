export type PostCategory = 'GENERAL' | 'HELP' | 'TIP' | 'QUESTION' | 'LOST_PET';

export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'HELP', label: 'Ayuda' },
  { value: 'TIP', label: 'Consejo' },
  { value: 'QUESTION', label: 'Pregunta' },
  { value: 'LOST_PET', label: 'Mascota perdida' },
];

export type PostSummary = {
  id: number;
  userId: string;
  communityId: number | null;
  type: PostCategory;
  title: string;
  description: string;
  createdAt: string;
  hasPhoto: boolean;
  photoPath: string | null;
  user: { id: string; username: string; hasAvatar: boolean };
  pet: { id: number; name: string; species: string; age: number; isAgeApproximate: boolean; photoUrl: string | null } | null;
  likeCount: number;
  likedByMe: boolean;
};

export type PostPage = { items: PostSummary[]; nextCursor: number | null };
export type OwnPet = { id: number; name: string };
