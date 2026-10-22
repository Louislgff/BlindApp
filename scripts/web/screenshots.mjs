// Ouvre la version web publiée comme sur un téléphone, prend des captures et relève les erreurs.
// Usage : node scripts/web/screenshots.mjs https://blind.expo.app
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2];
mkdirSync('reports/web', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const steps = [];
async function shot(name, label) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `reports/web/${name}.png` });
  steps.push(`| ${label} | ![](web/${name}.png) |`);
}
async function tap(text) {
  try { await page.getByText(text, { exact: true }).last().click({ timeout: 8000 }); return true; }
  catch { steps.push(`| ⚠️ Introuvable : « ${text} » | |`); return false; }
}

await page.goto(url, { waitUntil: 'networkidle' });
await shot('1-accueil', 'Accueil');
if (await tap('Aperçu du jour du reveal')) await shot('2-reveal', 'Reveal de 20 h');
await page.goto(url, { waitUntil: 'networkidle' });
if (await tap('Messages')) await shot('3-messages', 'Messages');
if (await tap('Profil')) await shot('4-profil', 'Profil');
// Inscription : écran du numéro, puis tentative d'envoi d'un code (montre le message si les SMS ne sont pas encore activés).
await page.goto(url, { waitUntil: 'networkidle' });
if (await tap('Créer mon compte')) {
  await shot('5-numero', 'Inscription : numéro');
  try {
    await page.getByLabel('Numéro de téléphone').fill('06 12 34 56 78');
    await tap('Recevoir le code');
    await shot('6-envoi-code', 'Inscription : envoi du code');
  } catch { steps.push('| ⚠️ Saisie du numéro impossible | |'); }
}
// Questionnaire (démo) : les bases et la barre de progression.
await page.goto(url, { waitUntil: 'networkidle' });
if (await tap('Profil') && await tap('Mes réponses')) { await shot('7-mes-reponses', 'Mes réponses'); }
await browser.close();

writeFileSync('reports/web.md', [
  '# Version web', '', `Lien : ${url}`, '', `_Contrôlée automatiquement le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}._`, '',
  errors.length ? `**Erreurs dans la page (${errors.length})** :\n\n${errors.slice(0, 10).map((e) => '- `' + e.slice(0, 200) + '`').join('\n')}` : '✅ Aucune erreur dans la page.', '',
  '| Écran | Capture |', '|---|---|', ...steps, '',
].join('\n'));
console.log(errors.length ? `${errors.length} erreurs` : 'OK');
