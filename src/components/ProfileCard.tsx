import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ME, type ProfileDisplay, type Track } from '../data/mock';
import { QUESTIONS } from '../data/questions';
import { colors, fonts, radius, space } from '../theme';
import { Body, Initial, Muted, Serif } from './ui';

/** Réglages du profil de l'utilisateur : bio, éléments affichés, musique. */
export interface MyProfile extends ProfileDisplay {
  /** `question` vide = texte libre. */
  prompts: { question: string; answer: string }[];
  music?: Track;
}

const TAG_QUESTIONS = QUESTIONS.filter((q) => q.kind === 'tags' && (q.step === 5 || q.id === 'weekend'));

export function tagLabel(value: string): string {
  for (const q of TAG_QUESTIONS) {
    const o = q.options?.find((x) => x.value === value);
    if (o) return o.label;
  }
  return value;
}

/** Les passions que l'utilisateur peut mettre en avant : celles qu'il a cochées dans le questionnaire. */
export function highlightCandidates(): string[] {
  const out: string[] = [];
  for (const q of TAG_QUESTIONS) {
    const a = ME.answers[q.id];
    if (a && Array.isArray(a.mine)) for (const v of a.mine) if (!out.includes(v)) out.push(v);
  }
  return out;
}

export const heightLabel = (cm: number) => `${(cm / 100).toFixed(2).replace('.', ',')} m`;

/**
 * Musique de profil : extrait de 30 s.
 * TODO : lecture via le catalogue d'un service de streaming (extraits officiels), jamais d'hébergement de fichiers.
 */
export function MusicLine({ track, compact = false }: { track: Track; compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Écouter ${track.title}, ${track.artist}`}
      onPress={() => Alert.alert('Extrait de 30 s', `« ${track.title} », ${track.artist}.`)}
      style={[styles.music, compact && { borderWidth: 0, paddingHorizontal: 0 }]}
    >
      <View style={styles.play}>
        <Feather name="play" size={12} color={colors.onAccent} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Body numberOfLines={1} style={{ fontSize: 13.5, fontFamily: fonts.sansBold }}>
          {track.title}
        </Body>
        <Muted style={{ fontSize: 12 }}>{track.artist}</Muted>
      </View>
    </Pressable>
  );
}

/** Le profil de l'utilisateur tel que ses matchs le voient, avant ou après le reveal. */
export function ProfileCard({ profile, after = false }: { profile: MyProfile; after?: boolean }) {
  const facts: string[] = [];
  if (profile.job) facts.push(ME.job);
  if (profile.zone) facts.push(ME.zone);
  const height = ME.answers.taille?.mine;
  if (profile.height && typeof height === 'number') facts.push(heightLabel(height));
  if (profile.studies) {
    const q = QUESTIONS.find((x) => x.id === 'etudes');
    const o = q?.options?.find((x) => x.value === ME.answers.etudes?.mine);
    if (o) facts.push(o.label);
  }
  // Bio facultative : sans texte, rien ne s'affiche (pas de cadre vide). Le texte libre passe en premier.
  const prompts = profile.prompts.filter((p) => p.answer.trim()).sort((a, b) => Number(!!a.question) - Number(!!b.question));

  return (
    <View style={styles.card}>
      {after && (
        <View style={styles.photo}>
          <Feather name="image" size={28} color={colors.muted} />
          <Muted>Votre photo principale</Muted>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        {!after && <Initial letter={ME.initial} size={56} highlight />}
        <View style={{ flex: 1 }}>
          <Serif size={26}>
            {ME.firstName}, {ME.age}
          </Serif>
          {facts.length > 0 && <Muted>{facts.join(' · ')}</Muted>}
        </View>
      </View>
      {profile.music && <MusicLine track={profile.music} />}
      {profile.highlights.length > 0 && (
        <View style={styles.tags}>
          {profile.highlights.map((v) => (
            <View key={v} style={styles.tag}>
              <Body style={{ fontSize: 13 }}>{tagLabel(v)}</Body>
            </View>
          ))}
        </View>
      )}
      {prompts.map((p) => (
        <View key={p.question || 'libre'} style={{ gap: 4 }}>
          {!!p.question && <Muted style={{ fontSize: 12 }}>{p.question}</Muted>}
          <Serif size={19} style={{ lineHeight: 25 }}>{p.answer}</Serif>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, backgroundColor: colors.card, borderRadius: 18, gap: 14 },
  photo: { height: 200, borderRadius: radius.s, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 8 },
  music: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  play: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.paper },
});
