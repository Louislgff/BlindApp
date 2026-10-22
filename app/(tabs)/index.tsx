import { Feather } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Button, Divider, Label, Muted, Screen, Serif, SerifItalic } from '../../src/components/ui';
import { NEXT_REVEAL, PAST_REVEALS } from '../../src/data/mock';
import { revealSummary, useStore } from '../../src/state/store';
import { colors, fonts, radius, space } from '../../src/theme';

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, target.getTime() - now);
  return {
    done: ms === 0,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

const revealLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric' })
  .format(NEXT_REVEAL)
  .replace(/^./, (c) => c.toUpperCase());

export default function RevealHome() {
  const { done, days, hours, minutes } = useCountdown(NEXT_REVEAL);
  const { conversations } = useStore();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Serif size={30}>Blind</Serif>
        <Label>Paris</Label>
      </View>

      <View style={styles.block}>
        <Label color={colors.accent}>{done ? 'Reveal en cours' : 'Prochain reveal'}</Label>
        {done ? (
          <Serif size={64} style={{ lineHeight: 68 }}>C’est l’heure.</Serif>
        ) : (
          <View style={styles.countdown} accessibilityLabel={`Dans ${days} jours, ${hours} heures et ${minutes} minutes`}>
            {[
              [days, 'jours'],
              [hours, 'heures'],
              [minutes, 'minutes'],
            ].map(([value, unit]) => (
              <View key={unit as string}>
                <Serif size={76} style={{ lineHeight: 80 }}>{pad(value as number)}</Serif>
                <Muted>{unit}</Muted>
              </View>
            ))}
          </View>
        )}
        <Body style={{ color: colors.inkSoft }}>{revealLabel}</Body>
        <SerifItalic size={26} style={{ marginTop: space.l }}>
          Cinq personnes ont été choisies pour vous. Vous les découvrirez en même temps qu’elles vous découvrent.
        </SerifItalic>
      </View>

      {done && (
        <View style={{ paddingHorizontal: space.xl, marginTop: space.xl }}>
          <Button label="Découvrir mes cinq profils" onPress={() => router.push('/reveal-day')} />
        </View>
      )}

      <View style={styles.status}>
        <Feather name="check-circle" size={22} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Body style={{ fontFamily: fonts.sansBold, fontSize: 14 }}>Profil complet, vérifié</Body>
          <Muted>Vous êtes inclus dans ce reveal.</Muted>
        </View>
      </View>

      <View style={styles.block}>
        <Label>Reveals précédents</Label>
        <View>
          {PAST_REVEALS.map((r, i) => (
            <View key={r.date}>
              <Divider />
              <Link href={`/past-reveal/${i}`} asChild>
                <Pressable accessibilityRole="link" style={styles.row}>
                  <Body>{r.date}</Body>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Muted>{revealSummary(r.profileIds, conversations)}</Muted>
                    <Feather name="chevron-right" size={16} color={colors.muted} />
                  </View>
                </Pressable>
              </Link>
            </View>
          ))}
          <Divider />
        </View>
      </View>

      {/* Démo : permet de vivre le jour J sans attendre le compte à rebours. */}
      {!done && (
        <View style={{ paddingHorizontal: space.xl, marginTop: space.l }}>
          <Button variant="text" label="Aperçu du jour du reveal" onPress={() => router.push('/reveal-day')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.l, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  block: { paddingHorizontal: space.xl, paddingTop: 48, gap: space.m },
  countdown: { flexDirection: 'row', gap: 18, alignItems: 'flex-end' },
  status: {
    marginHorizontal: space.xl,
    marginTop: space.xxl,
    padding: space.l,
    backgroundColor: colors.card,
    borderRadius: radius.s,
    flexDirection: 'row',
    gap: space.m,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
});
