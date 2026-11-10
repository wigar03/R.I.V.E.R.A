import { spawnSync } from 'node:child_process';

function git(...args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `git ${args[0]} falló`);
  }
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  return result.stdout.trim();
}

try {
  const branch = git('branch', '--show-current');
  if (!['frontend', 'backend'].includes(branch)) {
    throw new Error('Usar frontend o backend. develop y main reciben cambios por pull request.');
  }
  if (git('status', '--porcelain')) {
    throw new Error('Confirma o guarda tus cambios antes de sincronizar. No se hace stash automático.');
  }
  // Si hay conflictos, git pull falla y nunca se ejecuta el push.
  const pulled = git('pull', '--no-rebase', '--no-edit', 'origin', branch);
  if (pulled) console.log(pulled);
  const pushed = git('push', '--set-upstream', 'origin', branch);
  if (pushed) console.log(pushed);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
