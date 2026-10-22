-- Scénario de bout en bout sur la vraie base, avec les vraies règles d'accès (RLS) :
-- messages, accord secret, reveal mutuel, photos, debrief privé, intrus.
-- Tout se passe dans une transaction annulée à la fin : la base n'est pas modifiée.
\set ON_ERROR_STOP on
begin;

select u.id as me from auth.users u where u.email = 'lucien@demo.blind.test' \gset
select m.id as match, case when m.user_a = :'me' then m.user_b else m.user_a end as her
  from matches m where :'me' in (m.user_a, m.user_b) order by m.created_at, m.id limit 1 \gset
select p.id as intruder from profiles p
  where p.id not in (:'me', :'her') order by p.id limit 1 \gset
select set_config('t.me', :'me', true), set_config('t.her', :'her', true),
       set_config('t.intruder', :'intruder', true), set_config('t.match', :'match', true) \g /dev/null

-- Agir en tant qu'utilisateur connecté (comme depuis l'app).
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
$$;
create or replace function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond then raise notice 'OK | %', label; else raise exception 'ÉCHEC | %', label; end if;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- 1. Lucien écrit 5 messages.
select pg_temp.as_user(:'me'); set local role authenticated;
insert into messages (match_id, sender_id, body) select :'match', :'me', 'Message ' || g || ' de Lucien' from generate_series(1, 5) g;
reset role;

-- 2. Elle écrit 4 messages (9 au total : seuil pas atteint).
select pg_temp.as_user(:'her'); set local role authenticated;
insert into messages (match_id, sender_id, body) select :'match', :'her', 'Réponse ' || g from generate_series(1, 4) g;
reset role;

-- 3. Lucien dit oui, en secret.
select pg_temp.as_user(:'me'); set local role authenticated;
insert into reveal_consents (match_id, user_id, ready) values (:'match', :'me', true);
select pg_temp.ok((select count(*) from messages where match_id = current_setting('t.match')::uuid) = 9, 'Lucien lit les 9 messages de sa conversation');
reset role;

-- 4. Elle ne peut pas savoir que Lucien a dit oui.
select pg_temp.as_user(:'her'); set local role authenticated;
select pg_temp.ok((select count(*) from reveal_consents where user_id = current_setting('t.me')::uuid) = 0, 'Accord secret : elle ne voit pas l’accord de Lucien');
-- 5. Elle dit oui aussi, mais 9 messages seulement : pas encore de reveal.
insert into reveal_consents (match_id, user_id, ready) values (:'match', :'her', true);
select pg_temp.ok((select count(*) from reveals where match_id = current_setting('t.match')::uuid) = 0, 'Deux accords mais 9 messages : pas de reveal');
select pg_temp.ok(not can_view_photos(current_setting('t.her')::uuid, current_setting('t.me')::uuid), 'Avant le reveal, elle ne voit pas les photos de Lucien');
-- 6. Le 10e message (5 de chaque côté) déclenche le reveal.
insert into messages (match_id, sender_id, body) values (:'match', :'her', 'Dixième message');
select pg_temp.ok((select count(*) from reveals where match_id = current_setting('t.match')::uuid) = 1, '10e message avec deux accords : reveal déclenché');
select pg_temp.ok(can_view_photos(current_setting('t.her')::uuid, current_setting('t.me')::uuid), 'Après le reveal, elle voit les photos de Lucien');
-- 7. Son debrief est privé.
insert into meetings (match_id, user_id) values (:'match', :'her');
insert into debriefs (match_id, user_id, rating, see_again, note) values (:'match', :'her', 4, 'oui', 'Note privée');
reset role;

-- 8. Côté Lucien.
select pg_temp.as_user(:'me'); set local role authenticated;
select pg_temp.ok(can_view_photos(current_setting('t.me')::uuid, current_setting('t.her')::uuid), 'Lucien voit aussi ses photos (reveal mutuel)');
select pg_temp.ok((select count(*) from debriefs where user_id = current_setting('t.her')::uuid) = 0, 'Debrief privé : Lucien ne lit pas le sien');
select pg_temp.ok((select count(*) from answers where user_id = current_setting('t.her')::uuid) = 0, 'Lucien ne lit pas ses réponses au questionnaire');
select pg_temp.ok((select count(*) from profiles where id = current_setting('t.her')::uuid) = 0, 'Lucien ne lit pas son profil complet (date de naissance, position)');
do $$ begin
  update reveal_consents set ready = false where user_id = current_setting('t.me')::uuid;
  perform pg_temp.ok(false, 'Retirer son accord après le reveal devrait être refusé');
