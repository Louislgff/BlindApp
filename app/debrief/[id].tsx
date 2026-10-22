import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BackButton, Body, Button, Chip, Label, Muted, Screen, Serif } from '../../src/components/ui';
import { PROFILES_BY_ID } from '../../src/data/mock';
import { useStore } from '../../src/state/store';
import { colors, fonts, radius, space } from '../../src/theme';

// Debrief privé après une rencontre : jamais partagé avec l'autre personne.
// Il sert à affiner les poids du matching (quelles réponses prédisent vraiment une seconde rencontre).

const MISSING = ['L’attirance physique', 'La conversation', 'Les valeurs', 'Le décalage avec le profil', 'Le moment', 'Autre chose'];

export default function DebriefScreen() {
  const { id, met } = useLocalSearchParams<{ id: string; met?: string }>();
  const p = PROFILES_BY_ID.get(id);
  const { conversationFor, markMet, completeDebrief } = useStore();
  const [rating, setRating] = useState<number | null>(null);
  const [again, setAgain] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [faithful, setFaithful] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [note, setNote] = useState('');
  if (!p) return null;
  const c = conversationFor(p.id);

  const ensureMet = () => {
    if (c && !c.metOn && met) markMet(c.id);
  };

  const submit = () => {
    if (!c) return;
    ensureMet();
    completeDebrief(c.id);
    // TODO backend : insérer dans debriefs (rating, again, missing, faithful, issue, note).
    // Si issue === 'oui' : ouvrir un signalement prioritaire pour la modération.
    router.back();
  };

  const toggleMissing = (m: string) =>
    setMissing((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.top}>
        <BackButton />
      </View>
      <View style={styles.section}>
        <Label color={colors.accent}>Debrief privé</Label>
        <Serif size={34} style={{ lineHeight: 38 }}>Votre rencontre avec {p.firstName}</Serif>
        <Muted>Une minute. Vos réponses ne sont jamais partagées avec {p.firstName} : elles servent à mieux choisir vos prochains profils.</Muted>
      </View>

      <View style={styles.section}>
        <Body style={styles.q}>Comment ça s’est passé ?</Body>
        <View style={styles.row}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip key={n} label={String(n)} selected={rating === n} onPress={() => setRating(n)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Body style={styles.q}>Envie de vous revoir ?</Body>
        <View style={styles.row}>
          {['Oui', 'Peut-être', 'Non'].map((v) => (
            <Chip key={v} label={v} selected={again === v} onPress={() => setAgain(v)} />
          ))}
        </View>
      </View>

      {(again === 'Non' || again === 'Peut-être') && (
        <View style={styles.section}>
          <Body style={styles.q}>Qu’est-ce qui a manqué ?</Body>
          <View style={styles.row}>
            {MISSING.map((m) => (
              <Chip key={m} label={m} selected={missing.includes(m)} onPress={() => toggleMissing(m)} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Body style={styles.q}>Le profil correspondait-il à la réalité ?</Body>
        <View style={styles.row}>
          {['Tout à fait', 'Plutôt', 'Pas vraiment'].map((v) => (
            <Chip key={v} label={v} selected={faithful === v} onPress={() => setFaithful(v)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Body style={styles.q}>S’est-il passé quelque chose d’inapproprié ?</Body>
        <View style={styles.row}>
          {['Non', 'Oui'].map((v) => (
            <Chip key={v} label={v} selected={issue === v} onPress={() => setIssue(v)} />
          ))}
        </View>
        {issue === 'Oui' && (
          <Muted style={{ color: colors.accent }}>
            Merci de nous le dire. Notre équipe vous recontacte sous 24 h, en toute confidentialité.
          </Muted>
        )}
      </View>

      <View style={styles.section}>
        <Body style={styles.q}>Un mot de plus ? (facultatif)</Body>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          accessibilityLabel="Commentaire facultatif"
          placeholder="Ce que vous retenez de cette rencontre…"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>

      <View style={[styles.section, { marginTop: space.l }]}>
        <Button label="Envoyer mon debrief" onPress={submit} disabled={rating === null || again === null} />
        <Button
          variant="text"
          label="Plus tard"
          onPress={() => {
            ensureMet();
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.l, paddingTop: space.s },
  section: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.m },
  q: { fontFamily: fonts.sansBold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: colors.input,
    padding: space.l,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
});
