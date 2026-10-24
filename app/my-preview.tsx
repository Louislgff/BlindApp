import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeforeReveal, type BeforeRevealProps } from '../src/components/BeforeReveal';
import { MyMagazine } from '../src/components/Magazine';
import { heightLabel, tagLabel } from '../src/components/ProfileCard';
import { Button, Muted } from '../src/components/ui';
import { ME } from '../src/data/mock';
import { QUESTIONS } from '../src/data/questions';
import { useStore } from '../src/state/store';
import { colors, fonts, radius, space } from '../src/theme';

// Aperçu en lecture seule : son profil exactement comme un match le voit, avant puis après le reveal.
// Aucun bouton de modification ici : on revient à « Mon profil » pour changer quelque chose.
export default function MyPreview() {
  const { myProfile, previewDraft, setPreviewDraft } = useStore();
  const profile = previewDraft ?? myProfile;
  const [mode, setMode] = useState<'avant' | 'apres'>('avant');
  const { width } = useWindowDimensions();

  const close = () => {
    setPreviewDraft(null);
    router.back();
  };

  const facts: BeforeRevealProps['facts'] = [];
  if (profile.job) facts.push({ icon: 'briefcase', text: ME.job });
  if (profile.zone) facts.push({ icon: 'map-pin', text: ME.zone });
  const height = ME.answers.taille?.mine;
  if (profile.height && typeof height === 'number') facts.push({ icon: 'arrow-up', text: heightLabel(height) });
  if (profile.studies) {
    const o = QUESTIONS.find((q) => q.id === 'etudes')?.options?.find((x) => x.value === ME.answers.etudes?.mine);
    if (o) facts.push({ icon: 'book-open', text: o.label });
  }
  const prompts = profile.prompts.filter((p) => p.answer.trim()).sort((a, b) => Number(!!a.question) - Number(!!b.question));

  const note = (
    <View style={styles.note}>
      <Feather name="eye" size={18} color={colors.accent} />
      <Muted style={{ flex: 1, fontSize: 12.5 }}>Chaque personne voit en plus votre % de compatibilité et ce que vous avez en commun avec elle.</Muted>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Button variant="text" label="Fermer" onPress={close} style={{ height: 36, paddingHorizontal: 0 }} />
        <View style={styles.seg} accessibilityRole="tablist">
          {(['avant', 'apres'] as const).map((v) => (
            <Pressable
              key={v}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === v }}
              onPress={() => setMode(v)}
              style={[styles.segItem, mode === v && { backgroundColor: colors.card }]}
            >
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: mode === v ? colors.ink : colors.muted }}>
                {v === 'avant' ? 'Avant reveal' : 'Après reveal'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {mode === 'apres' ? (
          <>
            <MyMagazine profile={profile} width={width} />
            {note}
          </>
        ) : (
          <>
            <BeforeReveal
              initial={ME.initial}
              name={ME.firstName}
              age={ME.age}
              facts={facts}
              music={profile.music}
              answers={ME.answers}
              prompts={prompts}
              highlights={profile.highlights.map(tagLabel)}
              bioTitle="Votre profil"
            />
            {note}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, padding: 3 },
  segItem: { height: 32, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: space.m, paddingTop: space.xl, paddingHorizontal: space.xl },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', margin: space.xl, marginBottom: 0, padding: space.l, backgroundColor: colors.card, borderRadius: radius.s },
  section: { paddingHorizontal: space.xl, paddingTop: 26, gap: space.m },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.rose },
});
