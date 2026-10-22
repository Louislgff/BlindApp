import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackButton, Body, Divider, Initial, Label, Muted, Screen, Serif } from '../../src/components/ui';
import { ME, NEW_MATCHES, PAST_REVEALS, PROFILES_BY_ID } from '../../src/data/mock';
import { DEMO_PHOTOS } from '../../src/data/photos';
import { QUESTIONS } from '../../src/data/questions';
import { computeMatch } from '../../src/matching/matching';
import { matchStatus, revealSummary, useStore } from '../../src/state/store';
import { colors, fonts, space } from '../../src/theme';

// Un reveal passé : les cinq personnes proposées, et où vous en êtes avec chacune.
export default function PastReveal() {
  const { index } = useLocalSearchParams<{ index: string }>();
  const { conversations } = useStore();
  const reveal = PAST_REVEALS[Number(index)];
  if (!reveal) return null;
  // Du plus au moins compatible pour la relecture (le dévoilement, lui, allait dans l'autre sens).
  const people = reveal.profileIds
    .map((id) => PROFILES_BY_ID.get(id)!)
    .map((p) => ({ p, score: computeMatch(ME, p, QUESTIONS).score }))
    .sort((a, b) => b.score - a.score);

  return (
    <Screen scroll>
      <View style={{ paddingHorizontal: space.l, paddingTop: space.s }}>
        <BackButton />
      </View>
      <View style={{ paddingHorizontal: space.xl, gap: space.s }}>
        <Label color={colors.accent}>Reveal du {reveal.date}</Label>
        <Serif size={36}>Vos cinq profils</Serif>
        <Muted>{revealSummary(reveal.profileIds, conversations)}</Muted>
      </View>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl }}>
        {people.map(({ p, score }) => {
          const conv = conversations.find((c) => c.profileId === p.id);
          const status = matchStatus(p.id, conversations, NEW_MATCHES);
          return (
            <View key={p.id}>
              <Divider />
              <Pressable
                accessibilityRole="link"
                style={styles.row}
                onPress={() => router.push(conv?.revealedOn ? `/revealed/${p.id}` : conv ? `/conversation/${p.id}` : `/match/${p.id}`)}
              >
                <Initial letter={p.initial} size={48} source={conv?.revealedOn ? DEMO_PHOTOS[p.id]?.[0] : undefined} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Body style={{ fontFamily: fonts.sansBold }}>
                    {p.firstName}, {p.age}
                  </Body>
                  <Muted style={{ fontSize: 12, color: conv ? colors.accent : colors.muted }}>{status}</Muted>
                </View>
                <Serif size={24} style={{ color: colors.accent }}>{score} %</Serif>
                <Feather name="chevron-right" size={16} color={colors.muted} />
              </Pressable>
            </View>
          );
        })}
        <Divider />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 14 },
});
