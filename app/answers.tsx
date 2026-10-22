import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackButton, Body, Divider, Muted, Screen, Serif } from '../src/components/ui';
import { ME } from '../src/data/mock';
import { QUESTIONS, STEP_TITLES } from '../src/data/questions';
import type { Answer } from '../src/matching/types';
import { isDone } from '../src/onboarding/progress';
import { useAccount } from '../src/state/account';
import { colors, space } from '../src/theme';

// « Mes réponses » : chaque partie du questionnaire, modifiable séparément.
// `step` = étape ouverte dans le questionnaire (app/onboarding/index.tsx) : « bases », 3 à 7 ou « final ».
const SECTIONS: { title: string; step: string; questionSteps?: number[]; detail?: string }[] = [
  { title: 'Les bases', step: 'bases', questionSteps: [2], detail: 'Genre, âge, quartier, ce que vous cherchez' },
  { title: STEP_TITLES[3], step: '3', questionSteps: [3] },
  { title: STEP_TITLES[4], step: '4', questionSteps: [4] },
  { title: STEP_TITLES[5], step: '5', questionSteps: [5] },
  { title: STEP_TITLES[6], step: '6', questionSteps: [6] },
  { title: STEP_TITLES[7], step: '7', questionSteps: [7] },
  { title: 'Critères déterminants', step: 'final' },
];

function count(steps: number[], answers: Record<string, Answer>) {
  const qs = QUESTIONS.filter((q) => steps.includes(q.step));
  const done = qs.filter((q) => isDone(answers[q.id])).length;
  return `${done} / ${qs.length}`;
}

export default function AnswersScreen() {
  const account = useAccount();
  const real = !!account.session;
  const answers = real ? account.answers : ME.answers;
  const n = real ? account.extras?.determinants.length ?? 0 : ME.determinants.length;
  return (
    <Screen scroll>
      <View style={{ paddingHorizontal: space.l, paddingTop: space.s }}>
        <BackButton />
      </View>
      <View style={{ paddingHorizontal: space.xl, gap: space.s }}>
        <Serif size={36}>Mes réponses</Serif>
        <Muted>Modifiez une réponse à tout moment. Les changements comptent dès le prochain reveal.</Muted>
      </View>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl }}>
        {SECTIONS.map((s) => {
          const sub = s.questionSteps
            ? `${s.detail ? s.detail + ' · ' : ''}${count(s.questionSteps, answers)}${s.detail ? '' : ' questions'}`
            : `${n} critère${n > 1 ? 's' : ''} déterminant${n > 1 ? 's' : ''}`;
          return (
            <View key={s.title}>
              <Divider />
              <Pressable
                accessibilityRole="button"
                style={styles.row}
                onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'edit', step: s.step } })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Body>{s.title}</Body>
                  <Muted style={{ fontSize: 12 }}>{sub}</Muted>
                </View>
                <Feather name="chevron-right" size={18} color={colors.muted} />
              </Pressable>
            </View>
          );
        })}
        <Divider />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: space.m },
});
