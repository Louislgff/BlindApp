// Connexion Supabase côté app. Ces deux valeurs sont publiques par conception :
// elles sont embarquées dans l'app de chaque utilisateur. La sécurité repose sur les règles
// d'accès (RLS) définies dans supabase/schema.sql, pas sur le secret de cette clé.
// Les clés secrètes (mot de passe de la base, clé « secret ») ne doivent JAMAIS être ici :
// elles vivent uniquement dans les secrets GitHub.

export const SUPABASE_URL = 'https://dazdnrbhfhevcivfcogh.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YqbNYujOO7y1REvBzKptiA_G3tM4Cp4';
