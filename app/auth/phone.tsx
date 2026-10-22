import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { BackButton, Body, Button, Label, Muted, Screen, Serif } from '../../src/components/ui';
import { useAccount } from '../../src/state/account';
import { authStyles as styles } from '../../src/components/authStyles';
import { colors } from '../../src/theme';

// Étape 1 de l'inscription : le numéro de téléphone (un numéro = un compte).
export default function PhoneScreen() {
  const { sendCode } = useAccount();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    const err = await sendCode(phone);
    setBusy(false);
    if (err) return setError(err);
    router.push({ pathname: '/auth/code', params: { phone } });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.top}>
          <BackButton />
        </View>
        <View style={styles.body}>
          <Label color={colors.accent}>Créer mon compte</Label>
          <Serif size={44} style={{ lineHeight: 48 }}>Votre numéro</Serif>
          <Body style={{ color: colors.inkSoft }}>
            Vous recevrez un code par SMS. Un numéro, un compte : c’est la première étape pour garantir de vrais profils.
          </Body>
          <TextInput
            value={phone}
            onChangeText={(t) => { setPhone(t); setError(''); }}
            placeholder="06 12 34 56 78"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            autoFocus
            accessibilityLabel="Numéro de téléphone"
            onSubmitEditing={submit}
            style={styles.input}
          />
          {!!error && <Muted style={{ color: colors.accent }}>{error}</Muted>}
          <Muted style={{ fontSize: 12 }}>Votre numéro n’est jamais affiché sur votre profil.</Muted>
        </View>
        <View style={styles.footer}>
          <Button label={busy ? 'Envoi…' : 'Recevoir le code'} onPress={submit} disabled={busy || phone.replace(/\D/g, '').length < 9} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
