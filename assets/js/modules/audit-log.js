/**
 * Abu Hudhayfah Exchange & Transfers - Audit Log Module
 */

import { db } from '../core/db.js';
import { formatDate, formatDateTime } from '../utils/formatters.js';
import { showToast } from '../ui/toast.js';
import { showConfirmDialog } from '../ui/modal.js';

export async function initAuditLog() {
  await renderAuditLogList();
  setupAuditLogEvents();
}

export async function renderAuditLogList() {
  const tableBody = document.getElementById('audit-log-table-body');
  const countEl = document.getElementById('audit-log-count-badge');
  if (!tableBody) return;

  const searchInput = document.getElementById('audit-search-input')?.value.trim().toLowerCase() || '';
  const moduleFilter = document.getElementById('audit-filter-module')?.value || '';
  const actionFilter = document.getElementById('audit-filter-action')?.value || '';

  const logs = await db.getAll('audit_logs');

  const filtered = logs.filter(log => {
    if (moduleFilter && log.module !== moduleFilter) return false;
    if (actionFilter && log.action !== actionFilter) return false;

    if (searchInput) {
      const matchDesc = (log.description || '').toLowerCase().includes(searchInput);
      const matchUser = (log.user || '').toLowerCase().includes(searchInput);
      const matchRec = (log.recordId || '').toLowerCase().includes(searchInput);
      if (!matchDesc && !matchUser && !matchRec) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} عملية`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-muted">لا توجد سجلات مطابقة.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => {
    return `
      <tr>
        <td class="font-mono text-xs text-slate-500">${formatDateTime(log.timestamp)}</td>
        <td><span class="activity-action-tag">${log.action}</span></td>
        <td><span class="badge badge-subtle-blue">${log.module}</span></td>
        <td class="font-mono text-xs font-semibold text-slate-700">${log.recordId || '—'}</td>
        <td class="text-sm text-slate-800">${log.description}</td>
        <td><span class="text-xs font-semibold text-slate-700"><i class="fa-solid fa-user-shield text-xs ml-1 text-primary"></i> ${log.user}</span></td>
      </tr>
    `;
  }).join('');
}

function setupAuditLogEvents() {
  const searchInput = document.getElementById('audit-search-input');
  const moduleFilter = document.getElementById('audit-filter-module');
  const actionFilter = document.getElementById('audit-filter-action');
  const clearBtn = document.getElementById('btn-clear-audit-logs');

  if (searchInput) searchInput.addEventListener('input', () => renderAuditLogList());
  if (moduleFilter) moduleFilter.addEventListener('change', () => renderAuditLogList());
  if (actionFilter) actionFilter.addEventListener('change', () => renderAuditLogList());

  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'تأكيد مسح سجل العمليات',
        message: 'هل أنت متأكد من رغبتك في تفريغ سجل العمليات والتدقيق؟',
        confirmText: 'نعم، تفريغ السجل',
        isDanger: true
      });
      if (confirmed) {
        await db.clear('audit_logs');
        showToast('تم تفريغ سجل العمليات.');
        await renderAuditLogList();
      }
    });
  }
}
