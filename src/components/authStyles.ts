import { StyleSheet } from 'react-native';

import { colors, fonts, radius, space } from '../theme';

// Styles communs aux écrans de connexion (numéro, code).
export const authStyles = StyleSheet.create({
  top: { paddingHorizontal: space.l, paddingTop: space.s },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.l },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.l },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    backgroundColor: colors.input,
    paddingHorizontal: space.l,
    fontFamily: fonts.sans,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.ink,
  },
});
