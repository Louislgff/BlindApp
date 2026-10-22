import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MusicLine } from '../../src/components/ProfileCard';
import { BackButton, Body, Button, Divider, Initial, Label, Muted, Point, Screen, Serif } from '../../src/components/ui';
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

      <View style={styles.hero}>
        <Initial letter={p.initial} size={120} highlight />
        <Serif size={36}>
          {p.firstName}, {p.age}
        </Serif>
        <Muted style={{ fontSize: 14 }}>
          {p.job} · {p.zone}
        </Muted>
        {p.music && (
          <View>
            <MusicLine track={p.music} />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Serif size={64} style={{ color: colors.accent, lineHeight: 70 }}>{s.score} %</Serif>
          <Muted>de compatibilité</Muted>
        </View>
      </View>

      <View style={styles.section}>
        <Divider style={{ marginBottom: space.xl }} />
        <Label>Pourquoi vous</Label>
        <Serif size={22} style={{ lineHeight: 29 }}>{p.why}</Serif>
      </View>

      {s.common.length > 0 && (
        <View style={styles.section}>
          <Label>En commun</Label>
          {s.common.map((t) => (
            <Point key={t} text={t} />
          ))}
        </View>
      )}
      {s.complementary.length > 0 && (
        <View style={styles.section}>
          <Label>Complémentaires</Label>
          {s.complementary.map((t) => (
            <Point key={t} text={t} kind="complementaire" />
          ))}
        </View>
      )}
      {s.explore.length > 0 && (
        <View style={styles.section}>
          <Label>À explorer</Label>
          {s.explore.map((t) => (
            <Point key={t} text={t} kind="a-explorer" />
          ))}
        </View>
      )}

      {p.prompts.some((x) => x.answer.trim()) && (
        <View style={styles.section}>
          <Label>Son profil</Label>
          {p.prompts
            .filter((x) => x.answer.trim())
            .map((x) => (
              <View key={x.question || 'libre'} style={{ gap: 4 }}>
                {!!x.question && <Muted style={{ fontSize: 12 }}>{x.question}</Muted>}
                <Serif size={21} style={{ lineHeight: 27 }}>{x.answer}</Serif>
              </View>
            ))}
        </View>
      )}

      <View style={[styles.section, { marginTop: space.l }]}>
        <Button label={`Écrire à ${p.firstName}`} onPress={() => openConversation()} />
        <Muted style={{ textAlign: 'center', paddingVertical: space.xs }}>Ou commencer par une de ces questions</Muted>
        {OPENERS.map((o) => (
          <Pressable key={o} accessibilityRole="button" onPress={() => openConversation(o)} style={styles.opener}>
            <Body style={{ fontSize: 14 }}>{o}</Body>
          </Pressable>
        ))}
        <Muted style={{ textAlign: 'center', fontSize: 12, paddingTop: space.s }}>
          Photos révélées d’un commun accord, après 10 messages.
        </Muted>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.l, paddingTop: space.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { alignItems: 'center', gap: space.m, paddingTop: space.xl, paddingHorizontal: space.xl },
  section: { paddingHorizontal: space.xl, paddingTop: 28, gap: space.m },
  opener: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.l, paddingHorizontal: space.l, paddingVertical: space.m },
});
