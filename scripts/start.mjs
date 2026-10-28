import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = new URL('../', import.meta.url);
const webEnvUrl = new URL('apps/web/.env', root);

/**
 * Reads a Vite environment variable from the frontend environment file.
 * @param name Environment variable name.
 * @returns The configured value or undefined.
 */
function readWebEnv(name) {
  try {
    const line = readFileSync(webEnvUrl, 'utf8')
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${name}=`));
    return line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return undefined;
  }
}

/**
 * Runs a command and exits when it fails.
 * @param command Command to run.
 * @param args Command arguments.
 * @returns Nothing.
 */
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const frontendPort = process.env.VITE_PORT ?? readWebEnv('VITE_PORT') ?? '51739';

run('pnpm', ['build']);
run('screen', ['-dmS', 'api-transfer', 'node', 'apps/api/dist/server.js']);
run('screen', ['-dmS', 'website-transfer', 'pnpm', 'exec', 'serve', '-s', 'apps/web/dist', '-l', frontendPort]);
