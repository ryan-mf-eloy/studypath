// StudyPath — smoke test visual via Playwright
// Captura screenshots das telas e valida interações básicas
// Rodar: node scripts/smoke.mjs (com dev server rodando em :5173)

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = resolve(__dirname, '../tmp/screens');
const BASE_URL  = 'http://localhost:5173';

const consoleByRoute = new Map();
const errorsByRoute  = new Map();
let currentRoute = '/';

function logSection(title) {
  console.log(`\n\x1b[36m── ${title} ──\x1b[0m`);
}

function logOk(msg)   { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function logWarn(msg) { console.log(`  \x1b[33m!\x1b[0m ${msg}`); }
function logErr(msg)  { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }

async function main() {
  // Limpa screenshots antigos
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  logSection('Iniciando Chromium');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await context.newPage();

  // Captura console e erros
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      const arr = consoleByRoute.get(currentRoute) ?? [];
      arr.push(`[${type}] ${msg.text()}`);
      consoleByRoute.set(currentRoute, arr);
    }
  });
  page.on('pageerror', err => {
    const arr = errorsByRoute.get(currentRoute) ?? [];
    arr.push(err.message);
    errorsByRoute.set(currentRoute, arr);
  });

  // Limpa localStorage antes de começar (estado fresco)
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());

  // ── Rota / (Overview) ──────────────────────────────────────────────────
  logSection('Overview (/)');
  currentRoute = '/';
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400); // deixa fontes carregarem
  await page.screenshot({ path: `${OUT_DIR}/overview.png`, fullPage: true });
  logOk('overview.png');

  // ── Rota /roadmap ──────────────────────────────────────────────────────
  logSection('Roadmap (/roadmap)');
  currentRoute = '/roadmap';
  await page.goto(BASE_URL + '/roadmap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/roadmap.png`, fullPage: true });
  logOk('roadmap.png');

  // ── Rota /materias ─────────────────────────────────────────────────────
  logSection('Matérias (/materias)');
  currentRoute = '/materias';
  await page.goto(BASE_URL + '/materias', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/materias.png`, fullPage: true });
  logOk('materias.png');

  // ── Interação: expandir primeira matéria ──────────────────────────────
  logSection('Expandir primeira matéria');
  const firstSubjectExpand = page.locator('button', { hasText: 'Ver tópicos' }).first();
  await firstSubjectExpand.waitFor({ state: 'visible', timeout: 5000 });
  await firstSubjectExpand.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/materias-expanded.png`, fullPage: true });
  logOk('materias-expanded.png');

  // ── Interação: filtrar por tipo "Secundária" ──────────────────────────
  logSection('Filtrar por Secundária');
  await page.locator('button', { hasText: 'Secundária' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/materias-filter-sec.png`, fullPage: true });
  logOk('materias-filter-sec.png');

  // ── Interação: busca por "Node" ────────────────────────────────────────
  logSection('Busca por "Node"');
  await page.locator('button', { hasText: 'Todas' }).click();
  await page.waitForTimeout(150);
  await page.locator('input[placeholder="Buscar matéria..."]').fill('Node');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/materias-search.png`, fullPage: true });
  logOk('materias-search.png');

  // ── Rota /notas (estado vazio) ─────────────────────────────────────────
  logSection('Notas (/notas) — estado vazio');
  currentRoute = '/notas';
  await page.goto(BASE_URL + '/notas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/notas-empty.png`, fullPage: true });
  logOk('notas-empty.png');

  // ── Interação: criar nova nota ────────────────────────────────────────
  logSection('Criar nova nota');
  await page.locator('button', { hasText: 'Nova nota' }).click();
  await page.waitForTimeout(200);
  await page.locator('input[placeholder="Título da nota"]').fill('Minhas anotações');
  await page.locator('textarea[placeholder^="Comece a escrever"]').fill(
    '## Plano de estudo\n\n- Terminar o capítulo 3\n- Resolver exercícios\n- **Revisar** na sexta'
  );
  await page.waitForTimeout(700); // debounce save
  await page.screenshot({ path: `${OUT_DIR}/notas-new.png`, fullPage: true });
  logOk('notas-new.png');

  // ── Rota /milestones ───────────────────────────────────────────────────
  logSection('Milestones (/milestones)');
  currentRoute = '/milestones';
  await page.goto(BASE_URL + '/milestones', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/milestones.png`, fullPage: true });
  logOk('milestones.png');

  // ── Interação: marcar primeiro milestone como concluído ──────────────
  logSection('Toggle milestone para concluído');
  const firstMilestoneBtn = page
    .locator('button[aria-label^="Alternar status de"]')
    .first();
  await firstMilestoneBtn.waitFor({ state: 'visible', timeout: 5000 });
  await firstMilestoneBtn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/milestones-toggled.png`, fullPage: true });
  logOk('milestones-toggled.png');

  // ── Voltar para /roadmap para continuar fluxo anterior ────────────────
  currentRoute = '/roadmap';
  await page.goto(BASE_URL + '/roadmap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // ── Interação 1: toggle do primeiro tópico ─────────────────────────────
  logSection('Toggle do primeiro tópico');
  // Scoping para `main` exclui o sidebar (que é <aside>).
  // Filtra li que contém o botão "Abrir nota" — garante que é um TopicRow.
  const topicRows = page
    .locator('main li')
    .filter({ has: page.locator('button[aria-label="Abrir nota"]') });
  const firstTopic = topicRows.first();
  await firstTopic.waitFor({ state: 'visible', timeout: 5000 });
  const topicText = (await firstTopic.textContent())?.trim().slice(0, 50);
  logOk(`clicando em: "${topicText}"`);
  await firstTopic.click();
  await page.waitForTimeout(300); // transição de opacity
  await page.screenshot({ path: `${OUT_DIR}/roadmap-topic-toggled.png`, fullPage: true });
  logOk('roadmap-topic-toggled.png');

  // ── Interação 2: abrir NotePanel ───────────────────────────────────────
  logSection('Abrir NotePanel via ícone de nota');
  const secondTopic = topicRows.nth(1);
  await secondTopic.scrollIntoViewIfNeeded();
  await secondTopic.hover();
  // O botão tem opacity:0 quando não está em hover; força o click no DOM.
  const noteBtn = secondTopic.locator('button[aria-label="Abrir nota"]');
  await noteBtn.click({ force: true });
  // Espera o painel deslizar pra dentro (transform transition)
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/roadmap-note-panel.png`, fullPage: true });
  logOk('roadmap-note-panel.png');

  // ── Interação 3: digitar no painel ─────────────────────────────────────
  logSection('Digitar título + body');
  await page.locator('input[placeholder="Título da nota"]').fill('Teste Playwright');
  await page.locator('textarea[placeholder^="Comece a escrever"]').fill('- item 1\n- item 2\n- **negrito**');
  await page.waitForTimeout(700); // espera debounce (500ms) + margem
  await page.screenshot({ path: `${OUT_DIR}/roadmap-note-typed.png`, fullPage: true });
  logOk('roadmap-note-typed.png');

  // ── Interação 4: fechar painel com Escape ──────────────────────────────
  logSection('Fechar painel com Escape');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/roadmap-note-closed.png`, fullPage: true });
  logOk('roadmap-note-closed.png');

  await browser.close();

  // ── Relatório ──────────────────────────────────────────────────────────
  logSection('Relatório');

  const allRoutes = new Set([...consoleByRoute.keys(), ...errorsByRoute.keys()]);
  let anyErrors = false;

  if (allRoutes.size === 0) {
    logOk('Nenhum erro ou warning detectado em nenhuma rota');
  } else {
    for (const route of allRoutes) {
      const consoleMsgs = consoleByRoute.get(route) ?? [];
      const errorMsgs = errorsByRoute.get(route) ?? [];
      if (errorMsgs.length > 0) anyErrors = true;
      if (consoleMsgs.length === 0 && errorMsgs.length === 0) continue;
      console.log(`\n  ${route}:`);
      for (const m of errorMsgs) logErr(m);
      for (const m of consoleMsgs) logWarn(m);
    }
  }

  console.log(`\nScreenshots em: ${OUT_DIR}`);
  process.exit(anyErrors ? 1 : 0);
}

main().catch(err => {
  console.error('\n\x1b[31mErro fatal no script:\x1b[0m');
  console.error(err);
  process.exit(2);
});
