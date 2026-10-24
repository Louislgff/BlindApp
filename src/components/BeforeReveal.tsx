import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { Track } from '../data/mock';
import { QUESTIONS } from '../data/questions';
import type { MatchSummary } from '../matching/summary';
import type { Answer } from '../matching/types';
import { colors, fonts, radius, space } from '../theme';
import { Initial, Label, Muted, Serif } from './ui';

// La fiche d'une personne AVANT le reveal : identité et %, musique, « Pourquoi vous », à propos,
// points communs, complémentarités, bio. Construite en cartes plutôt qu'en un bloc de texte.
// Sert au résumé de match et à l'aperçu « avant reveal » de son propre profil.

type IconName = ComponentProps<typeof Feather>['name'];

const SUMMARY_ICONS: Record<string, IconName> = {
  'Type de relation': 'heart', 'Désir d’enfants': 'users', Enfants: 'users', Famille: 'users', 'Vie à deux': 'home',
  'Vision du couple': 'heart', Mariage: 'heart', Voyages: 'send', Sorties: 'star', 'Week-ends': 'sun',
  'Rythme du quotidien': 'moon', 'Rythme de vie': 'sun', Tabac: 'wind', Alcool: 'coffee', Musique: 'music',
  'Projet de vie': 'compass', Humour: 'smile', Tempérament: 'smile', 'Premier abord': 'smile',
  Communication: 'message-circle', 'Gestion des désaccords': 'message-circle', Valeurs: 'star', 'Des valeurs proches': 'star',
};

/** Réponses de mode de vie montrées comme sur une fiche (jamais de données sensibles). */
const VITALS: { id: string; icon: IconName; label: string; summaryLabel: string }[] = [
  { id: 'recherche', icon: 'heart', label: 'Cherche', summaryLabel: 'Type de relation' },
  { id: 'desir-enfants', icon: 'users', label: 'Enfants', summaryLabel: 'Désir d’enfants' },
  { id: 'chronotype', icon: 'moon', label: 'Rythme', summaryLabel: 'Rythme du quotidien' },
  { id: 'tabac', icon: 'wind', label: 'Tabac', summaryLabel: 'Tabac' },
];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const split = (t: string) => {
  const i = t.indexOf(' : ');
  return i < 0 ? { k: t, v: '' } : { k: t.slice(0, i), v: t.slice(i + 3) };
};
const optionLabel = (qid: string, v: unknown) =>
  QUESTIONS.find((q) => q.id === qid)?.options?.find((o) => o.value === v)?.label ?? '';

function Ring({ score }: { score: number }) {
  const r = 32, c = 2 * Math.PI * r;
  return (
    <View style={{ width: 74, height: 74 }} accessibilityLabel={`${score} % de compatibilité`}>
      <Svg width={74} height={74} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={37} cy={37} r={r} stroke={colors.line} strokeWidth={5} fill="none" />
        <Circle cx={37} cy={37} r={r} stroke={colors.accentFill} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Serif size={24} style={{ color: colors.accent, lineHeight: 26 }}>{score}</Serif>
        <Text style={styles.ringLabel}>% MATCH</Text>
      </View>
    </View>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Feather name={icon} size={13} color={colors.accent} />
        <Label>{title}</Label>
      </View>
      {children}
    </View>
  );
}

function Tile({ icon, k, v }: { icon: IconName; k: string; v?: string }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon}>
        <Feather name={icon} size={15} color={colors.accent} />
      </View>
      <Text style={styles.tileKey}>{k.toUpperCase()}</Text>
      {!!v && <Text style={styles.tileValue}>{cap(v)}</Text>}
    </View>
  );
}

export interface BeforeRevealProps {
  initial: string;
  name: string;
  age: number;
  score?: number;
  facts: { icon: IconName; text: string }[];
  music?: Track;
  why?: string;
  answers?: Record<string, Answer>;
  summary?: MatchSummary;
  prompts: { question: string; answer: string }[];
  highlights?: string[];
  bioTitle?: string;
  /** « Elle », « Il »… dans les complémentarités. */
  pronoun?: string;
  onPlay?: () => void;
}

