import { spawnSync } from 'node:child_process';
import process from 'node:process';

/**
 * Starts the API and website through Docker Compose.
 * @returns Nothing.
 */
const result = spawnSync(
  'docker',
  ['compose', 'up', '--build', '-d'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

process.exit(result.status ?? 1);
