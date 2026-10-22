import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { BackButton, Body, Label, Muted, Screen, Serif } from '../src/components/ui';
import { VERIFICATION } from '../src/data/mock';
import { colors, fonts, radius, space } from '../src/theme';

// Deux vérifications, sans pièce d'identité (pas de données d'identité à stocker) :
// - le numéro de téléphone (code SMS) ;
// - le selfie vidéo de vérification (« détection du vivant ») comparé aux photos du profil.

function Item({ icon, title, detail, done }: { icon: 'smartphone' | 'video'; title: string; detail: string; done: boolean }) {
  return (
    <View style={styles.item}>
      <Feather name={icon} size={22} color={colors.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Body style={{ fontFamily: fonts.sansBold }}>{title}</Body>
        <Muted>{detail}</Muted>
      </View>
      <View style={[styles.pill, { backgroundColor: done ? colors.accentFill : 'transparent', borderColor: done ? colors.accentFill : colors.border }]}>
        <Body style={{ fontSize: 12, color: done ? colors.onAccent : colors.muted }}>{done ? 'Vérifié' : 'À faire'}</Body>
      </View>
    </View>
  );
}

export default function VerificationScreen() {
  const v = VERIFICATION;
  return (
    <Screen scroll>
      <View style={{ paddingHorizontal: space.l, paddingTop: space.s }}>
        <BackButton />
      </View>
      <View style={{ paddingHorizontal: space.xl, gap: space.s }}>
        <Label color={colors.accent}>Profil vérifié</Label>
        <Serif size={36}>Vérification</Serif>
        <Muted>Chaque profil Blind est une vraie personne, et ses photos sont bien les siennes.</Muted>
      </View>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.m }}>
        <Item icon="smartphone" title="Numéro de téléphone" detail={`${v.phoneMasked} · code SMS`} done={v.phoneVerified} />
        <Item
          icon="video"
          title="Selfie vidéo de vérification"
          detail="Quelques mouvements de tête filmés, comparés à vos photos. La vidéo est supprimée après contrôle."
          done={v.selfieVerified}
        />
        <Muted style={{ fontSize: 12, marginTop: space.s }}>
          Vérifié le {v.verifiedOn}. Si vous changez vos photos, un nouveau selfie peut vous être demandé.
        </Muted>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, backgroundColor: colors.card, borderRadius: radius.s },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
});
