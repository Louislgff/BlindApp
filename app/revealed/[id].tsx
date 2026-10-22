import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Magazine } from '../../src/components/Magazine';
import { Body, Button } from '../../src/components/ui';
import { ME, PROFILES_BY_ID } from '../../src/data/mock';
import { DEMO_PHOTOS } from '../../src/data/photos';
import { QUESTIONS } from '../../src/data/questions';
import { usePhotoProtection } from '../../src/hooks/usePhotoProtection';
import { buildSummary } from '../../src/matching/summary';
import { useStore } from '../../src/state/store';
import { colors, space } from '../../src/theme';

// Profil d'un match après le reveal mutuel, au format magazine.
export default function RevealedProfile() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const p = PROFILES_BY_ID.get(id);
  const { width } = useWindowDimensions();
  const { conversationFor } = useStore();
  const appear = useRef(new Animated.Value(fresh ? 0 : 1)).current;

  usePhotoProtection(`revealed-${id}`);

  useEffect(() => {
    if (fresh) Animated.timing(appear, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
  }, [fresh, appear]);

  if (!p) return null;
  const c = conversationFor(p.id);
  const s = buildSummary(ME, p, QUESTIONS);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: appear }}>
          <Magazine
            name={p.firstName}
            age={p.age}
            facts={`${p.job} · ${p.zone}`}
            photos={DEMO_PHOTOS[p.id] ?? []}
            count={p.photos}
            width={width}
            score={s.score}
            date={c?.revealedOn ?? '18 octobre'}
            music={p.music}
            prompts={p.prompts}
            common={s.common}
            viewer={`${ME.firstName.toLowerCase()}#${ME.id}`}
            onBack={() => router.back()}
          />

          <View style={styles.section}>
            <Button label="Reprendre la conversation" onPress={() => router.push(`/conversation/${p.id}`)} />
            {!c?.metOn && (
              <Button variant="ghost" label="Nous nous sommes rencontrés" onPress={() => router.push(`/debrief/${p.id}?met=1`)} />
            )}
            <View style={styles.lock}>
              <Feather name="lock" size={14} color={colors.muted} />
              <Body style={{ fontSize: 12, color: colors.muted }}>Captures d’écran bloquées sur les photos</Body>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: space.xl, paddingTop: 28, gap: space.m },
  lock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: space.s },
});
