import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Body, Button, Divider, Initial, Label, Muted, NightTheme, Serif, SerifItalic } from '../src/components/ui';
import { ALREADY_SHOWN, ME, PROFILES, PROFILES_BY_ID } from '../src/data/mock';
import { QUESTIONS } from '../src/data/questions';
import { selectRevealBatch } from '../src/matching/matching';
import { fonts, night as colors, radius, space } from '../src/theme';

// Le reveal est une seule scène continue : compte à rebours, le paquet tombe, chaque carte vient
// au centre et se retourne, puis file dans la réserve ; à la fin, la liste classée apparaît.
// Aucun changement d'écran entre les étapes (sinon on a l'impression de faire défiler des slides).

type Phase = 'intro' | 'card' | 'final';
const CHIP = 44;
const CHIP_GAP = 12;
const MESS = [[0, 0, -2], [-7, 5, -9], [8, 9, 7], [-4, 13, -4], [9, 17, 11]];
const ease = Easing.bezier(0.2, 0.75, 0.2, 1);

interface CardAnim { x: Animated.Value; y: Animated.Value; rot: Animated.Value; scale: Animated.Value; opacity: Animated.Value; flip: Animated.Value; why: Animated.Value }
const makeCard = (): CardAnim => ({
  x: new Animated.Value(0), y: new Animated.Value(-2000), rot: new Animated.Value(0), scale: new Animated.Value(0.6),
  opacity: new Animated.Value(1), flip: new Animated.Value(0), why: new Animated.Value(0),
});

// Piste « Jour et nuit » : l'app est claire, mais le reveal de 20 h se joue de nuit.
export default function RevealDay() {
  return (
    <NightTheme>
      <StatusBar style="light" />
      <RevealScene />
    </NightTheme>
  );
}

