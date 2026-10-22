-- Blind — schéma de base de données (Supabase / PostgreSQL)
-- Principes : chaque table est protégée par des règles d'accès (RLS) ;
-- l'accord de reveal et le debrief ne sont JAMAIS lisibles par l'autre personne ;
-- les photos ne sont accessibles qu'après un reveal mutuel.

create extension if not exists "pgcrypto";

-- ---------- Profils ----------

create type gender as enum ('femme', 'homme', 'non-binaire');
create type looking_for as enum ('similaire', 'complementaire', 'les-deux');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text not null,
  birth_date date not null,                 -- déclarée ; 18 ans minimum (contrôle d'âge par le selfie possible)
  gender gender not null,
  seeking gender[] not null,
  age_min int not null check (age_min >= 18),
  age_max int not null check (age_max >= age_min),
  city text not null default 'paris',       -- ville d'ouverture (reveals) ou liste d'attente
  zone text not null,                       -- arrondissement, quartier ou commune
  lat numeric(8,5) not null,                -- centre de la zone, jamais la position exacte
  lng numeric(8,5) not null,
  max_distance_km int not null default 15,
  looking_for looking_for not null default 'les-deux',
  determinants text[] not null default '{}' check (cardinality(determinants) <= 3),
  job text,
  prompts jsonb not null default '[]',      -- [{question, answer}] x3
  phone_verified_at timestamptz,
  selfie_verified_at timestamptz,           -- selfie vidéo (détection du vivant) comparé aux photos ; pas de pièce d'identité
  sensitive_data_consent_at timestamptz,    -- RGPD art. 9 : consentement explicite et séparé
  subscription_status text not null default 'none', -- none | active | past_due | canceled
  created_at timestamptz not null default now()
);

-- Vue publique d'un profil AVANT reveal : pas de photos, pas de données sensibles.
create view public_profiles as
  select id, first_name, date_part('year', age(birth_date))::int as age, gender, zone, city, job, prompts
  from profiles;
-- Pas d'accès direct : servie uniquement par une fonction serveur, pour les profils
-- proposés à l'utilisateur (reveal_assignments) ou avec qui il a un match.
revoke all on public_profiles from public;

-- ---------- Réponses au questionnaire ----------

create table answers (
  user_id uuid not null references profiles on delete cascade,
  question_id text not null,
  mine jsonb not null,            -- "valeur" | ["tags"] | 178
  accepted jsonb,                 -- ["valeurs"] | {"min":170,"max":190}
  importance int not null check (importance in (0, 1, 10, 50, 250)),
  skipped boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ---------- Photos (bucket Storage privé « photos ») ----------

create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  storage_path text not null,     -- photos/<user_id>/<uuid>.jpg
  position int not null check (position between 1 and 6),
  verified boolean not null default false, -- comparée au selfie de vérification
  unique (user_id, position)
);

-- ---------- Reveals (sessions toutes les 2 semaines) ----------

create table reveal_sessions (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  starts_at timestamptz not null,
  unique (city, starts_at)
);

-- Les 5 profils proposés à chaque utilisateur, calculés par une fonction serveur avant le reveal.
create table reveal_assignments (
  session_id uuid not null references reveal_sessions on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  candidate_id uuid not null references profiles on delete cascade,
  position int not null,          -- ordre de dévoilement : du moins au plus compatible
  score int not null,
  points jsonb not null,          -- résumé : communs / complémentaires / à explorer (sans donnée sensible)
  why text,                       -- phrase « Pourquoi vous »
  primary key (session_id, user_id, candidate_id)
);

-- Un profil n'est jamais reproposé à la même personne.
create unique index reveal_assignments_once on reveal_assignments (user_id, candidate_id);

-- ---------- Matchs et messages ----------

create table matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references reveal_sessions,
  user_a uuid not null references profiles on delete cascade,
  user_b uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches on delete cascade,
  sender_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_match on messages (match_id, created_at);

