// État de l'app en mémoire (démo). À remplacer par des appels Supabase : voir supabase/schema.sql.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { MyProfile } from '../components/ProfileCard';
import { CONVERSATIONS, ME, MY_DISPLAY, REVEAL_THRESHOLD, type Conversation } from '../data/mock';

export type RevealState =
  | { kind: 'locked'; count: number; total: number }
  | { kind: 'available' }
  | { kind: 'waiting' } // j'ai dit oui, l'autre pas encore (je ne sais pas qu'il/elle hésite)
  | { kind: 'revealed'; on: string };

export function revealState(c: Conversation): RevealState {
  if (c.revealedOn) return { kind: 'revealed', on: c.revealedOn };
  const mine = c.messages.filter((m) => m.from === 'me').length;
  const theirs = c.messages.length - mine;
  const reached =
    c.messages.length >= REVEAL_THRESHOLD.total &&
    mine >= REVEAL_THRESHOLD.eachSide &&
    theirs >= REVEAL_THRESHOLD.eachSide;
  if (!reached) return { kind: 'locked', count: Math.min(c.messages.length, REVEAL_THRESHOLD.total), total: REVEAL_THRESHOLD.total };
  return c.meReady ? { kind: 'waiting' } : { kind: 'available' };
}

/** « 5 profils · 2 conversations · 1 rencontre » pour un reveal passé. */
export function revealSummary(profileIds: string[], conversations: Conversation[]): string {
  const convs = conversations.filter((c) => profileIds.includes(c.profileId));
  const met = convs.filter((c) => c.metOn).length;
  const parts = [`${profileIds.length} profils`];
  if (convs.length) parts.push(`${convs.length} conversation${convs.length > 1 ? 's' : ''}`);
  if (met) parts.push(`${met} rencontre${met > 1 ? 's' : ''}`);
  return parts.join(' · ');
}

/** Où en est-on avec une personne proposée lors d'un reveal. */
export function matchStatus(profileId: string, conversations: Conversation[], newMatches: string[]): string {
  const c = conversations.find((x) => x.profileId === profileId);
  if (c?.metOn) return `Rencontre ${c.metOn}`;
  if (c?.revealedOn) return 'Photos révélées';
  if (c) return 'Conversation en cours';
  return newMatches.includes(profileId) ? 'Pas encore de message' : 'Pas de conversation';
}

const today = () => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(new Date());

interface Store {
  conversations: Conversation[];
  conversationFor: (profileId: string) => Conversation | undefined;
  send: (profileId: string, text: string) => void;
  /** Donne ou retire mon accord. Le reveal se déclenche quand les deux ont dit oui. */
  setReady: (conversationId: string, ready: boolean) => { revealed: boolean };
  markMet: (conversationId: string) => void;
  completeDebrief: (conversationId: string) => void;
  /** Bio, éléments affichés et musique : ce que les matchs voient de l'utilisateur. */
  myProfile: MyProfile;
  setMyProfile: (p: MyProfile) => void;
  /** Brouillon non enregistré à montrer dans l'aperçu (depuis l'éditeur « Mon profil »). */
  previewDraft: MyProfile | null;
  setPreviewDraft: (p: MyProfile | null) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [myProfile, setMyProfile] = useState<MyProfile>(() => ({ ...MY_DISPLAY, prompts: ME.prompts, music: ME.music }));
  const [previewDraft, setPreviewDraft] = useState<MyProfile | null>(null);

  const update = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const conversationFor = useCallback(
    (profileId: string) => conversations.find((c) => c.profileId === profileId),
    [conversations],
  );

  const send = useCallback((profileId: string, text: string) => {
    const msg = { id: `m${Date.now()}`, from: 'me' as const, text, at: new Date().toISOString() };
    setConversations((list) => {
      const existing = list.find((c) => c.profileId === profileId);
      if (existing) return list.map((c) => (c === existing ? { ...c, messages: [...c.messages, msg] } : c));
      const created: Conversation = {
        id: `c-${profileId}`, profileId, revealDate: '15 octobre', messages: [msg], meReady: false, themReady: false,
      };
      return [created, ...list];
    });
  }, []);

  const setReady = useCallback(
    (conversationId: string, ready: boolean) => {
      const c = conversations.find((x) => x.id === conversationId);
      const revealed = !!c && ready && c.themReady;
      update(conversationId, (x) => ({ ...x, meReady: ready, revealedOn: revealed ? today() : x.revealedOn }));
      return { revealed };
    },
    [conversations, update],
  );

  const markMet = useCallback(
    (id: string) => update(id, (c) => ({ ...c, metOn: today(), debriefDone: false })),
    [update],
  );
  const completeDebrief = useCallback((id: string) => update(id, (c) => ({ ...c, debriefDone: true })), [update]);

  const value = useMemo(
    () => ({ conversations, conversationFor, send, setReady, markMet, completeDebrief, myProfile, setMyProfile, previewDraft, setPreviewDraft }),
    [conversations, conversationFor, send, setReady, markMet, completeDebrief, myProfile, previewDraft],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return s;
}
