#!/usr/bin/env bash
# Applique dans l'ordre les migrations de supabase/migrations qui ne l'ont pas encore été.
# Usage : DB_URL=postgresql://... scripts/db/migrate.sh
set -euo pipefail
: "${DB_URL:?DB_URL manquant}"
psql "$DB_URL" -v ON_ERROR_STOP=1 -qc "create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now()); revoke all on public._migrations from anon, authenticated;" >/dev/null 2>&1 || \
psql "$DB_URL" -v ON_ERROR_STOP=1 -qc "create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now());"
for f in $(ls supabase/migrations/*.sql | sort); do
  name=$(basename "$f")
  done=$(psql "$DB_URL" -tAc "select 1 from public._migrations where name = '$name'")
  if [ "$done" = "1" ]; then echo "déjà appliquée : $name"; continue; fi
  echo "application : $name"
  { cat "$f"; echo; echo "insert into public._migrations (name) values ('$name');"; } | psql "$DB_URL" -v ON_ERROR_STOP=1 --single-transaction -q
done
