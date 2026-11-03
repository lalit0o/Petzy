import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View, type ViewInstance } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthContext } from '@/context/AuthContext';
import { AnchoredMenu, AnchoredMenuItem, type MenuAnchor } from '@/components/anchored-menu';
import { CommunityButton, CommunityCard, CommunityMessage, roleLabel, ui, useCommunityColors } from '@/components/community-ui';
import { changeRole, CommunityApiError, expelMember, listExpulsions, listMembers, unblockMember, type CommunityRole, type ExpelledMember, type Member } from '@/lib/communities-api';
import { profilePhotoSource } from '@/lib/profiles-api';
import { PersonListSkeleton } from '@/components/skeleton';

type Person = Member | ExpelledMember;
function PersonRow({ person, canManage, onMenu, children }: { person: Person; canManage: boolean; onMenu: (person: Person, anchor: MenuAnchor) => void; children?: React.ReactNode }) {
  const { token } = useAuthContext(); const c = useCommunityColors(); const button = useRef<ViewInstance>(null); const [failed, setFailed] = useState(false);
  return <CommunityCard><View style={[ui.row, { flexWrap: 'nowrap' }]}>
    {person.avatarUrl && token && !failed ? <Image source={profilePhotoSource(person.avatarUrl, token)} cachePolicy="none" style={{ width: 42, height: 42, borderRadius: 21 }} onError={() => setFailed(true)} /> : <Ionicons name="person-circle-outline" size={42} color={c.heading} />}
    <View style={{ flex: 1 }}><Text style={[ui.label, { color: c.text }]}>{person.username}</Text>{'role' in person ? <Text style={[ui.muted, { color: c.muted }]}>{roleLabel[person.role]}</Text> : null}</View>
    {canManage ? <View ref={button} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${person.username}`} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => button.current?.measureInWindow((x, y, width, height) => onMenu(person, { x: x + width / 2, y: y + height / 2, bottom: y + height }))}><Ionicons name="ellipsis-horizontal" size={24} color={c.heading} /></Pressable></View> : null}
  </View>{children}</CommunityCard>;
}

export function CommunityPeople({ communityId, role, expelled = false, onAccessLost, onRoleChanged }: { communityId: number; role: CommunityRole; expelled?: boolean; onAccessLost: () => void; onRoleChanged: () => void }) {
  const { token, user } = useAuthContext(); const c = useCommunityColors();
  const [items, setItems] = useState<Person[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<Person | null>(null); const [anchor, setAnchor] = useState<MenuAnchor>({ x: 0, y: 0, bottom: 0 });
  const action = useRef(false); const requestId = useRef(0);
  const load = useCallback(async function loadPage(next?: string): Promise<void> {
    if (!token) return;
    const id = ++requestId.current; setLoading(true); setError(''); if (next === undefined) { setItems([]); setCursor(null); }
    try {
      const page = expelled ? await listExpulsions(token, communityId, next) : await listMembers(token, communityId, next);
      if (id !== requestId.current) return;
      setItems(old => next === undefined ? page.items : [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(page.nextCursor);
    } catch (cause) {
      if (id !== requestId.current) return;
      if (next !== undefined && cause instanceof CommunityApiError && cause.status === 400) { await loadPage(); return; }
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la lista.');
      if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) { setItems([]); onAccessLost(); }
    } finally { if (id === requestId.current) setLoading(false); }
  }, [token, communityId, expelled, onAccessLost]);
  const invalidate = useCallback(() => { requestId.current++; }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; invalidate(); }; }, [load, invalidate]);
  const run = async (kind: 'role' | 'expel' | 'unblock', person: Person, nextRole?: CommunityRole) => {
    if (!token || action.current) return; action.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (kind === 'role' && nextRole) await changeRole(token, communityId, person.id, nextRole);
      else if (kind === 'expel') await expelMember(token, communityId, person.id);
      else if (kind === 'unblock') await unblockMember(token, communityId, person.id);
      setMessage(kind === 'role' ? 'Rol actualizado.' : kind === 'expel' ? 'Persona expulsada.' : 'La persona puede volver a unirse.');
      if (person.id === user?.id && kind === 'role') onRoleChanged(); else void load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la acción.'); if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) onAccessLost(); }
    finally { action.current = false; setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    <Text style={[ui.heading, { color: c.heading }]}>{expelled ? 'Personas expulsadas' : 'Integrantes'}</Text>
    <CommunityMessage text={message} /><CommunityMessage text={error} error />
    {loading && !items.length ? <PersonListSkeleton /> : null}
    {busy || (loading && items.length > 0) ? <ActivityIndicator color={c.heading} accessibilityLabel={busy ? 'Guardando cambio' : 'Cargando integrantes'} /> : null}
    {error ? <CommunityButton label="Reintentar lista" secondary onPress={() => void load()} /> : null}
    {!loading && !error && !items.length ? <Text style={[ui.body, { color: c.muted }]}>{expelled ? 'No hay personas expulsadas.' : 'No hay integrantes activos.'}</Text> : null}
    {items.map(person => <PersonRow key={person.id} person={person} canManage={!expelled && role === 'ADMIN' && !busy} onMenu={(item, point) => { setTarget(item); setAnchor(point); }}>
      {expelled && role === 'ADMIN' ? <CommunityButton label="Permitir volver a unirse" secondary disabled={busy} onPress={() => void run('unblock', person)} /> : null}
    </PersonRow>)}
    {cursor !== null ? <CommunityButton label="Cargar más personas" busy={loading} secondary onPress={() => void load(cursor)} /> : null}
    <AnchoredMenu visible={target !== null && role === 'ADMIN'} anchor={anchor} title={target?.username} estimatedHeight={310} onClose={() => setTarget(null)}>
      {(['MEMBER', 'MODERATOR', 'ADMIN'] as const).map(value => <AnchoredMenuItem key={value} label={roleLabel[value]} selected={Boolean(target && 'role' in target && target.role === value)} onPress={() => { if (target && 'role' in target && target.role !== value) void run('role', target, value); }} />)}
      {target && 'role' in target && target.role !== 'ADMIN' && target.id !== user?.id ? <AnchoredMenuItem label="Expulsar de la comunidad" destructive icon="person-remove-outline" onPress={() => Alert.alert('Expulsar de la comunidad', `${target.username} perderá acceso y no podrá volver a unirse hasta que lo permitas.`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Expulsar', style: 'destructive', onPress: () => void run('expel', target) }])} /> : null}
      <AnchoredMenuItem label="Cancelar" separator={false} />
    </AnchoredMenu>
  </View>;
}