exception when raise_exception then perform pg_temp.ok(true, 'Impossible de retirer son accord après le reveal');
end $$;
do $$ begin
  perform 1 from public_profiles limit 1;
  perform pg_temp.ok(false, 'La vue public_profiles devrait être fermée');
exception when insufficient_privilege then perform pg_temp.ok(true, 'Pas d’accès direct à la liste des profils');
end $$;
do $$ begin
  insert into reveals (match_id) values (gen_random_uuid());
  perform pg_temp.ok(false, 'Créer un reveal soi-même devrait être refusé');
exception when insufficient_privilege then perform pg_temp.ok(true, 'Impossible de forcer un reveal depuis l’app');
end $$;
reset role;

-- 9. Un intrus (autre utilisateur) ne voit rien de cette conversation et ne peut pas y écrire.
select pg_temp.as_user(:'intruder'); set local role authenticated;
select pg_temp.ok((select count(*) from messages where match_id = current_setting('t.match')::uuid) = 0, 'Un intrus ne lit pas les messages');
select pg_temp.ok((select count(*) from reveals where match_id = current_setting('t.match')::uuid) = 0, 'Un intrus ne voit pas le reveal');
select pg_temp.ok(not can_view_photos(current_setting('t.intruder')::uuid, current_setting('t.her')::uuid), 'Un intrus ne voit pas les photos');
do $$ begin
  insert into messages (match_id, sender_id, body) values (current_setting('t.match')::uuid, current_setting('t.intruder')::uuid, 'Intrusion');
  perform pg_temp.ok(false, 'Un intrus ne devrait pas pouvoir écrire');
exception when insufficient_privilege then perform pg_temp.ok(true, 'Un intrus ne peut pas écrire dans la conversation');
end $$;
reset role;

-- 10. Visiteur non connecté.
select set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
select pg_temp.ok((select count(*) from profiles) = 0 and (select count(*) from messages) = 0, 'Un visiteur non connecté ne voit aucun profil ni message');
reset role;

-- 11. Inscription d'un nouveau membre depuis l'app (numéro vérifié par SMS).
select gen_random_uuid() as newbie \gset
insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values (:'newbie', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '33600000099', now(), now(), now(), '{}', '{}');
select set_config('t.newbie', :'newbie', true) \g /dev/null
select pg_temp.as_user(:'newbie'); set local role authenticated;
-- Il tente de se déclarer abonné et vérifié : ignoré.
insert into profiles (id, first_name, birth_date, gender, seeking, age_min, age_max, zone, lat, lng, subscription_status, selfie_verified_at)
  values (:'newbie', 'Nouveau', current_date - interval '31 years', 'homme', '{femme}', 28, 36, 'Paris 10e', 48.876, 2.361, 'active', now());
select pg_temp.ok((select subscription_status = 'none' and selfie_verified_at is null and phone_verified_at is not null
  from profiles where id = current_setting('t.newbie')::uuid), 'Inscription : impossible de se déclarer abonné ou vérifié soi-même ; numéro vérifié repris du SMS');
update profiles set subscription_status = 'active' where id = current_setting('t.newbie')::uuid;
select pg_temp.ok((select subscription_status from profiles where id = current_setting('t.newbie')::uuid) = 'none', 'Impossible de s’activer un abonnement depuis l’app');
do $$ begin
  update profiles set birth_date = current_date - interval '17 years' where id = current_setting('t.newbie')::uuid;
  perform pg_temp.ok(false, 'Un profil de moins de 18 ans devrait être refusé');
exception when raise_exception then perform pg_temp.ok(true, 'Profil de moins de 18 ans refusé');
end $$;
select pg_temp.ok(not reveal_ready(current_setting('t.newbie')::uuid), 'Sans les questions essentielles : pas encore prêt pour le reveal');
insert into answers (user_id, question_id, mine, accepted, importance)
  select current_setting('t.newbie')::uuid, e, '"x"'::jsonb, '["x"]'::jsonb, 10 from unnest(reveal_essentials()) e where e <> 'religion';
select pg_temp.ok(not reveal_ready(current_setting('t.newbie')::uuid), 'Une question essentielle manquante : toujours pas prêt');
insert into answers (user_id, question_id, mine, importance, skipped) values (:'newbie', 'religion', '""', 0, true);
select pg_temp.ok(reveal_ready(current_setting('t.newbie')::uuid), 'Questions essentielles faites (question sensible passée) : prêt pour le reveal');
reset role;
select pg_temp.as_user(:'me'); set local role authenticated;
select pg_temp.ok((select count(*) from answers where user_id = current_setting('t.newbie')::uuid) = 0
  and (select count(*) from profiles where id = current_setting('t.newbie')::uuid) = 0, 'Les réponses du nouveau membre restent privées');
reset role;

rollback;
