import { Feather } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { BackButton, Body, Button, Initial, Muted, ProgressBar, Screen, Serif } from '../../src/components/ui';
import { ME, PROFILES_BY_ID, REVEAL_THRESHOLD } from '../../src/data/mock';
import { DEMO_PHOTOS } from '../../src/data/photos';
import { QUESTIONS } from '../../src/data/questions';
import { computeMatch } from '../../src/matching/matching';
import { revealState, useStore } from '../../src/state/store';
import { colors, fonts, radius, space } from '../../src/theme';

export default function ConversationScreen() {
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const p = PROFILES_BY_ID.get(id);
  const { conversationFor, send, setReady } = useStore();
  const [text, setText] = useState(draft ?? '');
  const [later, setLater] = useState(false);
  const list = useRef<FlatList>(null);
  if (!p) return null;

  const c = conversationFor(p.id);
  const messages = c?.messages ?? [];
  const state = c ? revealState(c) : { kind: 'locked' as const, count: 0, total: REVEAL_THRESHOLD.total };
  const score = computeMatch(ME, p, QUESTIONS).score;

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    send(p.id, t);
    setText('');
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
  };

  const ready = () => {
    if (!c) return;
    const { revealed } = setReady(c.id, true);
    if (revealed) router.push({ pathname: '/revealed/[id]', params: { id: p.id, fresh: '1' } });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <BackButton />
          <Initial letter={p.initial} size={40} source={state.kind === 'revealed' ? DEMO_PHOTOS[p.id]?.[0] : undefined} />
          <Link href={state.kind === 'revealed' ? `/revealed/${p.id}` : `/match/${p.id}`} asChild>
            <Pressable accessibilityRole="link" style={{ flex: 1 }}>
              <Body style={{ fontFamily: fonts.sansBold, fontSize: 16 }}>{p.firstName}</Body>
              <Muted style={{ fontSize: 12 }}>
                {score} % · {state.kind === 'revealed' ? 'voir ses photos' : 'voir le résumé'}
              </Muted>
            </Pressable>
          </Link>
        </View>

        {state.kind === 'available' && later && c && (
          <Pressable accessibilityRole="button" onPress={() => setLater(false)} style={styles.lockBar}>
            <Feather name="eye-off" size={14} color={colors.accent} />
            <Muted style={{ flex: 1, fontSize: 12, color: colors.accent }}>Reveal disponible quand vous le souhaitez</Muted>
          </Pressable>
        )}

        {state.kind === 'available' && !later && c && (
          <View style={[styles.card, { borderColor: colors.accent }]}>
            <View style={styles.cardTitle}>
              <Serif size={22}>Reveal disponible</Serif>
              <Muted style={{ fontSize: 12 }}>10 / 10 messages</Muted>
            </View>
            <Body style={{ fontSize: 13, color: colors.inkSoft }}>
              Votre choix reste secret. Les photos apparaissent seulement quand vous êtes prêts tous les deux.
            </Body>
            <Button label="Je suis prêt à révéler mes photos" onPress={ready} style={{ height: 48 }} />
            <Button variant="text" label="Pas encore, on continue de discuter" onPress={() => setLater(true)} />
          </View>
        )}

        {state.kind === 'waiting' && c && (
          <View style={styles.card}>
            <Serif size={20}>Votre accord est enregistré</Serif>
            <Body style={{ fontSize: 13, color: colors.inkSoft }}>
              {p.firstName} ne le sait pas. Si elle dit oui aussi, vos photos apparaîtront en même temps.
            </Body>
            <Button variant="text" label="Retirer mon accord" onPress={() => setReady(c.id, false)} />
          </View>
        )}

        {state.kind === 'locked' && (
          <View style={styles.lockBar}>
            <Feather name="lock" size={14} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <ProgressBar value={state.count / state.total} color={colors.muted} />
            </View>
            <Muted style={{ fontSize: 12 }}>
              Reveal possible à {state.total} messages
            </Muted>
          </View>
        )}

        {state.kind === 'revealed' && c && !c.metOn && (
          <View style={styles.lockBar}>
            <Feather name="eye" size={14} color={colors.accent} />
            <Muted style={{ flex: 1, fontSize: 12 }}>{state.on}</Muted>
            <Link href={`/debrief/${p.id}?met=1`} asChild>
              <Pressable accessibilityRole="button" hitSlop={8}>
                <Muted style={{ color: colors.accent, fontSize: 12 }}>Nous nous sommes rencontrés</Muted>
              </Pressable>
            </Link>
          </View>
        )}

        {c?.metOn && !c.debriefDone && (
          <Link href={`/debrief/${p.id}`} asChild>
            <Pressable accessibilityRole="button" style={[styles.card, { borderColor: colors.accent }]}>
              <Serif size={20}>Comment s’est passée votre rencontre ?</Serif>
              <Muted>Une minute, et rien n’est partagé avec {p.firstName}.</Muted>
            </Pressable>
          </Link>
        )}

        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Muted style={{ textAlign: 'center', marginTop: 40 }}>
              Premier message à {p.firstName}. Elle ne voit pas encore vos photos, et vous non plus.
            </Muted>
          }
          renderItem={({ item }) => (
            <View style={item.from === 'me' ? styles.me : styles.them}>
              <Body style={{ color: item.from === 'me' ? colors.paper : colors.ink }}>{item.text}</Body>
            </View>
          )}
        />

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Écrire à ${p.firstName}…`}
            placeholderTextColor={colors.muted}
            accessibilityLabel="Votre message"
            style={styles.input}
            multiline
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Envoyer" onPress={submit} style={styles.send}>
            <Feather name="arrow-right" size={20} color={colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.m,
    paddingBottom: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  card: { margin: space.l, marginBottom: 0, padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: radius.m, gap: 10 },
  cardTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lockBar: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.l, paddingVertical: space.m },
  messages: { padding: space.l, gap: 10, flexGrow: 1, justifyContent: 'flex-end' },
  me: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    backgroundColor: colors.ink,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  them: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    backgroundColor: colors.card,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    padding: space.m,
    paddingHorizontal: space.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
});
