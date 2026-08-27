/**
 * Abu Hudhayfah Exchange & Transfers - Handover & Return Vouchers Module
 */

import { db } from '../core/db.js';
import { formatDate } from '../utils/formatters.js';
import { previewAndPrintDocument, buildCustodyHandoverVoucherHtml, buildCustodyReturnVoucherHtml } from '../services/pdf-service.js';

export async function initVouchers() {
  await renderVouchersList();
  setupVoucherEvents();
}

export async function renderVouchersList() {
  const tableBody = document.getElementById('vouchers-table-body');
  const countEl = document.getElementById('vouchers-count-badge');
  if (!tableBody) return;

  const typeFilter = document.getElementById('voucher-filter-type')?.value || '';
  const searchInput = document.getElementById('voucher-search-input')?.value.trim().toLowerCase() || '';

  const vouchers = await db.getAll('vouchers');

  const filtered = vouchers.filter(v => {
    if (typeFilter && v.type !== typeFilter) return false;
    if (searchInput) {
      const matchNum = (v.voucherNumber || '').toLowerCase().includes(searchInput);
      const matchEmp = (v.employeeName || '').toLowerCase().includes(searchInput);
      if (!matchNum && !matchEmp) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} محضر`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-muted">لا توجد محاضر مطابقة للبحث.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).map(v => {
    const isHandover = v.type === 'handover';
    const itemsSummary = v.items ? v.items.map(i => i.name).join('، ') : '—';

    return `
      <tr>
        <td class="font-mono font-bold text-primary">${v.voucherNumber}</td>
        <td>
          <span class="badge ${isHandover ? 'badge-blue' : 'badge-emerald'}">
            <i class="fa-solid ${isHandover ? 'fa-hand-holding-hand' : 'fa-rotate-left'} text-xs ml-1"></i>
            ${isHandover ? 'محضر استلام وتسليم عهدة' : 'محضر إرجاع عهدة ومخالصة'}
          </span>
        </td>
        <td>
          <div class="font-bold text-slate-800">${v.employeeName}</div>
          <div class="text-xs text-muted">${v.jobTitle || 'موظف'}</div>
        </td>
        <td>${formatDate(v.date)}</td>
        <td>
          <div class="text-sm font-medium text-slate-700 line-clamp-1">${itemsSummary}</div>
          <div class="text-xs text-muted">${v.branchName || 'المركز الرئيسي'}</div>
        </td>
        <td class="text-end table-actions">
          <button class="btn btn-sm btn-primary" data-action="view-voucher-pdf" data-id="${v.id}" title="معاينة وطباعة المحضر">
            <i class="fa-solid fa-print ml-1"></i> طباعة المحضر
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function setupVoucherEvents() {
  const searchInput = document.getElementById('voucher-search-input');
  const typeFilter = document.getElementById('voucher-filter-type');

  if (searchInput) searchInput.addEventListener('input', () => renderVouchersList());
  if (typeFilter) typeFilter.addEventListener('change', () => renderVouchersList());

  document.addEventListener('click', async (e) => {
    const viewBtn = e.target.closest('[data-action="view-voucher-pdf"]');
    if (viewBtn) {
      const voucher = await db.get('vouchers', viewBtn.dataset.id);
      if (voucher) {
        const employee = voucher.employeeId ? await db.get('employees', voucher.employeeId) : null;
        const settings = await db.get('settings', 'company_settings');

        let html = '';
        if (voucher.type === 'handover') {
          html = buildCustodyHandoverVoucherHtml(voucher, employee, settings);
        } else {
          html = buildCustodyReturnVoucherHtml(voucher, employee, settings);
        }

        const title = voucher.type === 'handover' ? `محضر استلام عهدة - ${voucher.voucherNumber}` : `محضر إرجاع عهدة - ${voucher.voucherNumber}`;
        await previewAndPrintDocument(title, html, `محضر_${voucher.voucherNumber}.pdf`, { module: 'المحاضر', recordId: voucher.id });
      }
    }
  });
}
