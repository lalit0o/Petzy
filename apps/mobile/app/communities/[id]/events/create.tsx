import { useLocalSearchParams } from 'expo-router';
import { EventForm } from '@/components/event-form';

// Crear evento: el servidor comprueba que sea ADMIN o MODERATOR (CE-01).
export default function CreateEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventForm communityId={Number(id)} />;
}
