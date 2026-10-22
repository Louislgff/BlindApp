// Compte de l'utilisateur connecté : session Supabase, profil (les bases) et réponses au questionnaire.
// Sans connexion, l'app reste en mode démo (Lucien et les données du prototype).

import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DISTANCES, ZONES } from '../data/zones';
import { normalizePhone, supabase } from '../lib/supabase';
import type { Answer, Gender, Importance, LookingFor } from '../matching/types';
import { isDone } from '../onboarding/progress';

export interface Basics {
  firstName: string;
  /** AAAA-MM-JJ */
  birthDate: string;
  gender: Gender;
  seeking: Gender[];
  ageMin: number;
  ageMax: number;
  zone: string;
  maxDistanceKm: number;
}

export interface Extras {
  lookingFor: LookingFor;
  determinants: string[];
  prompts: { question: string; answer: string }[];
}

interface Account {
  /** Le chargement initial (session enregistrée sur le téléphone) est terminé. */
  loaded: boolean;
  session: Session | null;
  phone: string | null;
  basics: Basics | null;
  extras: Extras | null;
  answers: Record<string, Answer>;
  /** Renvoient un message d'erreur en français, ou null si tout s'est bien passé. */
  sendCode: (phone: string) => Promise<string | null>;
  verifyCode: (phone: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveBasics: (b: Basics) => Promise<string | null>;
  saveAnswers: (answers: Record<string, Answer>) => Promise<string | null>;
  saveExtras: (e: Extras) => Promise<string | null>;
}

const Ctx = createContext<Account | null>(null);

/** Messages d'erreur Supabase les plus courants, traduits. */
function explain(error: { message?: string; code?: string } | null): string | null {
  if (!error) return null;
  const m = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (m.includes('provider') || m.includes('sms') && m.includes('disabled'))
    return 'La connexion par SMS n’est pas encore activée sur le serveur.';
  if (m.includes('expired') || m.includes('invalid') && m.includes('otp')) return 'Code incorrect ou expiré. Demandez-en un nouveau.';
  if (m.includes('rate') || m.includes('too many')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (m.includes('majeures')) return 'Blind est réservé aux personnes majeures.';
  if (m.includes('network') || m.includes('fetch')) return 'Pas de connexion internet.';
  return `Une erreur est survenue (${error.message ?? error.code ?? 'inconnue'}).`;
}

interface ProfileRow {
  first_name: string;
  birth_date: string;
  gender: Gender;
  seeking: Gender[];
  age_min: number;
  age_max: number;
  zone: string;
  max_distance_km: number;
  looking_for: LookingFor;
  determinants: string[];
  prompts: { question: string; answer: string }[];
}

interface AnswerRow {
  question_id: string;
  mine: Answer['mine'];
  accepted: Answer['accepted'] | null;
  importance: Importance;
  skipped: boolean;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [basics, setBasics] = useState<Basics | null>(null);
  const [extras, setExtras] = useState<Extras | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setBasics(null);
      setExtras(null);
      setAnswers({});
      return;
    }
    const uid = s.user.id;
    const [{ data: p }, { data: rows }] = await Promise.all([
      supabase.from('profiles').select('first_name, birth_date, gender, seeking, age_min, age_max, zone, max_distance_km, looking_for, determinants, prompts').eq('id', uid).maybeSingle<ProfileRow>(),
      supabase.from('answers').select('question_id, mine, accepted, importance, skipped').eq('user_id', uid).returns<AnswerRow[]>(),
    ]);
    if (p) {
      setBasics({
        firstName: p.first_name, birthDate: p.birth_date, gender: p.gender, seeking: p.seeking,
        ageMin: p.age_min, ageMax: p.age_max, zone: p.zone, maxDistanceKm: p.max_distance_km,
      });
      setExtras({ lookingFor: p.looking_for, determinants: p.determinants, prompts: p.prompts ?? [] });
    } else {
      setBasics(null);
      setExtras(null);
    }
    setAnswers(
      Object.fromEntries(
        (rows ?? []).map((r) => [r.question_id, { mine: r.mine, accepted: r.accepted ?? undefined, importance: r.importance, skipped: r.skipped }]),
      ),
    );
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session).finally(() => setLoaded(true)));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') load(s);
      else setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const sendCode = useCallback(async (input: string) => {
    const phone = normalizePhone(input);
    if (!phone) return 'Ce numéro ne semble pas valide.';
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return explain(error);
  }, []);

  const verifyCode = useCallback(async (input: string, code: string) => {
    const phone = normalizePhone(input);
    if (!phone) return 'Ce numéro ne semble pas valide.';
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
    if (!error) await load(data.session);
    return explain(error);
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await load(null);
  }, [load]);

  const saveBasics = useCallback(async (b: Basics) => {
    if (!session) return 'Vous n’êtes pas connecté.';
    const z = ZONES.find((x) => x.zone === b.zone) ?? ZONES[0];
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      first_name: b.firstName.trim(),
      birth_date: b.birthDate,
      gender: b.gender,
      seeking: b.seeking,
      age_min: b.ageMin,
      age_max: b.ageMax,
      city: 'paris',
      zone: z.zone,
      lat: z.lat,
      lng: z.lng,
      max_distance_km: b.maxDistanceKm || DISTANCES[1].km,
    });
    if (!error) setBasics(b);
    return explain(error);
  }, [session]);

  const saveAnswers = useCallback(async (next: Record<string, Answer>) => {
    if (!session) return 'Vous n’êtes pas connecté.';
    const rows = Object.entries(next)
      .filter(([, a]) => isDone(a))
      .map(([question_id, a]) => ({
        user_id: session.user.id,
        question_id,
        mine: a.skipped ? '' : a.mine,
        accepted: a.skipped ? null : a.accepted ?? null,
        // -1 = importance pas encore choisie : « Important » par défaut.
        importance: a.skipped ? 0 : a.importance >= 0 ? a.importance : 10,
        skipped: !!a.skipped,
        updated_at: new Date().toISOString(),
      }));
    if (!rows.length) return null;
    const { error } = await supabase.from('answers').upsert(rows, { onConflict: 'user_id,question_id' });
    if (!error) setAnswers((s) => ({ ...s, ...Object.fromEntries(Object.entries(next).filter(([, a]) => isDone(a))) }));
    return explain(error);
  }, [session]);

  const saveExtras = useCallback(async (e: Extras) => {
    if (!session) return 'Vous n’êtes pas connecté.';
    const { error } = await supabase
      .from('profiles')
      .update({ looking_for: e.lookingFor, determinants: e.determinants.slice(0, 3), prompts: e.prompts.filter((p) => p.answer.trim()) })
      .eq('id', session.user.id);
    if (!error) setExtras(e);
    return explain(error);
  }, [session]);

  const value = useMemo<Account>(
    () => ({
      loaded,
      session,
      phone: session?.user.phone ?? null,
      basics,
      extras,
      answers,
      sendCode,
      verifyCode,
      signOut,
      saveBasics,
      saveAnswers,
      saveExtras,
    }),
    [loaded, session, basics, extras, answers, sendCode, verifyCode, signOut, saveBasics, saveAnswers, saveExtras],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): Account {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAccount doit être utilisé dans <AccountProvider>');
  return a;
}

/** « 33612345678 » → « +33 6 •• •• •• 78 » */
export function maskPhone(phone: string | null): string {
  if (!phone) return '';
  const p = phone.replace(/^\+/, '');
  return p.startsWith('33') && p.length === 11 ? `+33 ${p[2]} •• •• •• ${p.slice(-2)}` : `+${p.slice(0, 2)} •• ${p.slice(-2)}`;
}
