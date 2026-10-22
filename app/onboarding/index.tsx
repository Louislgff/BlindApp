import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Chip, Label, Muted, Serif } from '../../src/components/ui';
import { ME } from '../../src/data/mock';
import { canBeDeterminant, IMPORTANCE_CHOICES, QUESTIONS, REVEAL_ESSENTIALS, STEP_TITLES, SUGGESTED_DETERMINANTS } from '../../src/data/questions';
import { ARRONDISSEMENTS, COMMUNES, DISTANCES } from '../../src/data/zones';
import { IMPORTANCE, type Answer, type Gender, type Importance, type LookingFor, type Question } from '../../src/matching/types';
import { isDone, progress } from '../../src/onboarding/progress';
import { useAccount } from '../../src/state/account';
import { colors, fonts, radius, space } from '../../src/theme';

// Questionnaire d'inscription.
// Parcours : les bases → les questions essentielles (2 pages) → « Vous êtes dans le prochain reveal »
// → les autres questions pour affiner (facultatives, reprenables plus tard) → bio et critères déterminants.
// Connecté : chaque page est enregistrée dans Supabase. Sans connexion : mode démo, rien n'est enregistré.

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
const GENDERS: [Gender, string, string][] = [
  ['femme', 'Femme', 'Femmes'],
  ['homme', 'Homme', 'Hommes'],
  ['non-binaire', 'Non-binaire', 'Personnes non-binaires'],
];

type StepId = 'verification' | 'bases' | 'ess1' | 'ess2' | 'pret' | number | 'final';

// Les questions essentielles (hors « type de relation », posée avec les bases), en deux pages.
const ESSENTIALS = REVEAL_ESSENTIALS.filter((id) => QUESTIONS.find((q) => q.id === id)?.step !== 2);
const ESS_PAGES: Record<'ess1' | 'ess2', string[]> = {
  ess1: ESSENTIALS.slice(0, Math.ceil(ESSENTIALS.length / 2)),
  ess2: ESSENTIALS.slice(Math.ceil(ESSENTIALS.length / 2)),
};
/** Questions d'une étape « pour affiner » : celles de l'étape, sauf les essentielles déjà posées. */
const refineQuestions = (step: number) => QUESTIONS.filter((q) => q.step === step && !REVEAL_ESSENTIALS.includes(q.id));
const REFINE_STEPS = [3, 4, 5, 6, 7].filter((s) => refineQuestions(s).length > 0);
const SIGNUP: StepId[] = ['bases', 'ess1', 'ess2', 'pret', ...REFINE_STEPS, 'final'];

function questionsOf(step: StepId, edit: boolean): Question[] {
  if (step === 'bases') return QUESTIONS.filter((q) => q.step === 2);
  if (step === 'ess1' || step === 'ess2') return ESS_PAGES[step].map((id) => QUESTIONS.find((q) => q.id === id)!);
  if (typeof step === 'number') return edit ? QUESTIONS.filter((q) => q.step === step) : refineQuestions(step);
  return [];
}

