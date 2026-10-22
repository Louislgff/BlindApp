import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { heightLabel, highlightCandidates, MusicLine, tagLabel, type MyProfile } from '../src/components/ProfileCard';
import { Body, Button, Chip, Divider, Muted, Serif } from '../src/components/ui';
import { ME, MUSIC_LIBRARY } from '../src/data/mock';
import { useStore } from '../src/state/store';
import { colors, fonts, radius, space } from '../src/theme';

// « Mon profil » : la bio, les informations affichées, les passions mises en avant et la musique,
// avec un aperçu de ce que voient les matchs avant et après le reveal.

const PROMPTS = [
  'Ce qu’il faut savoir sur moi…',
  'Un dimanche parfait à Paris, c’est…',
  'Ce que j’attends de l’autre…',
  'Ce qui me fait craquer…',
  'Ce qui me fait fuir…',
  'Mon adresse préférée à Paris…',
  'Je suis fier de…',
  'On s’entendra bien si…',
];

function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: () => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={onChange} style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body>{label}</Body>
        {!!detail && <Muted style={{ fontSize: 12 }}>{detail}</Muted>}
      </View>
      <View style={[styles.switch, { backgroundColor: value ? colors.accentFill : colors.border, alignItems: value ? 'flex-end' : 'flex-start' }]}>
        <View style={styles.knob} />
      </View>
    </Pressable>
  );
}

