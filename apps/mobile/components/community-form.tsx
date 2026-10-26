import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FormScrollView } from '@/components/form-scroll-view';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { useAuthContext } from '@/context/AuthContext';
import { createCommunity, updateCommunity, type Community } from '@/lib/communities-api';
import { goBackOrReplace } from '@/lib/navigation';

export function CommunityForm({ community }: { community?: Community }) {
  const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [name, setName] = useState(community?.name ?? ''); const [topic, setTopic] = useState(community?.topic ?? ''); const [description, setDescription] = useState(community?.description ?? '');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const sending = useRef(false);
  const topicRef = useRef<TextInput>(null); const descriptionRef = useRef<TextInput>(null);
  const save = async () => {
    if (!token || sending.current) return;
    const draft = { name: name.trim(), topic: topic.trim(), description: description.trim() };
    if (draft.name.length < 3 || draft.name.length > 60) { setError('El nombre debe tener de 3 a 60 caracteres.'); return; }
    if (draft.topic.length < 2 || draft.topic.length > 50) { setError('El tema debe tener de 2 a 50 caracteres.'); return; }
    if (draft.description.length < 10 || draft.description.length > 500) { setError('La descripción debe tener de 10 a 500 caracteres.'); return; }
    sending.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    try {
      const saved = community ? await updateCommunity(token, community.id, draft) : await createCommunity(token, draft);
      router.replace((`/communities/${saved.id}`) as Href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la comunidad.'); }
    finally { sending.current = false; setBusy(false); }
  };
  const inputStyle = [ui.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }];
  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={ui.back} onPress={() => goBackOrReplace(router, '/comunidades')}><Ionicons name="arrow-back" size={24} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    <FormScrollView contentContainerStyle={ui.content}>
      <Text style={[ui.title, { color: c.heading }]}>{community ? 'Editar comunidad' : 'Crear comunidad'}</Text>
      <Text style={[ui.body, { color: c.text }]}>Un espacio para compartir experiencias y cuidar a los animales.</Text>
      <Text style={[ui.label, { color: c.text }]}>Nombre</Text>
      <TextInput accessibilityLabel="Nombre de la comunidad" value={name} onChangeText={setName} maxLength={61} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => topicRef.current?.focus()} style={inputStyle} />
      <Text style={[ui.label, { color: c.text }]}>Tema</Text>
      <TextInput ref={topicRef} accessibilityLabel="Tema de la comunidad" value={topic} onChangeText={setTopic} maxLength={51} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => descriptionRef.current?.focus()} placeholder="Por ejemplo, paseos con perros" placeholderTextColor={c.muted} style={inputStyle} />
      <Text style={[ui.label, { color: c.text }]}>Descripción</Text>
      <TextInput ref={descriptionRef} accessibilityLabel="Descripción de la comunidad" value={description} onChangeText={setDescription} maxLength={501} multiline textAlignVertical="top" style={[inputStyle, { minHeight: 140, paddingTop: 12 }]} />
      <Text style={[ui.muted, { color: c.muted, textAlign: 'right' }]}>{description.length}/500</Text>
      <CommunityMessage text={error} error />
      <CommunityButton label={community ? 'Guardar cambios' : 'Crear comunidad'} busy={busy} onPress={() => void save()} />
    </FormScrollView>
  </SafeAreaView>;
}