function parseBirth(d: string, m: string, y: string): string | null {
  const day = Number(d), month = Number(m), year = Number(y);
  if (!day || !month || year < 1900) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function ageFrom(iso: string): number {
  const b = new Date(iso), n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

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
 * - inscription (par défaut) : reprend là où on s'était arrêté ;
 * - modification (?mode=edit&step=bases|3…7|final) depuis « Mes réponses » : une seule étape, préremplie.
 */
export default function Onboarding() {
  const params = useLocalSearchParams<{ step?: string; mode?: string }>();
  const edit = params.mode === 'edit';
  const account = useAccount();
  const real = !!account.session;
  const demoEdit = edit && !real;

  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    real ? structuredClone(account.answers) : demoEdit ? structuredClone(ME.answers) : {},
  );
  const b = account.basics;
  const [firstName, setFirstName] = useState(b?.firstName ?? (demoEdit ? ME.firstName : ''));
  const [birth, setBirth] = useState(() => {
    const [y = '', m = '', d = ''] = (b?.birthDate ?? '').split('-');
    return { d, m, y };
  });
  const [gender, setGender] = useState<Gender | null>(b?.gender ?? (demoEdit ? 'homme' : null));
  const [seeking, setSeeking] = useState<Gender[]>(b?.seeking ?? (demoEdit ? ['femme'] : []));
  const [ageMin, setAgeMin] = useState(String(b?.ageMin ?? (demoEdit ? ME.ageRange.min : 30)));
  const [ageMax, setAgeMax] = useState(String(b?.ageMax ?? (demoEdit ? ME.ageRange.max : 40)));
  const [zone, setZone] = useState<string | null>(b?.zone ?? (demoEdit ? ME.zone : null));
  const [distanceKm, setDistanceKm] = useState<number | null>(b?.maxDistanceKm ?? (demoEdit ? 10 : null));
  const x = account.extras;
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(x?.lookingFor ?? (demoEdit ? ME.lookingFor : null));
  const [determinants, setDeterminants] = useState<string[]>(x?.determinants ?? (demoEdit ? [...ME.determinants] : []));
  const [prompts, setPrompts] = useState<Record<string, string>>(() =>
    Object.fromEntries((x?.prompts ?? (demoEdit ? ME.prompts : [])).map((p) => [p.question, p.answer])),
  );

  const steps: StepId[] = edit
    ? [params.step === 'final' ? 'final' : params.step === 'bases' ? 'bases' : Number(params.step) || 3]
    : real ? SIGNUP : ['verification', ...SIGNUP];

  // Reprise : connecté, on repart de la première page incomplète.
  const [stepIndex, setStepIndex] = useState(() => {
    if (edit || !real) return 0;
    const i = SIGNUP.findIndex((s) =>
      s === 'bases' ? !account.basics : s === 'pret' ? false : s === 'final' ? true : !questionsOf(s, false).every((q) => isDone(account.answers[q.id])),
    );
    return Math.max(0, i);
  });
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const step = steps[stepIndex];
  const questions = questionsOf(step, edit);
  const birthDate = parseBirth(birth.d, birth.m, birth.y);
  const basicsDone = !!account.basics || (!!firstName.trim() && !!birthDate && !!gender && seeking.length > 0 && !!zone && !!distanceKm);
  const prog = progress(answers, basicsDone);

  const [showAllDet, setShowAllDet] = useState(false);
  /** Choisir ou retirer un critère déterminant (3 au maximum, parmi toutes les questions de compatibilité). */
  const toggleDeterminant = (q: Question) => {
    if (determinants.includes(q.id)) {
      setDeterminants((d) => d.filter((v) => v !== q.id));
      if (answers[q.id]?.importance === IMPORTANCE.determinant)
        setAnswers((s) => ({ ...s, [q.id]: { ...s[q.id], importance: IMPORTANCE.tresImportant } }));
      setHint('');
      return;
    }
    if (!isDone(answers[q.id]) || answers[q.id]?.skipped) return setHint(`Répondez d’abord à « ${q.label} ».`);
    if (determinants.length >= 3) return setHint('Trois critères maximum : retirez-en un pour en choisir un autre.');
    setDeterminants((d) => [...d, q.id]);
    // Un critère déterminant passe en « Déterminant », avec sa propre réponse pré-cochée si rien n'est choisi.
    setAnswers((s) => {
      const a = s[q.id];
      const accepted = Array.isArray(a.accepted) && a.accepted.length === 0 && typeof a.mine === 'string' ? [a.mine] : a.accepted;
      return { ...s, [q.id]: { ...a, importance: IMPORTANCE.determinant, accepted } };
    });
    setHint('');
  };
  const detChip = (q: Question) => (
    <View key={q.id} style={{ opacity: isDone(answers[q.id]) ? 1 : 0.45 }}>
      <Chip label={q.label} selected={determinants.includes(q.id)} onPress={() => toggleDeterminant(q)} />
    </View>
  );

  // Estimation du vivier : en production, requête serveur sur les vrais profils de la zone.
  const pool = useMemo(() => Math.max(0, Math.round(1200 * Math.pow(0.55, determinants.length))), [determinants]);

  /** Ce qui empêche de passer à la suite (message), ou '' si tout est bon. */
  const blocking = (): string => {
    if (step === 'bases') {
      if (!firstName.trim()) return 'Indiquez votre prénom.';
      if (!birthDate) return 'Indiquez votre date de naissance (jour, mois, année).';
      if (ageFrom(birthDate) < 18) return 'Blind est réservé aux personnes majeures.';
      if (!gender || !seeking.length) return 'Dites-nous qui vous êtes et qui vous cherchez.';
      const min = Number(ageMin), max = Number(ageMax);
      if (!(min >= 18 && max >= min && max <= 99)) return 'Vérifiez la tranche d’âge recherchée.';
      if (!zone || !distanceKm) return 'Choisissez votre quartier et la distance.';
    }
    if (step === 'bases' || step === 'ess1' || step === 'ess2') {
      const missing = questions.filter((q) => !isDone(answers[q.id])).length;
      if (missing) return `Encore ${missing} question${missing > 1 ? 's' : ''} sur cette page : elles comptent pour entrer dans le reveal.`;
    }
    return '';
  };

  /** Enregistre la page en cours (connecté seulement). */
  const save = async (): Promise<string | null> => {
    if (!real) return null;
    const subset = Object.fromEntries(questions.map((q) => [q.id, answers[q.id]]).filter(([, a]) => a)) as Record<string, Answer>;
    if (step === 'bases') {
      const err = await account.saveBasics({
        firstName, birthDate: birthDate!, gender: gender!, seeking, ageMin: Number(ageMin), ageMax: Number(ageMax), zone: zone!, maxDistanceKm: distanceKm!,
      });
      if (err) return err;
    }
    if (step === 'final') {
      const err = await account.saveExtras({
        lookingFor: lookingFor ?? 'les-deux',
        determinants,
        prompts: Object.entries(prompts).map(([question, answer]) => ({ question, answer })),
      });
      if (err) return err;
      // Les critères déterminants changent l'importance de certaines réponses.
      return account.saveAnswers(Object.fromEntries(determinants.map((id) => [id, answers[id]]).filter(([, a]) => a)));
    }
    return account.saveAnswers(subset);
  };

  const finish = () => (real && !edit ? router.replace('/') : router.back());

  const go = async (delta: number) => {
    setHint('');
    if (delta > 0) {
      const why = blocking();
      if (why) return setHint(why);
      setBusy(true);
      const err = await save();
      setBusy(false);
      if (err) return setHint(err);
    }
    const next = stepIndex + delta;
    if (next < 0) return router.back();
    if (next >= steps.length) return finish();
    setStepIndex(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const later = async () => {
    setBusy(true);
    const err = await save();
    setBusy(false);
    if (err) return setHint(err);
    finish();
  };

  const title =
    step === 'verification' ? 'Vérification'
      : step === 'bases' ? 'Les bases'
      : step === 'ess1' ? 'L’essentiel'
      : step === 'ess2' ? 'L’essentiel, suite'
      : step === 'pret' ? 'Vous êtes dans le prochain reveal'
      : step === 'final' ? (edit ? 'Critères déterminants' : 'Votre profil')
      : STEP_TITLES[step];

  const progressLabel = prog.ready
    ? prog.done === prog.total ? 'Questionnaire complet' : `Prêt pour le reveal · encore ~${prog.minutesLeft} min pour affiner`
    : `Prêt pour le reveal dans ~${prog.minutesLeft} min`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Muted>{edit ? 'Mes réponses' : progressLabel}</Muted>
        <Button variant="text" label={edit ? 'Annuler' : 'Fermer'} onPress={() => router.back()} style={{ height: 36 }} />
      </View>
      {!edit && <ReadyBar ratio={prog.ratio} mark={prog.readyMark} ready={prog.ready} />}

      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Serif size={40} style={{ lineHeight: 44 }}>{title}</Serif>

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
              Démo : rien n’est enregistré. Pour un vrai compte, utilisez « Créer mon compte » depuis l’accueil. L’inscription et le questionnaire sont gratuits ; l’abonnement démarre au premier reveal.
            </Muted>
          </View>
        )}

        {(step === 'ess1' || step === 'ess2') && (
          <Muted>
            Les questions qui comptent le plus pour vos matchs. Une fois répondues, vous êtes dans le prochain reveal.
          </Muted>
        )}

        {step === 'bases' && (
          <View style={{ gap: space.xl }}>
            <View style={styles.question}>
              <Label>Prénom</Label>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder="Votre prénom" placeholderTextColor={colors.muted} accessibilityLabel="Prénom" autoComplete="given-name" style={styles.input} />
              <Label>Date de naissance</Label>
              <View style={{ flexDirection: 'row', gap: space.s }}>
                {(
                  [
                    ['d', 'JJ', 2, 'Jour'],
                    ['m', 'MM', 2, 'Mois'],
                    ['y', 'AAAA', 4, 'Année'],
                  ] as const
                ).map(([k, ph, len, label]) => (
                  <TextInput
                    key={k}
                    value={birth[k]}
                    onChangeText={(t) => setBirth((s) => ({ ...s, [k]: t.replace(/\D/g, '').slice(0, len) }))}
                    placeholder={ph}
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    accessibilityLabel={`${label} de naissance`}
                    style={[styles.input, { flex: len === 4 ? 1.6 : 1, textAlign: 'center' }]}
                  />
                ))}
              </View>
              <Muted style={{ fontSize: 12 }}>Seul votre âge est affiché.</Muted>
            </View>
            <View style={styles.question}>
              <Label>Je suis</Label>
              <View style={styles.chips}>
                {GENDERS.map(([v, l]) => (
                  <Chip key={v} label={l} selected={gender === v} onPress={() => setGender(v)} />
                ))}
              </View>
              <Label>Je cherche</Label>
              <View style={styles.chips}>
                {GENDERS.map(([v, , l]) => (
                  <Chip key={v} label={l} selected={seeking.includes(v)} onPress={() => setSeeking((s) => (s.includes(v) ? s.filter((g) => g !== v) : [...s, v]))} />
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
                  <Chip key={z.zone} label={z.zone.replace('Paris ', '')} selected={zone === z.zone} onPress={() => setZone(z.zone)} />
                ))}
              </View>
              <View style={styles.chips}>
                {COMMUNES.map((z) => (
                  <Chip key={z.zone} label={z.zone} selected={zone === z.zone} onPress={() => setZone(z.zone)} />
                ))}
              </View>
              <Label>Distance maximale</Label>
              <View style={styles.chips}>
                {DISTANCES.map((d) => (
                  <Chip key={d.label} label={d.label} selected={distanceKm === d.km} onPress={() => setDistanceKm(d.km)} />
                ))}
              </View>
            </View>
            {questions.map((q) => (
              <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(a) => setAnswers((s) => ({ ...s, [q.id]: a }))} />
            ))}
          </View>
        )}

        {(step === 'ess1' || step === 'ess2' || typeof step === 'number') && (
          <View style={{ gap: space.xxl }}>
            {questions.map((q) => (
              <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={(a) => setAnswers((s) => ({ ...s, [q.id]: a }))} />
            ))}
          </View>
        )}

        {step === 'pret' && (
          <View style={{ gap: space.l }}>
            <Body style={{ color: colors.inkSoft }}>
              Vos réponses essentielles sont enregistrées. Il reste la vérification par selfie et l’abonnement, qui ne démarre qu’au premier reveal.
            </Body>
            <View style={styles.verif}>
              <Feather name="trending-up" size={22} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Body style={{ fontFamily: fonts.sansBold }}>Plus vous répondez, plus vos % sont fiables</Body>
                <Muted>
                  Encore {prog.total - prog.done} questions (~{prog.minutesLeft} min) sur vos passions, votre physique et votre personnalité. Maintenant ou plus tard, depuis votre profil.
                </Muted>
              </View>
            </View>
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

      {!!hint && (
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.s }}>
          <Muted style={{ color: colors.accent }}>{hint}</Muted>
        </View>
      )}
      <View style={styles.footer}>
        {edit ? (
          <Button
            label={busy ? 'Enregistrement…' : 'Enregistrer'}
            disabled={busy}
            onPress={async () => {
              const why = step === 'bases' ? blocking() : '';
              if (why) return setHint(why);
              setBusy(true);
              const err = await save();
              setBusy(false);
              if (err) return setHint(err);
              router.back();
            }}
            style={{ flex: 1 }}
          />
        ) : step === 'pret' ? (
          <>
            <Button variant="ghost" label="Plus tard" onPress={later} disabled={busy} style={{ flex: 1 }} />
            <Button label="Affiner maintenant" onPress={() => go(1)} disabled={busy} style={{ flex: 2 }} />
          </>
        ) : (
          <>
            <Button variant="ghost" label="Retour" onPress={() => go(-1)} disabled={busy} style={{ flex: 1 }} />
            <Button label={busy ? 'Enregistrement…' : step === 'final' ? 'Terminer' : 'Continuer'} onPress={() => go(1)} disabled={busy} style={{ flex: 2 }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Barre de progression du questionnaire, avec le repère « Prêt pour le reveal ». */
function ReadyBar({ ratio, mark, ready }: { ratio: number; mark: number; ready: boolean }) {
  return (
    <View style={{ paddingHorizontal: space.xl, paddingTop: 4 }}>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.round(Math.min(1, ratio) * 100)}%` }]} />
        <View style={[styles.barMark, { left: `${Math.round(mark * 100)}%`, backgroundColor: ready ? colors.accent : colors.ink }]} />
      </View>
    </View>
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
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'visible', justifyContent: 'center' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: colors.accentFill },
  barMark: { position: 'absolute', width: 3, height: 14, marginLeft: -1.5, borderRadius: 2 },
  footer: {
    flexDirection: 'row',
    gap: space.m,
    padding: space.l,
    paddingHorizontal: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
