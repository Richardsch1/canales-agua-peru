import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCatalog, validateCatalog } from '../src/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'coverage'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (entry.name === '.env' || entry.name.startsWith('.env.')) throw new Error('No publicar archivos de entorno.');
    const content = await readFile(file, 'utf8');
    if (/(?:sk-ant-[a-zA-Z0-9_-]{20,}|gh[pousr]_[a-zA-Z0-9]{25,}|github_pat_[a-zA-Z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/u.test(content)) throw new Error(`Posible secreto en ${entry.name}.`);
    if (entry.name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr);
    }
    checked += 1;
  }
}
await scan(root);
const errors = validateCatalog(getCatalog());
if (errors.length) throw new Error(errors.join(' '));
console.info(`${checked} archivos revisados: sintaxis, contrato del catálogo y patrones básicos de secretos. Revisión de contenido humano sigue siendo necesaria.`);
