import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { BackButton, Body, Button, Label, Muted, Screen, Serif } from '../../src/components/ui';
import { useAccount } from '../../src/state/account';
import { colors } from '../../src/theme';
import { authStyles as styles } from '../../src/components/authStyles';

// Étape 2 : le code reçu par SMS. Ensuite, on reprend le questionnaire là où on s'était arrêté.
export default function CodeScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const { verifyCode, sendCode } = useAccount();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (value = code) => {
    if (value.length < 6 || busy) return;
    setBusy(true);
    setError('');
    const err = await verifyCode(phone, value);
    setBusy(false);
    if (err) return setError(err);
    router.dismissAll();
    router.replace('/onboarding');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.top}>
          <BackButton />
        </View>
        <View style={styles.body}>
          <Label color={colors.accent}>Créer mon compte</Label>
          <Serif size={44} style={{ lineHeight: 48 }}>Le code reçu</Serif>
          <Body style={{ color: colors.inkSoft }}>Envoyé par SMS au {phone}.</Body>
          <TextInput
            value={code}
            onChangeText={(t) => {
              const v = t.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              setError('');
              if (v.length === 6) submit(v);
            }}
            placeholder="000000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            accessibilityLabel="Code à 6 chiffres"
            style={[styles.input, { fontSize: 28, letterSpacing: 10, textAlign: 'center' }]}
          />
          {!!error && <Muted style={{ color: colors.accent }}>{error}</Muted>}
          <Button
            variant="text"
            label={wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Renvoyer le code'}
            disabled={wait > 0}
            onPress={async () => {
              setWait(30);
              const err = await sendCode(phone);
              if (err) setError(err);
            }}
          />
        </View>
        <View style={styles.footer}>
          <Button label={busy ? 'Vérification…' : 'Valider'} onPress={() => submit()} disabled={busy || code.length < 6} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
