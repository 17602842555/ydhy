import { spawn } from 'node:child_process';

const processes = [
  {
    name: 'api',
    command: 'npm',
    args: ['--workspace', 'apps/api', 'run', 'dev'],
    color: '\x1b[36m',
  },
  {
    name: 'web',
    command: 'npm',
    args: ['--workspace', 'apps/web', 'run', 'dev', '--', '--host', '127.0.0.1'],
    color: '\x1b[35m',
  },
];

const reset = '\x1b[0m';
const children = processes.map(({ name, command, args, color }) => {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  const prefix = `${color}[${name}]${reset}`;
  child.stdout.on('data', (chunk) => {
    process.stdout.write(`${prefix} ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk}`);
  });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${prefix} exited with code ${code}`);
      shutdown();
    }
  });
  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', shutdown);
