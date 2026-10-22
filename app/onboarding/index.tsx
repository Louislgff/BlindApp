import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Chip, Label, Muted, ProgressBar, Serif } from '../../src/components/ui';
import { ME } from '../../src/data/mock';
import { canBeDeterminant, IMPORTANCE_CHOICES, QUESTIONS, STEP_TITLES, SUGGESTED_DETERMINANTS } from '../../src/data/questions';
import { IMPORTANCE, type Answer, type Importance, type LookingFor, type Question } from '../../src/matching/types';
import { colors, fonts, radius, space } from '../../src/theme';

// Questionnaire d'inscription : vérification, les bases, puis les questions de matching
// étape par étape, et enfin textes, points communs / complémentarité et critères déterminants.

const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => `Paris ${i + 1}${i === 0 ? 'er' : 'e'}`);
const DISTANCES = ['Ma zone et voisines', 'Tout Paris', 'Paris + petite couronne', 'Île-de-France'];
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
const SHARE_LEVELS: { label: string; value: Importance }[] = [
  { label: 'Indispensable', value: IMPORTANCE.tresImportant },
  { label: 'Ce serait un plus', value: IMPORTANCE.important },
  { label: 'Peu importe', value: IMPORTANCE.peuImporte },
];

type StepId = 'verification' | 'bases' | number | 'final';
// Les questions de l'étape 2 (ce que je cherche) sont affichées avec « Les bases ».
const STEPS: StepId[] = ['verification', 'bases', 3, 4, 5, 6, 7, 'final'];

/**
 * Une question : « Moi », puis « Chez l'autre, ça compte pour vous ? », puis, seulement si ça compte,
 * « Ce que vous cherchez chez l'autre », pré-coché avec sa propre réponse.
 */