function RevealScene() {
  const batch = useMemo(() => selectRevealBatch(ME, PROFILES, QUESTIONS, { alreadyShown: ALREADY_SHOWN }), []);
  const n = batch.length;
  const ranked = useMemo(() => [...batch].reverse(), [batch]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [played, setPlayed] = useState(false);
  const [clock, setClock] = useState('19:59:57');
  const [collected, setCollected] = useState(0);
  const [pct, setPct] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [table, setTable] = useState<{ y: number; w: number; h: number } | null>(null);
  const [trayY, setTrayY] = useState(0);

  const cards = useRef(batch.map(makeCard)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(1)).current;
  const sub = useRef(new Animated.Value(0)).current;
  const fin = useRef(new Animated.Value(0)).current;
  const tray = useRef(new Animated.Value(1)).current;
  const rows = useRef(batch.map(() => new Animated.Value(0))).current;
  const count = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, reduced ? 0 : ms)); }, [reduced]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced); }, []);
  useEffect(() => { const id = count.addListener(({ value }: { value: number }) => setPct(Math.round(value))); return () => count.removeListener(id); }, [count]);

  const geo = useMemo(() => {
    if (!table) return null;
    let cw = Math.min(290, table.w - 64);
    const ch = Math.min(Math.round(cw * 1.4), table.h - 12);
    cw = Math.min(cw, Math.round(ch / 1.4));
    return { cw, ch };
  }, [table]);

  /** Décalage du centre d'une carte vers le jeton i de la réserve. */
  const chipTarget = useCallback((i: number) => {
    if (!table || !geo) return { x: 0, y: 0, s: 0.15 };
    const total = n * CHIP + (n - 1) * CHIP_GAP;
    return { x: -total / 2 + CHIP / 2 + i * (CHIP + CHIP_GAP), y: trayY + CHIP / 2 - (table.y + table.h / 2), s: CHIP / geo.cw };
  }, [table, geo, n, trayY]);

  const deck = useCallback((i: number) => {
    const m = MESS[i % MESS.length];
    const y = table && geo ? table.h / 2 - (geo.ch * 0.6) / 2 - 6 - m[1] * 0.5 : 0;
    return { x: m[0], y, rot: m[2], s: 0.6 };
  }, [table, geo]);

  const to = (v: Animated.Value, value: number, duration = 850, delay = 0) =>
    Animated.timing(v, { toValue: value, duration: reduced ? 1 : duration, delay: reduced ? 0 : delay, easing: ease, useNativeDriver: true });

  // Introduction : compte à rebours, puis le paquet tombe sur la table.
  useEffect(() => {
    if (!geo || played) return;
    batch.forEach((_, i) => {
      const d = deck(i);
      cards[i].x.setValue(d.x); cards[i].rot.setValue(d.rot * 3); cards[i].y.setValue(-(table?.h ?? 800) - geo.ch);
    });
    later(() => setClock('19:59:58'), 800);
    later(() => setClock('19:59:59'), 1600);
    later(() => { setClock('20:00'); to(glow, 1, 1600).start(); }, 2400);
    later(() => {
      batch.forEach((_, i) => {
        const d = deck(i);
        Animated.parallel([to(cards[i].y, d.y, 850, (n - 1 - i) * 150), to(cards[i].rot, d.rot, 850, (n - 1 - i) * 150)]).start();
      });
    }, 2700);
    later(() => { setClock('C’est l’heure.'); to(sub, 1, 900).start(); }, 3600);
    later(() => setPlayed(true), 4300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  const skipIntro = () => {
    timers.current.forEach(clearTimeout);
    batch.forEach((_, i) => { const d = deck(i); cards[i].y.setValue(d.y); cards[i].rot.setValue(d.rot); });
    glow.setValue(1); sub.setValue(1); setClock('C’est l’heure.'); setPlayed(true);
  };

  /** Amène la carte i au centre, la retourne et fait monter le pourcentage. */
  const present = (i: number) => {
    const c = cards[i];
    c.flip.setValue(0); c.why.setValue(0); count.setValue(0);
    Animated.parallel([to(c.x, 0), to(c.y, 0), to(c.rot, 0), to(c.scale, 1), to(c.flip, 1, 1000, 240)]).start();
    Animated.timing(count, { toValue: batch[i].result.score, duration: reduced ? 1 : 1100, delay: reduced ? 0 : 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    to(c.why, 1, 800, 1500).start();
    // Les cartes restantes attendent derrière, en léger retrait.
    for (let j = i + 1; j < n; j++) {
      const k = j - i - 1, m = MESS[j % MESS.length];
      Animated.parallel([to(cards[j].x, m[0] * 0.5), to(cards[j].y, -22 - k * 7), to(cards[j].rot, m[2] * 0.4), to(cards[j].scale, 0.9 - k * 0.025)]).start();
    }
  };
  /** Range la carte i dans la réserve, en bas. */
  const stash = (i: number) => {
    const t = chipTarget(i), c = cards[i];
    Animated.parallel([to(c.x, t.x), to(c.y, t.y), to(c.scale, t.s), to(c.opacity, 0, 400, 450)]).start();
    later(() => setCollected(i + 1), 520);
  };

  const start = () => {
    if (!played) return skipIntro();
    to(intro, 0, 500).start();
    setPhase('card'); setIdx(0); present(0);
  };
  const next = () => {
    timers.current.forEach(clearTimeout);
    stash(idx);
    if (idx < n - 1) { setIdx(idx + 1); present(idx + 1); return; }
    setPhase('final');
    to(fin, 1, 800, 700).start();
    rows.forEach((r, k) => to(r, 1, 600, 900 + k * 90).start());
    to(tray, 0, 500, 1300).start();
  };
  const replay = () => {
    timers.current.forEach(clearTimeout);
    cards.forEach((c, i) => { c.opacity.setValue(1); c.flip.setValue(0); c.scale.setValue(0.6); c.why.setValue(0); c.y.setValue(-2000); c.x.setValue(MESS[i % MESS.length][0]); });
    [glow, sub, fin].forEach((v) => v.setValue(0)); intro.setValue(1); tray.setValue(1); rows.forEach((r) => r.setValue(0));
    setCollected(0); setIdx(0); setPhase('intro'); setClock('19:59:57'); setPlayed(false);
    setTable((t) => (t ? { ...t } : t)); // relance l'introduction
  };

  const onTable = (e: LayoutChangeEvent) => {
    const { y, width, height } = e.nativeEvent.layout;
    if (!table || table.h !== height || table.w !== width) setTable({ y, w: width, h: height });
  };

  const current = batch[idx] ? PROFILES_BY_ID.get(batch[idx].profile.id)! : undefined;

  return (
    <View style={styles.page}>
      <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]} />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={styles.head}>
          <Label color={colors.accent}>{phase === 'intro' ? 'Jeudi 29 octobre' : 'Reveal du 29 octobre'}</Label>
          {phase === 'card' && <Muted>{idx + 1} / {n}</Muted>}
        </View>

        {/* Titre de l'introduction, puis titre final, à la même place */}
        <View pointerEvents="none" style={styles.hero}>
          <Animated.View style={{ opacity: intro }}>
            <Serif size={64} style={{ lineHeight: 66, color: clock === '20:00' || played ? colors.accent : colors.ink }}>{clock}</Serif>
            <Animated.View style={{ opacity: sub, marginTop: space.m }}>
              <Body style={{ fontSize: 16, color: colors.inkSoft }}>{n} profils choisis pour vous.{'\n'}Ils vous découvrent au même moment.</Body>
            </Animated.View>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fin }]}>
            <Serif size={40}>Vos cinq profils</Serif>
            <Muted style={{ marginTop: space.s, fontSize: 14 }}>Écrivez à ceux qui vous intriguent. Ils ont reçu votre profil en même temps.</Muted>
          </Animated.View>
        </View>

        <View style={styles.table} onLayout={onTable}>
          {geo && batch.map((cnd, i) => {
            const p = PROFILES_BY_ID.get(cnd.profile.id)!, c = cards[i];
            const active = phase === 'card' && i === idx;
            const box = { width: geo.cw, height: geo.ch, marginLeft: -geo.cw / 2, marginTop: -geo.ch / 2 };
            const move = { transform: [{ translateX: c.x }, { translateY: c.y }, { rotate: c.rot.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }, { scale: c.scale }] };
            const back = { transform: [{ perspective: 1400 }, { rotateY: c.flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] };
            const face = { transform: [{ perspective: 1400 }, { rotateY: c.flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }] };
            return (
              <Animated.View key={p.id} style={[styles.card, box, move, { opacity: c.opacity, zIndex: active ? 30 : 20 - i }]}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.back, back]}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Retourner la carte" onPress={phase === 'intro' ? start : undefined} style={styles.backInner}>
                    <View style={styles.monogram}><Serif size={34} style={{ color: colors.accent }}>B</Serif></View>
                  </Pressable>
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, styles.face, face]}>
                  <Pressable accessibilityRole="link" accessibilityLabel={`Voir le résumé de ${p.firstName}`} onPress={() => router.push(`/match/${p.id}`)} style={styles.faceInner}>
                    <Initial letter={p.initial} size={92} highlight />
                    <Serif size={32} style={{ marginTop: space.s }}>{p.firstName}, {p.age}</Serif>
                    <Muted style={{ fontSize: 13.5 }}>{p.job} · {p.zone}</Muted>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                      <Serif size={58} style={{ color: colors.accent, lineHeight: 62 }}>{active ? pct : cnd.result.score} %</Serif>
                      <Muted style={{ fontSize: 13 }}>de compatibilité</Muted>
                    </View>
                    <Animated.View style={{ opacity: c.why }}>
                      <SerifItalic size={18} style={{ textAlign: 'center', color: colors.inkSoft }}>{p.why}</SerifItalic>
                      <Muted style={{ textAlign: 'center', fontSize: 12.5, marginTop: space.s }}>Toucher pour voir le résumé</Muted>
                    </Animated.View>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            );
          })}

          {/* Liste finale, classée du plus au moins compatible */}
          <View pointerEvents={phase === 'final' ? 'auto' : 'none'} style={styles.list}>
            {ranked.map((cnd, k) => {
              const p = PROFILES_BY_ID.get(cnd.profile.id)!;
              return (
                <Animated.View key={p.id} style={{ opacity: rows[k], transform: [{ translateY: rows[k].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
                  <Divider />
                  <Pressable accessibilityRole="link" style={styles.row} onPress={() => router.push(`/match/${p.id}`)}>
                    <Initial letter={p.initial} size={48} />
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontFamily: fonts.sansBold }}>{p.firstName}</Body>
                      <Muted>{p.job}</Muted>
                    </View>
                    <Serif size={26} style={{ color: colors.accent }}>{cnd.result.score} %</Serif>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Réserve : un jeton par profil déjà découvert */}
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onLayout={(e: LayoutChangeEvent) => setTrayY(e.nativeEvent.layout.y)}
          style={[styles.tray, { opacity: phase === 'intro' ? 0.35 : tray }]}
        >
          {batch.map((cnd, i) => {
            const p = PROFILES_BY_ID.get(cnd.profile.id)!, on = i < collected;
            return (
              <View key={p.id} style={{ alignItems: 'center', gap: 4 }}>
                <View style={[styles.chip, on && styles.chipOn]}>
                  {on && <Serif size={20}>{p.initial}</Serif>}
                </View>
                <Text style={[styles.chipPct, { opacity: on ? 1 : 0 }]}>{cnd.result.score} %</Text>
              </View>
            );
          })}
        </Animated.View>

        <View style={styles.cta}>
          {phase === 'intro' && (
            <>
              <Button label="Retourner la première carte" onPress={start} disabled={!played} />
              <Button variant="text" label="Fermer" onPress={() => router.back()} />
              <Muted style={{ textAlign: 'center', fontSize: 13 }}>Du plus surprenant au plus compatible.</Muted>
            </>
          )}
          {phase === 'card' && current && (
            <>
              <Button label={idx === n - 1 ? 'Voir mes cinq profils' : 'Carte suivante'} onPress={next} />
              <Button variant="text" label={`Voir le résumé de ${current.firstName}`} onPress={() => router.push(`/match/${current.id}`)} />
            </>
          )}
          {phase === 'final' && (
            <>
              <Button label="Aller aux messages" onPress={() => router.replace('/messages')} />
              <Button variant="text" label="Revoir le dévoilement · prochain reveal le 12 novembre" onPress={replay} />
            </>
          )}
        </View>
      </SafeAreaView>

      {/* Toucher pendant le compte à rebours : on passe directement au paquet posé */}
      {phase === 'intro' && !played && (
        <Pressable accessibilityRole="button" accessibilityLabel="Passer l’introduction" onPress={skipIntro} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  glow: { position: 'absolute', alignSelf: 'center', top: '30%', width: 560, height: 560, borderRadius: 280, backgroundColor: 'rgba(242,166,90,0.16)' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.l, minHeight: 44, zIndex: 6 },
  hero: { position: 'absolute', left: space.xl, right: space.xl, top: 100, zIndex: 5 },
  table: { flex: 1, zIndex: 2 },
  card: { position: 'absolute', left: '50%', top: '50%' },
  back: { borderRadius: 22, backgroundColor: '#3A2729', borderWidth: 1, borderColor: '#5C4038', backfaceVisibility: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 14 } },
  backInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monogram: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(242,166,90,0.55)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,28,31,0.6)' },
  face: { borderRadius: 22, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, backfaceVisibility: 'hidden', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } },
  faceInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s, paddingHorizontal: space.l },
  list: { position: 'absolute', left: space.xl, right: space.xl, top: 120, zIndex: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  tray: { flexDirection: 'row', justifyContent: 'center', gap: CHIP_GAP, height: 66, zIndex: 7 },
  chip: { width: CHIP, height: CHIP, borderRadius: CHIP / 2, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderStyle: 'solid', borderColor: colors.accent, backgroundColor: colors.card },
  chipPct: { fontFamily: fonts.sans, fontSize: 11, color: colors.accent },
  cta: { paddingHorizontal: space.xl, paddingTop: 10, paddingBottom: space.l, gap: 6, zIndex: 7 },
});
