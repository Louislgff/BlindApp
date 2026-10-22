-- Exporte en JSON les profils actifs et vérifiés, avec leurs réponses, et les paires déjà proposées.
select json_build_object(
  'profiles', coalesce((
    select json_agg(json_build_object(
      'id', p.id, 'email', u.email, 'firstName', p.first_name,
      'age', date_part('year', age(p.birth_date))::int, 'gender', p.gender, 'seeking', p.seeking,
      'ageMin', p.age_min, 'ageMax', p.age_max, 'lat', p.lat, 'lng', p.lng, 'zone', p.zone,
      'maxDistanceKm', p.max_distance_km, 'lookingFor', p.looking_for, 'determinants', p.determinants,
      'answers', coalesce((select json_object_agg(a.question_id, json_build_object(
          'mine', a.mine, 'accepted', a.accepted, 'importance', a.importance, 'skipped', a.skipped))
        from answers a where a.user_id = p.id), '{}'::json)
    ) order by p.id)
    from profiles p join auth.users u on u.id = p.id
    where p.city = 'paris' and p.subscription_status = 'active' and p.selfie_verified_at is not null
      and reveal_ready(p.id)
  ), '[]'::json),
  'pairs', coalesce((select json_agg(json_build_array(user_a, user_b)) from matches), '[]'::json)
);
