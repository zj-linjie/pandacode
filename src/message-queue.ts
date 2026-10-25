/** The queue above the composer: follow-ups typed while an agent works, delivered in order. */
import { t } from './i18n.ts';
import { escape, icon } from './dom';

export interface QueuedMessage {
  id: string;
  sessionId: string;
  position: number;
  text: string;
  /** Prompt attachments and mentioned file paths, as the composer described them. */
  attachments: QueuedAttachment[];
  createdAt: number;
  updatedAt: number;
}
export type QueuedAttachment = { kind: 'path'; path: string } | ({ kind: 'image' | 'document' | 'folder' | 'sketch' } & Record<string, unknown>);

export type HoldReason = 'restart' | 'failed' | 'stopped' | 'limited';
export const HOLD_LABEL: Record<HoldReason, string> = {
  restart: t('Paused after restart'),
  failed: t('Paused after the run failed'),
  stopped: t('Paused after you stopped the run'),
  limited: t('Paused until the usage limit resets'),
};

export interface QueueView {
  entries: QueuedMessage[];
  hold: HoldReason | null;
  running: boolean;
  steerable: boolean;
  /** Send now can start a turn here (bot conversations drain natively, so they cannot). */
  sendable: boolean;
  editingId: string | null;
  busy: boolean;
  /** Entries whose steer is in flight; they leave the queue once it is taken. */
  steering: ReadonlySet<string>;
}
const SPINNER = '<span class="support-spinner" aria-hidden="true"></span>';

function attachmentLabel(entry: QueuedMessage): string {
  const count = entry.attachments.length;
  return count ? `<span class="queue-attachments" title="${count} ${count === 1 ? t('attachment') : t('attachments')}">${icon('attach')}${count}</span>` : '';
}

function row(entry: QueuedMessage, index: number, view: QueueView): string {
  const last = index === view.entries.length - 1;
  if (entry.id === view.editingId) {
    return `<li class="queue-row editing" data-queue-id="${escape(entry.id)}"><textarea class="queue-edit" aria-label="${t('Edit queued message')}" rows="2">${escape(entry.text)}</textarea>
      <div class="queue-edit-actions"><button type="button" class="secondary-button" data-action="queue-cancel">${t('Cancel')}</button><button type="button" class="primary-button" data-action="queue-save">${t('Save')}</button></div></li>`;
  }
  const preview = escape(entry.text.slice(0, 60));
  if (view.steering.has(entry.id)) {
    return `<li class="queue-row steering" data-queue-id="${escape(entry.id)}" aria-busy="true"><span class="queue-index" aria-hidden="true">${index + 1}</span>
    <span class="queue-text" title="${escape(entry.text)}">${escape(entry.text.split('\n')[0] || t('(attachments only)'))}</span><span class="queue-status" role="status">${SPINNER}${t('Steering…')}</span></li>`;
  }
  const steer = view.running && view.steerable && !view.busy && !entry.attachments.length ? `<button type="button" class="queue-now" data-action="queue-steer" title="${t('Send into the running turn')}" aria-label="${t`Steer now: ${preview}`}">${icon('spark')}<span>${t('Steer')}</span></button>` : '';
  const sendNow = view.sendable && !view.busy ? `<button type="button" class="queue-now" data-action="queue-send-now" title="${!view.running ? t('Send this now') : view.steerable && !entry.attachments.length ? t('Send into the running turn') : t('Stop the run and send this next')}" aria-label="${t`Send now: ${preview}`}">${icon('arrow')}<span>${t('Send now')}</span></button>` : '';
  return `<li class="queue-row" data-queue-id="${escape(entry.id)}"><span class="queue-index" aria-hidden="true">${index + 1}</span>
    <span class="queue-text" title="${escape(entry.text)}">${escape(entry.text.split('\n')[0] || t('(attachments only)'))}</span>${attachmentLabel(entry)}
    <span class="queue-actions">${steer}${sendNow}<button type="button" class="icon-button" data-action="queue-edit" aria-label="${t`Edit queued message ${index + 1}`}" title="${t('Edit')}" ${view.busy ? 'disabled' : ''}>${icon('edit')}</button><button type="button" class="icon-button" data-action="queue-up" aria-label="${t`Move queued message ${index + 1} up`}" title="${t('Move up')}" ${index === 0 || view.busy ? 'disabled' : ''}>${icon('arrow')}</button><button type="button" class="icon-button queue-down" data-action="queue-down" aria-label="${t`Move queued message ${index + 1} down`}" title="${t('Move down')}" ${last || view.busy ? 'disabled' : ''}>${icon('arrow')}</button><button type="button" class="icon-button" data-action="queue-remove" aria-label="${t`Remove queued message ${index + 1}`}" title="${t('Remove')}" ${view.busy ? 'disabled' : ''}>${icon('close')}</button></span></li>`;
}

/** Markup for the queue panel, or an empty string when nothing is queued. */
export function queuePanel(view: QueueView): string {
  if (!view.entries.length) return '';
  const count = view.entries.length;
  // A limit is resolved from its banner (Continue now or Resume at reset), so the queue offers no Resume then.
  const resume = view.hold === 'limited' ? '' : `<button type="button" class="queue-resume" data-action="queue-resume" ${view.busy ? 'disabled' : ''}>${view.running ? t('Resume after this run') : t('Resume')}</button>`;
  const status = view.hold ? `<span class="queue-hold">${HOLD_LABEL[view.hold]}</span>${resume}`
    : `<span class="queue-next">${view.running ? t('Sends when the agent finishes') : `${SPINNER}${t('Sending next…')}`}</span>`;
  return `<section class="queue-panel" aria-label="${t('Queued messages')}"><header class="queue-heading"><strong>${t('Queued')}</strong><span class="queue-count">${count}</span>${status}</header><ol class="queue-list">${view.entries.map((entry, index) => row(entry, index, view)).join('')}</ol></section>`;
}

/** Moves an entry one place and returns the new order of ids. */
export function moved(entries: readonly QueuedMessage[], id: string, step: -1 | 1): string[] {
  const ids = entries.map(entry => entry.id);
  const index = ids.indexOf(id), target = index + step;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
}
