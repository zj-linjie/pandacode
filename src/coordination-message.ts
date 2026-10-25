import './coordination-message.css';
import type { Message } from './types';
import { icon } from './dom';
import { t } from './i18n.ts';

/** Only app-origin rows use this renderer; user JSON stays ordinary conversation. */
export function renderCoordination(message: Message): string {
  const label = message.coordinationKind === 'worker_review' ? t('Reviewing worker results')
    : message.coordinationKind === 'worker_update' ? t('Checking worker updates')
    : message.coordinationKind === 'continue' ? t('Continuing the plan')
    : message.coordinationKind === 'worker_failed' ? t('Handling a failed worker') : t('Coordinating team');
  return `<div class="coordination-status" role="note" aria-label="${t('Team status')}">${icon('worktree')}<strong>${t('Team')}</strong><span>${label}</span></div>`;
}
