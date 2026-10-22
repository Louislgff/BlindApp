-- Inscription depuis l'app : protection des champs sensibles du profil et palier « prêt pour le reveal ».

-- Les questions essentielles (avec les bases, elles suffisent pour entrer dans un reveal).
-- Doit rester identique à REVEAL_ESSENTIALS dans src/data/questions.ts (vérifié par un test).
create or replace function reveal_essentials() returns text[]
language sql immutable as $$
  select array['recherche', 'enfants', 'desir-enfants', 'tabac', 'alcool', 'rythme', 'couple', 'vivre-ensemble', 'mariage', 'projet-5-ans', 'religion', 'sorties', 'voyages', 'temperament', 'communication']::text[] -- REVEAL_ESSENTIALS
$$;

-- Prêt pour le reveal : profil créé (les bases) et toutes les questions essentielles faites
-- (une question sensible passée avec « Je préfère ne pas répondre » compte comme faite).
create or replace function reveal_ready(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid)
    and not exists (
      select 1 from unnest(reveal_essentials()) as e(question_id)
      where not exists (
        select 1 from answers a
        where a.user_id = uid and a.question_id = e.question_id
          and (a.skipped or (a.mine not in ('""'::jsonb, '[]'::jsonb, '0'::jsonb, 'null'::jsonb)))
      )
    );
$$;

-- Date de vérification du numéro, lue dans le compte Supabase (inaccessible directement depuis l'app).
create or replace function phone_confirmed_at(uid uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  -- Un utilisateur ne peut lire que la sienne.
  select phone_confirmed_at from auth.users where id = uid and (auth.uid() is null or auth.uid() = uid);
$$;

-- Depuis l'app, un utilisateur ne peut pas se déclarer vérifié ni abonné :
-- ces champs ne sont modifiables que par le serveur (paiement, vérification).
-- Volontairement SANS « security definer » : current_user doit rester le rôle de l'appelant.
create or replace function protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.subscription_status := 'none';
      new.selfie_verified_at := null;
      new.phone_verified_at := phone_confirmed_at(new.id);
      new.created_at := now();
    else
      new.subscription_status := old.subscription_status;
      new.selfie_verified_at := old.selfie_verified_at;
      new.phone_verified_at := old.phone_verified_at;
      new.created_at := old.created_at;
    end if;
  end if;
  if new.birth_date > current_date - interval '18 years' then
    raise exception 'Blind est réservé aux personnes majeures';
  end if;
  return new;
end;
$$;

create trigger profile_protected before insert or update on profiles
  for each row execute function protect_profile();
