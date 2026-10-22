#!/usr/bin/env bash
# Démo complète sur une base : migrations, profils fictifs, deux reveals, scénario de reveal mutuel.
# Écrit le rapport dans reports/simulation.md.
# Usage : DB_URL=postgresql://... scripts/db/simulate.sh
set -euo pipefail
: "${DB_URL:?DB_URL manquant}"
work=$(mktemp -d)
report=reports/simulation.md
mkdir -p reports

scripts/db/migrate.sh

npx tsx scripts/db/seed.ts > "$work/seed.sql"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$work/seed.sql" >/dev/null

{
  echo "# Simulation des reveals"
  echo
  echo "_Généré automatiquement le $(TZ=Europe/Paris date '+%d/%m/%Y à %H:%M') sur la base Supabase, commit \`${GITHUB_SHA:-local}\`._"
  echo
  echo "Profils fictifs : Lucien et les 15 profils du prototype, plus une population de Parisiens générée au hasard (reproductible)."
  echo "Les pourcentages sont calculés par le vrai algorithme de l’app."
  echo
} > "$report"

status=0
for s in "2026-10-01T18:00:00Z|Reveal du 1er octobre" "2026-10-15T18:00:00Z|Reveal du 15 octobre"; do
  psql "$DB_URL" -tA -v ON_ERROR_STOP=1 -f scripts/db/export.sql > "$work/export.json"
  npx tsx scripts/db/reveal.ts "$work/export.json" "${s%%|*}" "${s#*|}" "$work/reveal.sql" "$report" || status=1
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$work/reveal.sql" >/dev/null
done

{
  echo "## Scénario : conversation, accord secret et reveal mutuel"
  echo
  echo "Joué sur la vraie base avec les vraies règles d’accès, entre Lucien et son premier profil du 1er octobre, puis annulé (la base n’est pas modifiée)."
  echo
} >> "$report"
if psql "$DB_URL" -q -o /dev/null -f scripts/db/scenario.sql 2> "$work/scenario.log"; then :; else status=1; fi
grep -oE '(OK|ÉCHEC) \| .*' "$work/scenario.log" | sed -E 's/^OK \| /- ✅ /; s/^ÉCHEC \| /- ❌ /' >> "$report" || true
if grep -q "ERROR" "$work/scenario.log"; then
  echo >> "$report"; echo "Erreur : \`$(grep ERROR "$work/scenario.log" | head -1 | sed 's/postgresql:[^ ]*//g')\`" >> "$report"
fi
echo >> "$report"
exit $status