function QuestionBlock({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: Answer | undefined;
  onChange: (a: Answer) => void;
}) {
  const a: Answer = value ?? {
    mine: q.kind === 'tags' ? [] : '',
    accepted: [],
    importance: (q.defaultImportance ?? -1) as Importance, // -1 = pas encore choisi
  };
  const opts = q.options ?? [];
  const mineList = Array.isArray(a.mine) ? a.mine : [String(a.mine)];
  const accepted = Array.isArray(a.accepted) ? a.accepted : [];
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const importanceChoices = IMPORTANCE_CHOICES.filter((c) => q.maxImportance === undefined || c.value <= q.maxImportance);

  const set = (patch: Partial<Answer>) => {
    const next: Answer = { ...a, ...patch, skipped: false };
    if (q.kind === 'compat') {
      const acc = Array.isArray(next.accepted) ? next.accepted : [];
      const mine = typeof next.mine === 'string' ? next.mine : '';
      // Pré-cochage : la réponse « Moi » est proposée par défaut chez l'autre.
      if ('mine' in patch && mine && (acc.length === 0 || (acc.length === 1 && acc[0] === a.mine))) next.accepted = [mine];
      if ('importance' in patch && next.importance > 0 && acc.length === 0 && mine) next.accepted = [mine];
    }
    onChange(next);
  };

  return (
    <View style={styles.question}>
      <Serif size={24}>{q.label}</Serif>
      {q.sensitive && (
        <Muted style={{ fontSize: 12 }}>Facultatif. Jamais affiché sur votre profil ni dans un résumé de match.</Muted>
      )}

      {q.kind === 'range' ? (
        <>
          <Label>Moi</Label>
          <TextInput
            keyboardType="number-pad"
            placeholder="Taille en cm"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Ma taille en centimètres"
            value={typeof a.mine === 'number' && a.mine > 0 ? String(a.mine) : ''}
            onChangeText={(t) => set({ mine: Number(t.replace(/\D/g, '')) || 0 })}
            style={styles.input}
          />
        </>
      ) : (
        <>
          <Label>{q.kind === 'tags' ? 'Moi (plusieurs choix)' : 'Moi'}</Label>
          <View style={styles.chips}>
            {opts.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={mineList.includes(o.value) && !a.skipped}
                onPress={() => set({ mine: q.kind === 'tags' ? toggle(mineList.filter(Boolean), o.value) : o.value })}
              />
            ))}
            {q.sensitive && (
              <Chip label="Je préfère ne pas répondre" selected={!!a.skipped} onPress={() => onChange({ ...a, skipped: true })} />
            )}
          </View>
        </>
      )}

      {!a.skipped && (
        <>
          <Label>{q.kind === 'tags' ? 'Je veux quelqu’un qui partage cette passion' : 'Chez l’autre, ça compte pour vous ?'}</Label>
          <View style={styles.chips}>
            {(q.kind === 'tags' ? SHARE_LEVELS : importanceChoices).map((c) => (
              <Chip key={c.label} label={c.label} selected={a.importance === c.value} onPress={() => set({ importance: c.value })} />
            ))}
          </View>

          {a.importance > 0 && q.kind === 'compat' && (
            <>
              <Label>Ce que vous cherchez chez l’autre</Label>
              <View style={styles.chips}>
                {opts.map((o) => (
                  <Chip key={o.value} label={o.label} selected={accepted.includes(o.value)} onPress={() => set({ accepted: toggle(accepted, o.value) })} />
                ))}
              </View>
            </>
          )}

          {a.importance > 0 && q.kind === 'range' && (
            <>
              <Label>Ce que vous cherchez chez l’autre (cm)</Label>
              <View style={{ flexDirection: 'row', gap: space.s }}>
                {(['min', 'max'] as const).map((k) => {
                  const r = !Array.isArray(a.accepted) && a.accepted ? a.accepted : { min: 160, max: 195 };
                  return (
                    <TextInput
                      key={k}
                      keyboardType="number-pad"
                      accessibilityLabel={k === 'min' ? 'Taille minimum' : 'Taille maximum'}
                      placeholder={k === 'min' ? 'Min' : 'Max'}
                      placeholderTextColor={colors.muted}
                      value={String(r[k])}
                      onChangeText={(t) => set({ accepted: { ...r, [k]: Number(t.replace(/\D/g, '')) || 0 } })}
                      style={[styles.input, { flex: 1 }]}
                    />
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

/**
 * Deux usages :
 * - inscription (par défaut) : toutes les étapes, de la vérification aux critères déterminants ;
 * - modification (?mode=edit&step=…) depuis « Mes réponses » : une seule étape, préremplie.
 */
export default function Onboarding() {
  const params = useLocalSearchParams<{ step?: string; mode?: string }>();
  const edit = params.mode === 'edit';
  const initialStep = params.step === 'final' ? STEPS.length - 1 : Math.max(0, Number(params.step ?? 0) || 0);
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => (edit ? structuredClone(ME.answers) : {}));
  const [firstName, setFirstName] = useState(edit ? ME.firstName : '');
  const [gender, setGender] = useState<string | null>(edit ? 'Homme' : null);
  const [seeking, setSeeking] = useState<string[]>(edit ? ['Femmes'] : []);
  const [ageMin, setAgeMin] = useState(String(edit ? ME.ageRange.min : 30));
  const [ageMax, setAgeMax] = useState(String(edit ? ME.ageRange.max : 40));
  const [zone, setZone] = useState<string | null>(edit ? ME.zone : null);
  const [distance, setDistance] = useState<string | null>(edit ? 'Tout Paris' : null);
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(edit ? ME.lookingFor : null);
  const [determinants, setDeterminants] = useState<string[]>(edit ? [...ME.determinants] : []);
  const [prompts, setPrompts] = useState<Record<string, string>>(() =>
    edit ? Object.fromEntries(ME.prompts.map((p) => [p.question, p.answer])) : {},
  );
  const scroll = useRef<ScrollView>(null);

  const step = STEPS[stepIndex];
  const questions = typeof step === 'number' ? QUESTIONS.filter((q) => q.step === step) : [];
  const [showAllDet, setShowAllDet] = useState(false);
  const [detHint, setDetHint] = useState('');
  const isAnswered = (id: string) => {
    const a = answers[id];
    return !!a && !a.skipped && (Array.isArray(a.mine) ? a.mine.length > 0 : !!a.mine);
  };
  /** Choisir ou retirer un critère déterminant (3 au maximum, parmi toutes les questions de compatibilité). */
  const toggleDeterminant = (q: Question) => {
    if (determinants.includes(q.id)) {
      setDeterminants((d) => d.filter((x) => x !== q.id));
      if (answers[q.id]?.importance === IMPORTANCE.determinant)
        setAnswers((s) => ({ ...s, [q.id]: { ...s[q.id], importance: IMPORTANCE.tresImportant } }));
      setDetHint('');
      return;
    }
    if (!isAnswered(q.id)) return setDetHint(`Répondez d’abord à « ${q.label} ».`);
    if (determinants.length >= 3) return setDetHint('Trois critères maximum : retirez-en un pour en choisir un autre.');
    setDeterminants((d) => [...d, q.id]);
    // Un critère déterminant passe en « Déterminant », avec sa propre réponse pré-cochée si rien n'est choisi.
    setAnswers((s) => {
      const a = s[q.id];
      const accepted = Array.isArray(a.accepted) && a.accepted.length === 0 && typeof a.mine === 'string' ? [a.mine] : a.accepted;
      return { ...s, [q.id]: { ...a, importance: IMPORTANCE.determinant, accepted } };
    });
    setDetHint('');
  };
  const detChip = (q: Question) => (
    <View key={q.id} style={{ opacity: isAnswered(q.id) ? 1 : 0.45 }}>
      <Chip label={q.label} selected={determinants.includes(q.id)} onPress={() => toggleDeterminant(q)} />
    </View>
  );

  // Estimation du vivier : en production, requête serveur sur les vrais profils de la zone.
  const pool = useMemo(() => Math.max(0, Math.round(1200 * Math.pow(0.55, determinants.length))), [determinants]);

  const go = (delta: number) => {
    const next = stepIndex + delta;
    if (next < 0) return router.back();
    if (next >= STEPS.length) {
      // TODO backend : enregistrer profil + réponses, puis ouvrir le paiement (20 €/mois).
      return router.back();
    }
    setStepIndex(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const title =
    step === 'verification'
      ? 'Vérification'
      : step === 'bases'
        ? 'Les bases'
        : step === 'final'
          ? edit
            ? 'Critères déterminants'
            : 'Votre profil'
          : STEP_TITLES[step];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Muted>{edit ? 'Mes réponses' : `Étape ${stepIndex + 1} / ${STEPS.length}`}</Muted>
        <Button variant="text" label={edit ? 'Annuler' : 'Fermer'} onPress={() => router.back()} style={{ height: 36 }} />
      </View>
      {!edit && (
        <View style={{ paddingHorizontal: space.xl }}>
          <ProgressBar value={(stepIndex + 1) / STEPS.length} />
        </View>
      )}

      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Serif size={40}>{title}</Serif>

        {step === 'verification' && (
          <View style={{ gap: space.l }}>
            <Body style={{ color: colors.inkSoft }}>
              Aucun profil n’entre dans un reveal sans ces deux vérifications. C’est notre promesse : 100 % de vrais profils.
            </Body>
            {[
              ['smartphone', 'Numéro de téléphone', 'Un code par SMS. Un numéro, un compte.'],
              ['video', 'Selfie vidéo de vérification', 'Quelques mouvements de tête, comparés à vos photos. La vidéo est supprimée après contrôle.'],
            ].map(([icon, t, d]) => (
              <View key={t} style={styles.verif}>
                <Feather name={icon as 'video'} size={22} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Body style={{ fontFamily: fonts.sansBold }}>{t}</Body>
                  <Muted>{d}</Muted>
                </View>
              </View>
            ))}
            <Muted style={{ fontSize: 12 }}>
              Prototype : la vérification sera branchée sur un prestataire (SMS + détection du vivant). L’inscription et le questionnaire sont gratuits ; l’abonnement démarre au premier reveal.
            </Muted>
          </View>
        )}

        {step === 'bases' && (
          <View style={{ gap: space.xl }}>
            <View style={styles.question}>
              <Label>Prénom</Label>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder="Votre prénom" placeholderTextColor={colors.muted} accessibilityLabel="Prénom" style={styles.input} />
            </View>
            <View style={styles.question}>
              <Label>Je suis</Label>
              <View style={styles.chips}>
                {['Femme', 'Homme', 'Non-binaire'].map((g) => (
                  <Chip key={g} label={g} selected={gender === g} onPress={() => setGender(g)} />
                ))}
              </View>
              <Label>Je cherche</Label>
              <View style={styles.chips}>
                {['Femmes', 'Hommes', 'Personnes non-binaires'].map((g) => (
                  <Chip key={g} label={g} selected={seeking.includes(g)} onPress={() => setSeeking((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]))} />
                ))}
              </View>
            </View>
            <View style={styles.question}>
              <Label>Tranche d’âge recherchée</Label>
              <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
                <TextInput value={ageMin} onChangeText={setAgeMin} keyboardType="number-pad" accessibilityLabel="Âge minimum" style={[styles.input, { flex: 1 }]} />
                <Muted>à</Muted>
                <TextInput value={ageMax} onChangeText={setAgeMax} keyboardType="number-pad" accessibilityLabel="Âge maximum" style={[styles.input, { flex: 1 }]} />
                <Muted>ans</Muted>
              </View>
            </View>
            <View style={styles.question}>
              <Label>Où j’habite</Label>
              <View style={styles.chips}>
                {ARRONDISSEMENTS.map((z) => (
                  <Chip key={z} label={z.replace('Paris ', '')} selected={zone === z} onPress={() => setZone(z)} />
                ))}
              </View>
              <Label>Distance maximale</Label>
              <View style={styles.chips}>
                {DISTANCES.map((d) => (
                  <Chip key={d} label={d} selected={distance === d} onPress={() => setDistance(d)} />
                ))}
              </View>
            </View>
            {QUESTIONS.filter((q) => q.step === 2).map((q) => (
              <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(a) => setAnswers((s) => ({ ...s, [q.id]: a }))} />
            ))}
          </View>
        )}

        {typeof step === 'number' && step > 2 && (
          <View style={{ gap: space.xxl }}>
            {questions.map((q) => (
              <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(a) => setAnswers((s) => ({ ...s, [q.id]: a }))} />
            ))}
          </View>
        )}

        {step === 'final' && (
          <View style={{ gap: space.xxl }}>
            {!edit && (
            <View style={styles.question}>
              <Serif size={24}>Votre bio (facultatif)</Serif>
              <Muted>Quelques sujets pour démarrer. Vous pourrez écrire librement ou tout modifier plus tard dans « Mon profil ».</Muted>
              <View style={styles.chips}>
                {PROMPTS.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    selected={p in prompts}
                    onPress={() =>
                      setPrompts((s) => {
                        if (p in s) {
                          const { [p]: _removed, ...rest } = s;
                          return rest;
                        }
                        return Object.keys(s).length >= 3 ? s : { ...s, [p]: '' };
                      })
                    }
                  />
                ))}
              </View>
              {Object.keys(prompts).map((p) => (
                <View key={p} style={{ gap: 6 }}>
                  <Muted style={{ fontSize: 12 }}>{p}</Muted>
                  <TextInput
                    multiline
                    maxLength={300}
                    accessibilityLabel={p}
                    value={prompts[p]}
                    onChangeText={(t) => setPrompts((s) => ({ ...s, [p]: t }))}
                    style={[styles.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                  />
                </View>
              ))}
            </View>
            )}

            <View style={styles.question}>
              <Serif size={24}>Je cherche plutôt quelqu’un…</Serif>
              <View style={styles.chips}>
                {(
                  [
                    ['similaire', 'Qui me ressemble'],
                    ['complementaire', 'De complémentaire'],
                    ['les-deux', 'Un peu des deux'],
                  ] as const
                ).map(([v, l]) => (
                  <Chip key={v} label={l} selected={lookingFor === v} onPress={() => setLookingFor(v)} />
                ))}
              </View>
              <Muted style={{ fontSize: 12 }}>
                Joue sur vos passions et votre personnalité. Vos valeurs et votre projet de vie restent toujours comparés sur la compatibilité.
              </Muted>
            </View>

            <View style={styles.question}>
              <Serif size={24}>Vos critères déterminants</Serif>
              <Muted>Jusqu’à trois questions, choisies parmi toutes. Un profil qui n’y correspond pas ne vous sera jamais proposé.</Muted>
              <Label>{determinants.length} / 3 choisis</Label>
              <Label>Les plus souvent décisifs</Label>
              <View style={styles.chips}>{SUGGESTED_DETERMINANTS.map((id) => detChip(QUESTIONS.find((q) => q.id === id)!))}</View>
              <Button
                variant="text"
                label={showAllDet ? 'Masquer les autres questions' : 'Choisir parmi toutes les questions'}
                onPress={() => setShowAllDet((v) => !v)}
                style={{ height: 40, alignItems: 'flex-start' }}
              />
              {showAllDet &&
                [2, 3, 4, 6, 7].map((st) => {
                  const qs = QUESTIONS.filter((q) => q.step === st && canBeDeterminant(q) && !SUGGESTED_DETERMINANTS.includes(q.id));
                  return qs.length ? (
                    <View key={st} style={{ gap: space.s }}>
                      <Label>{STEP_TITLES[st]}</Label>
                      <View style={styles.chips}>{qs.map(detChip)}</View>
                    </View>
                  ) : null;
                })}
              {!!detHint && <Muted style={{ color: colors.accent }}>{detHint}</Muted>}
              <View style={styles.pool}>
                <Body>
                  Environ <Body style={{ fontFamily: fonts.sansBold }}>{pool}</Body> profils compatibles à Paris
                </Body>
                {pool < 150 && <Muted style={{ color: colors.accent }}>C’est peu : vos matchs risquent d’être moins nombreux.</Muted>}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {edit ? (
          // TODO backend : enregistrer les réponses modifiées (table answers) ; elles comptent dès le prochain reveal.
          <Button label="Enregistrer" onPress={() => router.back()} style={{ flex: 1 }} />
        ) : (
          <>
            <Button variant="ghost" label="Retour" onPress={() => go(-1)} style={{ flex: 1 }} />
            <Button label={step === 'final' ? 'Terminer' : 'Continuer'} onPress={() => go(1)} style={{ flex: 2 }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.xl, paddingTop: space.s, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { padding: space.xl, paddingBottom: 48, gap: space.xl },
  question: { gap: space.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    backgroundColor: colors.input,
    paddingHorizontal: space.l,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  verif: { flexDirection: 'row', gap: space.m, alignItems: 'center', padding: space.l, backgroundColor: colors.card, borderRadius: radius.s },
  pool: { padding: space.l, backgroundColor: colors.card, borderRadius: radius.s, gap: 4 },
  footer: {
    flexDirection: 'row',
    gap: space.m,
    padding: space.l,
    paddingHorizontal: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
