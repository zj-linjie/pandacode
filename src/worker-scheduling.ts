import type { TeamWorker } from './architect-types';
import { t } from './i18n.ts';

/** The same eligibility rule drives preview launches and queued-worker explanations. */
export function workerQueueReason(worker: TeamWorker, workers: TeamWorker[], maxParallel: number): string | undefined {
  if (worker.status !== 'queued') return;
  if (worker.dependsOn.some(id => !workers.some(other => other.id === id && other.status === 'completed'))) return t('Waiting for a dependency');
  const active = workers.filter(other => other.status === 'running' || other.status === 'waiting');
  if (maxParallel > 0 && active.length >= maxParallel) return t('Waiting for an available worker slot');
  if (worker.readOnly) return;
  const blocker = active.find(other => !other.readOnly && (
    !worker.files.length || !other.files.length || worker.files.some(file => other.files.some(scope => {
      const path = file.toLowerCase(), root = scope.toLowerCase();
      return path === root || path.startsWith(`${root}/`) || root.startsWith(`${path}/`);
    }))
  ));
  if (blocker) return t`Waiting for ${blocker.name} to finish editing shared files`;
}
