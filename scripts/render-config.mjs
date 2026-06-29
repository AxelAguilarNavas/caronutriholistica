// Genera config.js (en la raíz del proyecto) a partir de WEBHOOK_URL.
// Lee .env si existe; si no, usa process.env o el valor por defecto.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_WEBHOOK = 'https://n8n.caronutriholistica.tech/webhook/fcfad32f-13a7-4148-b2db-e9af457ba77d';

function loadEnv() {
  const env = { ...process.env };
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  }
  return env;
}

const env = loadEnv();
const webhookUrl = env.WEBHOOK_URL || DEFAULT_WEBHOOK;
const out = `window.APP_CONFIG = ${JSON.stringify({ WEBHOOK_URL: webhookUrl })};\n`;
writeFileSync(join(ROOT, 'config.js'), out);
console.log('config.js generado · WEBHOOK_URL =', webhookUrl);
