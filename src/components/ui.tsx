import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, night, PaletteContext, radius, space, useColors } from '../theme';

/** Passe tous les composants de base en palette sombre (utilisé par le reveal de 20 h). */
export function NightTheme({ children }: { children: ReactNode }) {
  return <PaletteContext.Provider value={night}>{children}</PaletteContext.Provider>;
}

// ---------- Mise en page ----------

export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: colors.paper }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, style]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }, style]} />;
}

// ---------- Texte ----------

type TxtProps = TextProps & { style?: StyleProp<TextStyle> };

export const Serif = ({ style, ...p }: TxtProps & { size?: number }) => (
  <Text {...p} style={[{ fontFamily: fonts.serif, color: useColors().ink, fontSize: p.size ?? 26 }, style]} />
);

export const SerifItalic = ({ style, ...p }: TxtProps & { size?: number }) => (
  <Text {...p} style={[{ fontFamily: fonts.serifItalic, color: useColors().ink, fontSize: p.size ?? 24, lineHeight: (p.size ?? 24) * 1.25 }, style]} />
);

export const Body = ({ style, ...p }: TxtProps) => (
  <Text {...p} style={[{ fontFamily: fonts.sans, color: useColors().ink, fontSize: 15, lineHeight: 22 }, style]} />
);

export const Muted = ({ style, ...p }: TxtProps) => (
  <Text {...p} style={[{ fontFamily: fonts.sans, color: useColors().muted, fontSize: 13, lineHeight: 19 }, style]} />
);

export const Label = ({ style, color, ...p }: TxtProps & { color?: string }) => (
  <Text
    {...p}
    style={[{ fontFamily: fonts.sansMedium, color: color ?? useColors().muted, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' }, style]}
  />
);

// ---------- Boutons ----------

export function Button({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'text';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const v = buttonVariants(useColors())[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, v.box, { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}
    >
      <Text style={[styles.buttonLabel, v.label]}>{label}</Text>
    </Pressable>
  );
}

const buttonVariants = (colors: ReturnType<typeof useColors>) => ({
  primary: { box: { backgroundColor: colors.accentFill }, label: { color: colors.onAccent } },
  ghost: { box: { borderWidth: 1, borderColor: colors.border }, label: { color: colors.ink, fontFamily: fonts.sans } },
  text: { box: { height: 44 }, label: { color: colors.muted, fontFamily: fonts.sans, fontSize: 14 } },
});

export function BackButton({ label = 'Retour' }: { label?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={8}
      style={styles.iconButton}
    >
      <Feather name="chevron-left" size={24} color={colors.ink} />
    </Pressable>
  );
}

// ---------- Éléments ----------

/** Cercle avec l'initiale : remplace la photo tant que le reveal n'a pas eu lieu. Après le reveal, passer `source`. */
export function Initial({
  letter,
  size = 52,
  highlight = false,
  source,
}: {
  letter: string;
  size?: number;
  highlight?: boolean;
  source?: ImageSourcePropType;
}) {
  const colors = useColors();
  if (source) {
    return <Image source={source} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: highlight ? 1.5 : 0,
        borderStyle: 'dashed',
        borderColor: colors.accent,
      }}
    >
      <Text style={{ fontFamily: fonts.serif, fontSize: size * 0.44, color: colors.ink }}>{letter}</Text>
    </View>
  );
}

export function Point({ text, kind = 'commun' }: { text: string; kind?: 'commun' | 'complementaire' | 'a-explorer' }) {
  const colors = useColors();
  const dot: ViewStyle =
    kind === 'commun'
      ? { backgroundColor: colors.accent }
      : kind === 'complementaire'
        ? { backgroundColor: colors.muted }
        : { borderWidth: 1, borderColor: colors.muted };
  return (
    <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start' }}>
      <View style={[{ width: 6, height: 6, borderRadius: 3, marginTop: 8 }, dot]} />
      <Body style={{ flex: 1, color: colors.inkSoft }}>{text}</Body>
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { backgroundColor: colors.ink, borderColor: colors.ink } : { borderColor: colors.border },
      ]}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: selected ? colors.paper : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const colors = useColors();
  color = color ?? colors.accentFill;
  return (
    <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' }}>
      <View style={{ height: 3, width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  button: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  buttonLabel: { fontFamily: fonts.sansBold, fontSize: 16 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1 },
});
