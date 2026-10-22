import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileCard } from '../../src/components/ProfileCard';
import { Body, Divider, Muted, Screen, Serif } from '../../src/components/ui';
import { ME, SUBSCRIPTION_ACTIVE } from '../../src/data/mock';
import { QUESTIONS } from '../../src/data/questions';
import { useStore } from '../../src/state/store';
import { colors, fonts, radius, space } from '../../src/theme';

const MENU: { label: string; value: string; accent?: boolean; onPress?: () => void }[] = [
  { label: 'Mes réponses', value: `${Object.values(ME.answers).filter((a) => !a.skipped).length} / ${QUESTIONS.length}`, onPress: () => router.push('/answers') },
  { label: 'Critères déterminants', value: '~340 profils compatibles', onPress: () => router.push('/onboarding?mode=edit&step=final') },
  { label: 'Mes photos', value: `${ME.photos} · cachées` },
  { label: 'Vérification', value: 'Profil vérifié', accent: true, onPress: () => router.push('/verification') },
  { label: 'Abonnement', value: SUBSCRIPTION_ACTIVE ? 'Actif' : 'Non actif', accent: SUBSCRIPTION_ACTIVE },
  { label: 'Confidentialité et paramètres', value: '' },
];

export default function ProfilTab() {
  const { myProfile } = useStore();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Serif size={36}>Profil</Serif>
      </View>

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.l, gap: space.m }}>
        <ProfileCard profile={myProfile} />
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/my-preview')} style={[styles.action, { borderWidth: 1, borderColor: colors.border }]}>
            <Feather name="eye" size={16} color={colors.ink} />
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.ink }}>Voir mon profil</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/my-profile')} style={[styles.action, { backgroundColor: colors.accentFill }]}>
            <Feather name="edit-2" size={16} color={colors.onAccent} />
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.onAccent }}>Mon profil</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.l }}>
        {MENU.map((item) => (
          <View key={item.label}>
            <Divider />
            <Pressable accessibilityRole="button" onPress={item.onPress} style={styles.row}>
              <Body>{item.label}</Body>
              <Muted style={item.accent ? { color: colors.accent } : undefined}>{item.value}</Muted>
            </Pressable>
          </View>
        ))}
        <Divider />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1, height: 48, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  frame: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, paddingBottom: space.xl },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.ink },
  header: { paddingHorizontal: space.xl, paddingTop: space.l, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, padding: 3 },
  toggleItem: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  card: { margin: space.xl, marginBottom: 0, padding: 20, backgroundColor: colors.card, borderRadius: 18, gap: 14 },
  photo: { height: 220, borderRadius: radius.s, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
});
