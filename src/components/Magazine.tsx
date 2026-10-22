import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ME, type Track } from '../data/mock';
import { DEMO_PHOTOS } from '../data/photos';
import { QUESTIONS } from '../data/questions';
import { colors, fonts, radius, space } from '../theme';
import { heightLabel, MusicLine, tagLabel, type MyProfile } from './ProfileCard';
import { Label, Muted, Point, Serif } from './ui';

// Profil révélé « façon magazine » : une grande photo, le texte, puis deux photos plus petites.
// C'est la signature visuelle de Blind : utilisé pour les matchs et pour l'aperçu de son propre profil.

/** Filigrane discret : identifie la personne qui regarde, pour rendre toute fuite traçable. */
function Watermark({ viewer }: { viewer: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[0.2, 0.5, 0.8].map((top) => (
        <Text key={top} style={[styles.watermark, { top: `${top * 100}%` }]}>
          {viewer} · blind
        </Text>
      ))}
    </View>
  );
}

function PhotoSlot({ label, height, width, source }: { label: string; height: number; width: number; source?: ImageSourcePropType }) {
  // En production : URL signée et de courte durée, servie seulement après un reveal mutuel.
  if (source) return <Image source={source} accessibilityLabel={label} resizeMode="cover" style={{ height, width, borderRadius: radius.s }} />;
  return (
    <View style={[styles.photo, { height, width }]}>
      <Feather name="image" size={32} color={colors.muted} />
      <Muted>{label}</Muted>
    </View>
  );
}

export interface MagazineProps {
  name: string;
  age: number;
  facts?: string;
  photos: ImageSourcePropType[];
  count: number;
  /** Largeur disponible : écran entier pour un match, carte pour un aperçu. */
  width: number;
  score?: number;
  date?: string;
  music?: Track;
  /** `question` vide = texte libre, affiché sans intitulé. */
  prompts: { question: string; answer: string }[];
  highlights?: string[];
  common?: string[];
  viewer: string;
  onBack?: () => void;
}

export function Magazine(p: MagazineProps) {
  const [page, setPage] = useState(0);
  const count = Math.max(p.count, p.photos.length);
  const extras = [1, 2].filter((i) => i < count);
  const inner = p.width - space.xl * 2;
  const extraWidth = extras.length === 2 ? (inner - space.s) / 2 : inner;
  const prompts = p.prompts.filter((x) => x.answer.trim());

  const prompt = (x: { question: string; answer: string }) => (
    <View key={x.question || 'libre'} style={styles.prompt}>
      {!!x.question && <Muted style={{ fontSize: 12 }}>{x.question}</Muted>}
      <Serif size={22} style={{ lineHeight: 29 }}>{x.answer}</Serif>
    </View>
  );

  return (
    <View>
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / p.width))}
        >
          {Array.from({ length: count }, (_, i) => (
            <PhotoSlot key={i} width={p.width} height={p.width * 1.5} label={`Photo ${i + 1} de ${p.name}`} source={p.photos[i]} />
          ))}
        </ScrollView>
        <Watermark viewer={p.viewer} />
        <SafeAreaView edges={p.onBack ? ['top'] : []} style={styles.overlayTop} pointerEvents="box-none">
          {p.onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={p.onBack} style={styles.roundBtn}>
              <Feather name="chevron-left" size={22} color={colors.ink} />
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.pill}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.ink }}>
              {page + 1} / {count}
            </Text>
          </View>
        </SafeAreaView>
        <View style={styles.dots}>
          {Array.from({ length: count }, (_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      </View>

      <View style={styles.titleRow}>
        <View style={{ gap: 6, flex: 1 }}>
          <Serif size={40} style={{ lineHeight: 44 }}>
            {p.name}, {p.age}
          </Serif>
          {!!p.facts && <Muted style={{ fontSize: 14 }}>{p.facts}</Muted>}
        </View>
        {p.score !== undefined && (
          <View style={{ alignItems: 'flex-end' }}>
            <Serif size={36} style={{ color: colors.accent }}>{p.score} %</Serif>
            <Muted style={{ fontSize: 11 }}>compatibilité</Muted>
          </View>
        )}
      </View>

      {!!p.date && (
        <View style={styles.row}>
          <Feather name="eye" size={16} color={colors.accent} />
          <Muted style={{ color: colors.inkSoft }}>{p.date}</Muted>
        </View>
      )}
      {p.music && (
        <View style={styles.row}>
          <MusicLine track={p.music} />
        </View>
      )}

      {prompts[0] && prompt(prompts[0])}
      {extras.length > 0 && (
        <View style={styles.grid}>
          {extras.map((i) => (
            <PhotoSlot key={i} width={extraWidth} height={extras.length === 2 ? 200 : 260} label={`Photo ${i + 1}`} source={p.photos[i]} />
          ))}
        </View>
      )}
      {prompts.slice(1).map(prompt)}

      {!!p.highlights?.length && (
        <View style={[styles.row, { flexWrap: 'wrap', gap: space.s }]}>
          {p.highlights.map((h) => (
            <View key={h} style={styles.tag}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.rose }}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {!!p.common?.length && (
        <View style={styles.section}>
          <Label>En commun</Label>
          {p.common.map((t) => (
            <Point key={t} text={t} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Aperçu « après reveal » de son propre profil, au même format que celui des matchs. */
export function MyMagazine({ profile, width }: { profile: MyProfile; width: number }) {
  const facts: string[] = [];
  if (profile.job) facts.push(ME.job);
  if (profile.zone) facts.push(ME.zone);
  const height = ME.answers.taille?.mine;
  if (profile.height && typeof height === 'number') facts.push(heightLabel(height));
  if (profile.studies) {
    const o = QUESTIONS.find((q) => q.id === 'etudes')?.options?.find((x) => x.value === ME.answers.etudes?.mine);
    if (o) facts.push(o.label);
  }
  const prompts = [...profile.prompts].sort((a, b) => Number(!!a.question) - Number(!!b.question));
  return (
    <Magazine
      name={ME.firstName}
      age={ME.age}
      facts={facts.join(' · ')}
      photos={DEMO_PHOTOS.me ?? []}
      count={ME.photos}
      width={width}
      music={profile.music}
      prompts={prompts}
      highlights={profile.highlights.map(tagLabel)}
      viewer="aperçu"
    />
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.s },
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(245,230,218,0.13)',
    transform: [{ rotate: '-18deg' }],
  },
  overlayTop: { position: 'absolute', top: space.s, left: space.m, right: space.m, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.paper },
  dots: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 10, height: 3, borderRadius: 2, backgroundColor: 'rgba(245,230,218,0.5)' },
  dotOn: { width: 22, backgroundColor: colors.ink },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.xl, paddingTop: space.l },
  prompt: {
    marginHorizontal: space.xl,
    marginTop: 28,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    gap: 6,
  },
  grid: { flexDirection: 'row', gap: space.s, paddingHorizontal: space.xl, marginTop: space.xl },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.rose },
  section: { paddingHorizontal: space.xl, paddingTop: 28, gap: space.m },
});
