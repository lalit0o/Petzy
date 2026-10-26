import { useLocalSearchParams, useRouter } from 'expo-router';
import { PostForm } from '@/components/post-form';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityButton, ui, useCommunityColors } from '@/components/community-ui';
import { goBackOrReplace } from '@/lib/navigation';
export default function CreateCommunityPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter(); const c = useCommunityColors();
  const communityId = Number(id);
  if (!Number.isInteger(communityId) || communityId <= 0) return <SafeAreaView style={[ui.screen, ui.content, { backgroundColor: c.bg }]}><Text style={[ui.body, { color: c.error }]}>La comunidad no está disponible.</Text><CommunityButton label="Volver" secondary onPress={() => goBackOrReplace(router, '/comunidades')} /></SafeAreaView>;
  return <PostForm communityId={communityId} />;
}
