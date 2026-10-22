// Protection des photos révélées contre les captures d'écran.
//
// - Android : la capture et l'enregistrement d'écran donnent une image noire (blocage natif).
// - iPhone : Apple ne permet pas de bloquer une capture de façon garantie. On empêche ce
//   qu'expo-screen-capture sait empêcher, on détecte chaque capture, on prévient la personne
//   et on remonte l'événement au serveur (avertissement, puis sanction en cas de récidive).
// - Partout : un filigrane discret identifie la personne qui regarde (voir Watermark).

import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

export function usePhotoProtection(key: string, onScreenshot?: () => void) {
  const [screenshots, setScreenshots] = useState(0);

  useEffect(() => {
    // Sur ordinateur (aperçu web), pas de capture à bloquer : la protection ne concerne que les téléphones.
    if (Platform.OS === 'web') return;
    ScreenCapture.preventScreenCaptureAsync(key).catch(() => {});

    const sub = ScreenCapture.addScreenshotListener(() => {
      setScreenshots((n) => n + 1);
      onScreenshot?.();
      // TODO backend : enregistrer l'événement (table screenshot_events) et notifier l'autre personne.
      Alert.alert(
        'Capture détectée',
        'Les photos révélées sur Blind sont confiées en confiance. L’autre personne en est informée, et une récidive entraîne la suspension du compte.',
      );
    });

    return () => {
      sub.remove();
      ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
    };
  }, [key, onScreenshot]);

  return { screenshots };
}
