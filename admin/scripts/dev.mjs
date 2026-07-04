// Arranca API (node --watch) y Vite en paralelo para desarrollo.
import { spawn } from 'node:child_process';

const procs = [
  spawn('node', ['--watch', 'server/index.js'], { stdio: 'inherit' }),
  spawn('npx', ['vite'], { stdio: 'inherit', shell: process.platform === 'win32' }),
];

for (const p of procs) {
  p.on('exit', (code) => {
    for (const other of procs) if (!other.killed) other.kill();
    process.exit(code ?? 0);
  });
}
process.on('SIGINT', () => procs.forEach((p) => p.kill('SIGINT')));