export function BeforeReveal(p: BeforeRevealProps) {
  const vitals = VITALS.map((v) => {
    const a = p.answers?.[v.id];
    const label = a && !a.skipped && typeof a.mine === 'string' ? optionLabel(v.id, a.mine) : '';
    return label ? { ...v, value: label } : null;
  }).filter((v): v is NonNullable<typeof v> => !!v);
  // Pas de doublon : ce qui est déjà dans « À propos » n'est pas répété dans « En commun ».
  const shown = new Set(vitals.map((v) => v.summaryLabel));
  const common = (p.summary?.common ?? []).filter((t) => !shown.has(split(t).k));
  const contrasts = [...(p.summary?.complementary ?? []), ...(p.summary?.explore ?? [])];
  const prompts = p.prompts.filter((x) => x.answer.trim());

  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.glow} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Initial letter={p.initial} size={64} highlight />
          <View style={{ flex: 1, gap: 2 }}>
            <Serif size={32} style={{ lineHeight: 34 }}>{p.name}, {p.age}</Serif>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="lock" size={11} color={colors.muted} />
              <Muted style={{ fontSize: 12 }}>Photos après le reveal mutuel</Muted>
            </View>
          </View>
          {p.score !== undefined && <Ring score={p.score} />}
        </View>
        {p.facts.length > 0 && (
          <View style={styles.pills}>
            {p.facts.map((f) => (
              <View key={f.text} style={styles.pill}>
                <Feather name={f.icon} size={12} color={colors.accent} />
                <Text style={styles.pillText}>{f.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {p.music && (
        <View style={[styles.section, { paddingTop: 12 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Écouter ${p.music.title}`} onPress={p.onPlay ?? (() => Alert.alert('Extrait de 30 s', `« ${p.music!.title} », ${p.music!.artist}.`))} style={styles.music}>
            <View style={styles.disc}>
              <Feather name="play" size={14} color={colors.paper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.musicKey}>SA MUSIQUE</Text>
              <Text numberOfLines={1} style={styles.musicTitle}>{p.music.title}</Text>
              <Muted style={{ fontSize: 12 }}>{p.music.artist}</Muted>
            </View>
            <Feather name="music" size={18} color={colors.accent} />
          </Pressable>
        </View>
      )}

      {!!p.why && (
        <View style={styles.section}>
          <View style={styles.why}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="heart" size={13} color={colors.accentFill} />
              <Label color={colors.accentFill}>Pourquoi vous</Label>
            </View>
            <Serif size={21} style={{ color: colors.paper, lineHeight: 27 }}>{p.why}</Serif>
          </View>
        </View>
      )}

      {vitals.length > 0 && (
        <Section icon="user" title="À propos">
          <View style={styles.tiles}>
            {vitals.map((v) => <Tile key={v.id} icon={v.icon} k={v.label} v={v.value} />)}
          </View>
        </Section>
      )}

      {common.length > 0 && (
        <Section icon="star" title="En commun">
          <View style={styles.tiles}>
            {common.map((t) => {
              const x = split(t);
              return <Tile key={t} icon={SUMMARY_ICONS[x.k] ?? 'star'} k={x.k} v={x.v} />;
            })}
          </View>
        </Section>
      )}

      {contrasts.length > 0 && (
        <Section icon="repeat" title="Complémentaires">
          {contrasts.map((t) => {
            const x = split(t);
            const [theirs = '', mine = ''] = x.v.split(' de son côté, ');
            return (
              <View key={t} style={{ gap: 6 }}>
                <Muted style={{ fontSize: 12 }}>{x.k}</Muted>
                <View style={styles.compare}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tileKey}>{(p.pronoun ?? 'Elle').toUpperCase()}</Text>
                    <Text style={styles.tileValue}>{cap(theirs)}</Text>
                  </View>
                  <Feather name="repeat" size={16} color={colors.accent} />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.tileKey}>VOUS</Text>
                    <Text style={[styles.tileValue, { textAlign: 'right' }]}>{cap(mine.replace(/ du vôtre$/, ''))}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Section>
      )}

      {(prompts.length > 0 || !!p.highlights?.length) && (
        <Section icon="edit-3" title={p.bioTitle ?? 'Son profil'}>
          {!!p.highlights?.length && (
            <View style={styles.pills}>
              {p.highlights.map((h) => (
                <View key={h} style={[styles.pill, { backgroundColor: colors.card }]}>
                  <Feather name="star" size={11} color={colors.accent} />
                  <Text style={styles.pillText}>{h}</Text>
                </View>
              ))}
            </View>
          )}
          {prompts.map((x) => (
            <View key={x.question || 'libre'} style={styles.prompt}>
              {!!x.question && <Muted style={{ fontSize: 12 }}>{x.question}</Muted>}
              <Serif size={20} style={{ lineHeight: 26 }}>{x.answer}</Serif>
            </View>
          ))}
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: space.xl, marginTop: space.l, padding: 20, borderRadius: 22, backgroundColor: colors.card, overflow: 'hidden' },
  glow: { position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(232,148,74,0.14)' },
  ringLabel: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.8, color: colors.muted, marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.paper },
  pillText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft },
  section: { paddingHorizontal: space.xl, paddingTop: 26, gap: space.m },
  music: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 18, padding: 12 },
  disc: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  musicKey: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.4, color: colors.muted },
  musicTitle: { fontFamily: fonts.sansBold, fontSize: 14.5, color: colors.ink },
  why: { backgroundColor: colors.ink, borderRadius: 20, padding: 20, gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48.5%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 16, padding: 12, gap: 6 },
  tileIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  tileKey: { fontFamily: fonts.sansMedium, fontSize: 10.5, letterSpacing: 0.9, color: colors.muted },
  tileValue: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 19, color: colors.ink },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  prompt: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 6, borderLeftWidth: 3, borderLeftColor: colors.accentFill },
});