-- Accord de reveal : SECRET. Chacun ne voit que sa propre ligne.
create table reveal_consents (
  match_id uuid not null references matches on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  ready boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

-- Reveal effectif : visible des deux, créé uniquement par le serveur.
create table reveals (
  match_id uuid primary key references matches on delete cascade,
  revealed_at timestamptz not null default now()
);

-- ---------- Rencontres, debriefs, sécurité ----------

create table meetings (
  match_id uuid not null references matches on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  met_on date not null default current_date,
  primary key (match_id, user_id)
);

-- Debrief privé : jamais partagé avec l'autre personne.
create table debriefs (
  match_id uuid not null references matches on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  rating int check (rating between 1 and 5),
  see_again text check (see_again in ('oui', 'peut-etre', 'non')),
  missing text[] not null default '{}',
  profile_faithful text check (profile_faithful in ('tout-a-fait', 'plutot', 'pas-vraiment')),
  inappropriate boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table screenshot_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  platform text not null,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  reported_id uuid not null references profiles on delete cascade,
  match_id uuid references matches on delete set null,
  reason text not null,
  details text,
  status text not null default 'ouvert',
  created_at timestamptz not null default now()
);

-- ---------- Fonctions ----------

create function is_member(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = m and auth.uid() in (user_a, user_b));
$$;

-- Les photos de `owner` sont visibles par `viewer` seulement après un reveal mutuel entre eux.
create function can_view_photos(viewer uuid, owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select viewer = owner or exists (
    select 1 from matches m join reveals r on r.match_id = m.id
    where m.user_a = least(viewer, owner) and m.user_b = greatest(viewer, owner)
  );
$$;

-- Déclenche le reveal quand : seuil de 10 messages (au moins 5 de chaque côté) ET accord des deux.
create function try_reveal() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m matches;
  n_a int; n_b int;
  ready_count int;
begin
  select * into m from matches where id = new.match_id;
  select count(*) filter (where sender_id = m.user_a), count(*) filter (where sender_id = m.user_b)
    into n_a, n_b from messages where match_id = m.id;
  if n_a + n_b < 10 or n_a < 5 or n_b < 5 then
    return new;
  end if;
  select count(*) into ready_count from reveal_consents where match_id = m.id and ready;
  if ready_count = 2 then
    insert into reveals (match_id) values (m.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger reveal_on_consent after insert or update on reveal_consents
  for each row execute function try_reveal();
-- Cas où les deux accords existent déjà quand le seuil de messages est atteint.
create trigger reveal_on_message after insert on messages
  for each row execute function try_reveal();

-- On ne peut plus retirer son accord une fois le reveal fait.
create function lock_consent_after_reveal() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from reveals where match_id = new.match_id) and new.ready = false then
    raise exception 'Le reveal a déjà eu lieu';
  end if;
  return new;
end;
$$;
create trigger consent_locked before update on reveal_consents
  for each row execute function lock_consent_after_reveal();

-- ---------- Règles d'accès (RLS) ----------

alter table profiles enable row level security;
alter table answers enable row level security;
alter table photos enable row level security;
alter table reveal_sessions enable row level security;
alter table reveal_assignments enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table reveal_consents enable row level security;
alter table reveals enable row level security;
alter table meetings enable row level security;
alter table debriefs enable row level security;
alter table screenshot_events enable row level security;
alter table reports enable row level security;

-- Profil complet : seulement le sien. Les autres passent par public_profiles via une fonction serveur.
create policy "mon profil" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Réponses : strictement privées (le matching tourne côté serveur avec la clé service).
create policy "mes réponses" on answers for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "mes photos" on photos for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "photos révélées" on photos for select using (can_view_photos(auth.uid(), user_id));

create policy "sessions visibles" on reveal_sessions for select using (true);
create policy "mes profils proposés" on reveal_assignments for select using (user_id = auth.uid());

create policy "mes matchs" on matches for select using (auth.uid() in (user_a, user_b));

create policy "lire mes conversations" on messages for select using (is_member(match_id));
create policy "écrire dans mes conversations" on messages for insert
  with check (sender_id = auth.uid() and is_member(match_id));

-- Secret : je ne lis et n'écris que MON accord.
create policy "mon accord de reveal" on reveal_consents for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member(match_id));

create policy "reveals de mes matchs" on reveals for select using (is_member(match_id));

create policy "mes rencontres" on meetings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member(match_id));

-- Privé : l'autre personne ne voit jamais mon debrief.
create policy "mon debrief" on debriefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member(match_id));

create policy "déclarer une capture" on screenshot_events for insert with check (user_id = auth.uid());
create policy "signaler" on reports for insert with check (reporter_id = auth.uid());

-- ---------- Stockage des photos ----------
-- Bucket privé « photos » ; chemin : <owner_id>/<fichier>. Lecture via URL signée de courte durée.
-- create policy "lecture photos révélées" on storage.objects for select
--   using (bucket_id = 'photos' and can_view_photos(auth.uid(), ((storage.foldername(name))[1])::uuid));
-- create policy "dépôt de mes photos" on storage.objects for insert
--   with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