export default function MyProfileScreen() {
  const { myProfile, setMyProfile, setPreviewDraft } = useStore();
  const [draft, setDraft] = useState<MyProfile>(() => structuredClone(myProfile));
  const [hint, setHint] = useState('');
  const set = (patch: Partial<MyProfile>) => setDraft((d) => ({ ...d, ...patch }));

  const togglePrompt = (q: string) => {
    if (draft.prompts.some((p) => p.question === q)) return set({ prompts: draft.prompts.filter((p) => p.question !== q) });
    if (draft.prompts.length >= 3) return setHint('Trois blocs maximum : retirez-en un pour en ajouter un autre.');
    set({ prompts: [...draft.prompts, { question: q, answer: '' }] });
  };
  const toggleHighlight = (v: string) => {
    if (draft.highlights.includes(v)) return set({ highlights: draft.highlights.filter((x) => x !== v) });
    if (draft.highlights.length >= 3) return setHint('Trois passions maximum : retirez-en une pour en choisir une autre.');
    set({ highlights: [...draft.highlights, v] });
  };
  const save = () => {
    // TODO backend : enregistrer bio, réglages d'affichage et musique (table profiles).
    setMyProfile(draft);
    router.back();
  };
  const height = ME.answers.taille?.mine;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Button variant="text" label="Annuler" onPress={() => router.back()} style={{ height: 36 }} />
        <Muted>Mon profil</Muted>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space.s }}>
          <Serif size={36}>Mon profil</Serif>
          <Muted>C’est la première chose que vos matchs découvrent de vous.</Muted>
        </View>

        <Button
          variant="ghost"
          label="Voir l’aperçu, avant et après reveal"
          onPress={() => {
            setPreviewDraft(draft);
            router.push('/my-preview');
          }}
          style={{ height: 48 }}
        />

        <View style={{ gap: space.m }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Serif size={24}>Ma bio</Serif>
            <Muted style={{ fontSize: 12 }}>Facultatif</Muted>
          </View>
          <Muted>Écrivez librement, ou partez d’un sujet. Sans bio, votre profil reste complet grâce à vos réponses.</Muted>
          <View style={styles.chips}>
            {/* Texte libre : question vide */}
            <Chip label="Texte libre" selected={draft.prompts.some((p) => p.question === '')} onPress={() => togglePrompt('')} />
            {PROMPTS.map((q) => (
              <Chip key={q} label={q} selected={draft.prompts.some((p) => p.question === q)} onPress={() => togglePrompt(q)} />
            ))}
          </View>
          {draft.prompts.map((p, i) => (
            <View key={p.question || 'libre'} style={{ gap: 6 }}>
              <Muted style={{ fontSize: 12 }}>{p.question || 'Texte libre'}</Muted>
              <TextInput
                multiline
                maxLength={p.question ? 300 : 500}
                placeholder={p.question ? undefined : 'Présentez-vous comme vous le souhaitez…'}
                placeholderTextColor={colors.muted}
                accessibilityLabel={p.question || 'Texte libre'}
                value={p.answer}
                onChangeText={(t) => set({ prompts: draft.prompts.map((x, j) => (j === i ? { ...x, answer: t } : x)) })}
                style={styles.input}
              />
            </View>
          ))}
        </View>

        <View>
          <Serif size={24} style={{ marginBottom: space.s }}>Informations affichées</Serif>
          <View style={styles.row}>
            <Body style={{ flex: 1 }}>Prénom et âge</Body>
            <Muted style={{ fontSize: 12 }}>Toujours affichés</Muted>
          </View>
          <Divider />
          <Toggle label="Métier" detail={ME.job} value={draft.job} onChange={() => set({ job: !draft.job })} />
          <Divider />
          <Toggle label="Quartier" detail={ME.zone} value={draft.zone} onChange={() => set({ zone: !draft.zone })} />
          <Divider />
          <Toggle
            label="Taille"
            detail={typeof height === 'number' ? heightLabel(height) : undefined}
            value={draft.height}
            onChange={() => set({ height: !draft.height })}
          />
          <Divider />
          <Toggle label="Niveau d’études" value={draft.studies} onChange={() => set({ studies: !draft.studies })} />
          <Divider />
        </View>

        <View style={{ gap: space.m }}>
          <Serif size={24}>Passions mises en avant</Serif>
          <Muted>Jusqu’à trois, prises dans vos réponses. {draft.highlights.length} / 3</Muted>
          <View style={styles.chips}>
            {highlightCandidates().map((v) => (
              <Chip key={v} label={tagLabel(v)} selected={draft.highlights.includes(v)} onPress={() => toggleHighlight(v)} />
            ))}
          </View>
        </View>

        <View style={{ gap: space.m }}>
          <Serif size={24}>Musique de profil</Serif>
          <Muted>Un extrait de 30 secondes que vos matchs peuvent écouter, avant même de voir vos photos.</Muted>
          {draft.music ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <MusicLine track={draft.music} />
              <Button variant="text" label="Retirer" onPress={() => set({ music: undefined })} style={{ height: 36 }} />
            </View>
          ) : (
            <Muted style={{ fontStyle: 'italic' }}>Aucune musique choisie.</Muted>
          )}
          {/* TODO : recherche dans le catalogue du service de streaming retenu. */}
          <TextInput placeholder="Rechercher un titre ou un artiste" placeholderTextColor={colors.muted} accessibilityLabel="Rechercher une musique" style={[styles.input, { minHeight: 48 }]} />
          <View>
            {MUSIC_LIBRARY.map((t) => {
              const on = draft.music?.title === t.title;
              return (
                <View key={t.title}>
                  <Divider />
                  <Pressable accessibilityRole="button" onPress={() => set({ music: t })} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Body style={on ? { color: colors.accent, fontFamily: fonts.sansBold } : undefined}>{t.title}</Body>
                      <Muted style={{ fontSize: 12 }}>{t.artist}</Muted>
                    </View>
                    {on && <Feather name="check" size={18} color={colors.accent} />}
                  </Pressable>
                </View>
              );
            })}
            <Divider />
          </View>
          <Toggle
            label="Lecture automatique"
            detail="Désactivée par défaut : vos matchs lancent l’extrait s’ils le souhaitent."
            value={draft.autoplay}
            onChange={() => set({ autoplay: !draft.autoplay })}
          />
        </View>

        {!!hint && <Muted style={{ color: colors.accent }}>{hint}</Muted>}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Enregistrer mon profil" onPress={save} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, paddingBottom: space.xl },
  top: { paddingHorizontal: space.l, paddingTop: space.s, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { padding: space.xl, paddingBottom: 48, gap: space.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: space.m },
  switch: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.paper },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, padding: 3 },
  segItem: { height: 30, paddingHorizontal: 10, borderRadius: radius.pill, justifyContent: 'center' },
  input: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    backgroundColor: colors.input,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  footer: { padding: space.l, paddingHorizontal: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
