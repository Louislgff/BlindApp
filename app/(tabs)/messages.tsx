import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Divider, Initial, Label, Muted, ProgressBar, Screen, Serif } from '../../src/components/ui';
import { ME, NEW_MATCHES, PROFILES_BY_ID } from '../../src/data/mock';
import { DEMO_PHOTOS } from '../../src/data/photos';
import { QUESTIONS } from '../../src/data/questions';
import { computeMatch } from '../../src/matching/matching';
import { revealState, useStore } from '../../src/state/store';
import { colors, fonts, space } from '../../src/theme';

export default function MessagesTab() {
  const { conversations } = useStore();
  const newMatches = NEW_MATCHES.filter((id) => !conversations.some((c) => c.profileId === id));

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Serif size={36}>Messages</Serif>
      </View>

      {newMatches.length > 0 && (
        <View style={styles.section}>
          <Label>Nouveaux matchs · 15 octobre</Label>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {newMatches.map((id) => {
              const p = PROFILES_BY_ID.get(id)!;
              const score = computeMatch(ME, p, QUESTIONS).score;
              return (
                <Link key={id} href={`/match/${id}`} asChild>
                  <Pressable accessibilityRole="link" style={{ alignItems: 'center', gap: 6 }}>
                    <Initial letter={p.initial} highlight />
                    <Body style={{ fontSize: 13 }}>{p.firstName}</Body>
                    <Muted style={{ fontSize: 11 }}>{score} %</Muted>
                  </Pressable>
                </Link>
              );
            })}
          </View>
          <Muted>{PROFILES_BY_ID.get(newMatches[0])!.firstName} attend peut-être votre premier message.</Muted>
        </View>
      )}

      <View style={styles.section}>
        <Label>Conversations</Label>
        <View>
          {conversations.map((c) => {
            const p = PROFILES_BY_ID.get(c.profileId)!;
            const state = revealState(c);
            const last = c.messages[c.messages.length - 1];
            const needsDebrief = c.metOn && !c.debriefDone;
            let status = '';
            if (state.kind === 'locked') status = `${state.count} / ${state.total}`;
            else if (state.kind === 'available') status = 'Reveal disponible';
            else if (state.kind === 'waiting') status = 'En attente';
            else status = 'Photos révélées';
            return (
              <View key={c.id}>
                <Divider />
                <Link href={`/conversation/${c.profileId}`} asChild>
                  <Pressable accessibilityRole="link" style={styles.row}>
                    <Initial letter={p.initial} source={c.revealedOn ? DEMO_PHOTOS[p.id]?.[0] : undefined} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Body style={{ fontFamily: fonts.sansBold }}>{p.firstName}</Body>
                        <Muted style={{ fontSize: 12, color: state.kind === 'available' ? colors.accent : colors.muted }}>
                          {status}
                        </Muted>
                      </View>
                      <Body numberOfLines={1} style={{ fontSize: 14, color: colors.inkSoft }}>
                        {c.metOn ? `Vous vous êtes rencontrés ${c.metOn}.` : last?.text}
                      </Body>
                      {needsDebrief ? (
                        <Muted style={{ color: colors.accent }}>Faire le debrief · 1 min, reste privé</Muted>
                      ) : state.kind === 'locked' ? (
                        <ProgressBar value={state.count / state.total} color={colors.muted} />
                      ) : state.kind === 'available' ? (
                        <ProgressBar value={1} />
                      ) : null}
                    </View>
                  </Pressable>
                </Link>
              </View>
            );
          })}
          <Divider />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.l },
  section: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.m },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 14 },
});
