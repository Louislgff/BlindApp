import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { BeforeReveal } from '../../src/components/BeforeReveal';
import { BackButton, Body, Button, Muted, Screen } from '../../src/components/ui';
import { ME, PROFILES_BY_ID } from '../../src/data/mock';
import { QUESTIONS } from '../../src/data/questions';
import { buildSummary } from '../../src/matching/summary';
import { colors, radius, space } from '../../src/theme';

// Suggestions de premier message tirées des points communs (en production : générées côté serveur).
const OPENERS = ['Ton adresse préférée à Paris, c’est laquelle ?', 'Prochain voyage : tu as déjà une idée ?'];

export default function MatchSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = PROFILES_BY_ID.get(id);
  if (!p) return null;
  const s = buildSummary(ME, p, QUESTIONS);
  const openConversation = (opener?: string) =>
    router.push({ pathname: '/conversation/[id]', params: { id: p.id, ...(opener ? { draft: opener } : {}) } });

  return (
    <Screen scroll>
      <View style={styles.top}>
        <BackButton />
        <Muted>Reveal du 15 octobre</Muted>
        <View style={{ width: 44 }} />
      </View>

      <BeforeReveal
        initial={p.initial}
        name={p.firstName}
        age={p.age}
        score={s.score}
        facts={[{ icon: 'briefcase', text: p.job }, { icon: 'map-pin', text: p.zone }]}
        music={p.music}
        why={p.why}
        answers={p.answers}
        summary={s}
        prompts={p.prompts}
      />

      <View style={[styles.section, { marginTop: space.l }]}>
        <Button label={`Écrire à ${p.firstName}`} onPress={() => openConversation()} />
        <Muted style={{ textAlign: 'center', paddingVertical: space.xs }}>Ou commencer par une de ces questions</Muted>
        {OPENERS.map((o) => (
          <Pressable key={o} accessibilityRole="button" onPress={() => openConversation(o)} style={styles.opener}>
            <Feather name="message-circle" size={16} color={colors.accent} />
            <Body style={{ fontSize: 14, flex: 1 }}>{o}</Body>
          </Pressable>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: space.s }}>
          <Feather name="lock" size={12} color={colors.muted} />
          <Muted style={{ fontSize: 12 }}>Photos révélées d’un commun accord, après 10 messages.</Muted>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.l, paddingTop: space.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { alignItems: 'center', gap: space.m, paddingTop: space.xl, paddingHorizontal: space.xl },
  section: { paddingHorizontal: space.xl, paddingTop: 28, gap: space.m },
  opener: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.l, paddingHorizontal: space.l, paddingVertical: space.m },
});
