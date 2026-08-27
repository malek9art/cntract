/**
 * Abu Hudhayfah Exchange & Transfers - Salaries & Payroll Module
 * Strict separation between YER and SAR currencies without cross-conversion.
 */

import { db } from '../core/db.js';
import { formatCurrency, formatDate, tafqeetArabic } from '../utils/formatters.js';
import { previewAndPrintDocument, renderDocumentHeader, renderDocumentFooter, renderSignatureBlock } from '../services/pdf-service.js';

export async function initSalaries() {
  await renderSalaryFilters();
  await renderSalariesList();
  setupSalaryEvents();
}

export async function renderSalaryFilters() {
  const branches = await db.getAll('branches');
  const branchSelect = document.getElementById('salary-filter-branch');
  if (branchSelect) {
    branchSelect.innerHTML = `<option value="">جميع الفروع</option>` +
      branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  }
}

export async function renderSalariesList() {
  const tableBody = document.getElementById('salaries-table-body');
  if (!tableBody) return;

  const searchInput = document.getElementById('salary-search-input')?.value.trim().toLowerCase() || '';
  const branchFilter = document.getElementById('salary-filter-branch')?.value || '';
  const currencyFilter = document.getElementById('salary-filter-currency')?.value || '';

  const employees = await db.getAll('employees');
  const activeEmployees = employees.filter(e => e.status === 'active');

  const filtered = activeEmployees.filter(e => {
    if (branchFilter && e.branchId !== branchFilter) return false;
    if (currencyFilter && e.currency !== currencyFilter) return false;

    if (searchInput) {
      const matchName = (e.fullName || '').toLowerCase().includes(searchInput);
      const matchCode = (e.code || '').toLowerCase().includes(searchInput);
      const matchJob = (e.jobTitle || '').toLowerCase().includes(searchInput);
      if (!matchName && !matchCode && !matchJob) return false;
    }
    return true;
  });

  // Calculate totals strictly separated by currency
  let totalBaseYER = 0, totalAllowYER = 0, totalDedYER = 0, totalNetYER = 0;
  let totalBaseSAR = 0, totalAllowSAR = 0, totalDedSAR = 0, totalNetSAR = 0;

  activeEmployees.forEach(e => {
    const base = Number(e.baseSalary || 0);
    const allow = Number(e.allowances || 0);
    const ded = Number(e.deductions || 0);
    const net = base + allow - ded;

    if (e.currency === 'SAR') {
      totalBaseSAR += base;
      totalAllowSAR += allow;
      totalDedSAR += ded;
      totalNetSAR += net;
    } else {
      totalBaseYER += base;
      totalAllowYER += allow;
      totalDedYER += ded;
      totalNetYER += net;
    }
  });

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('salary-kpi-net-yer', formatCurrency(totalNetYER, 'YER'));
  setTxt('salary-kpi-count-yer', `${activeEmployees.filter(e => e.currency !== 'SAR').length} موظف`);
  setTxt('salary-kpi-net-sar', formatCurrency(totalNetSAR, 'SAR'));
  setTxt('salary-kpi-count-sar', `${activeEmployees.filter(e => e.currency === 'SAR').length} موظف`);

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-muted">لا يوجد موظفون مطابقون للشروط.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(e => {
    const base = Number(e.baseSalary || 0);
    const allow = Number(e.allowances || 0);
    const ded = Number(e.deductions || 0);
    const net = base + allow - ded;

    return `
      <tr>
        <td>
          <div class="font-bold text-slate-800">${e.fullName}</div>
          <div class="text-xs text-muted font-mono">${e.code} • ${e.jobTitle || '—'}</div>
        </td>
        <td><i class="fa-solid fa-building text-xs text-muted ml-1"></i> ${e.branchName || '—'}</td>
        <td><span class="badge ${e.currency === 'SAR' ? 'badge-amber' : 'badge-subtle-blue'}">${e.currency === 'SAR' ? 'ريال سعودي (SAR)' : 'ريال يمني (YER)'}</span></td>
        <td class="font-semibold text-slate-800">${formatCurrency(base, e.currency)}</td>
        <td class="text-emerald font-semibold">+ ${formatCurrency(allow, e.currency)}</td>
        <td class="text-rose font-semibold">- ${formatCurrency(ded, e.currency)}</td>
        <td>
          <div class="font-black text-slate-900 text-base">${formatCurrency(net, e.currency)}</div>
        </td>
        <td class="text-end table-actions">
          <button class="btn btn-sm btn-outline" data-action="print-salary-slip" data-id="${e.id}" title="طباعة قسيمة الراتب">
            <i class="fa-solid fa-receipt ml-1"></i> قسيمة راتب
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export async function printEmployeeSalarySlip(employeeId) {
  const emp = await db.get('employees', employeeId);
  if (!emp) return;

  const settings = await db.get('settings', 'company_settings');
  const base = Number(emp.baseSalary || 0);
  const allow = Number(emp.allowances || 0);
  const ded = Number(emp.deductions || 0);
  const net = base + allow - ded;
  const tafqeet = tafqeetArabic(net, emp.currency);

  const monthName = new Date().toLocaleDateString('ar-YE', { month: 'long', year: 'numeric' });
  const slipDocNum = `SLIP-${emp.code}-${new Date().toISOString().slice(0, 7)}`;

  const headerHtml = renderDocumentHeader(settings, `قسيمة الراتب الشهري - ${monthName}`, slipDocNum, new Date().toISOString().split('T')[0]);
  const footerHtml = renderDocumentFooter(settings, slipDocNum);

  const html = `
    <div class="printable-a4-document salary-slip-document">
      ${headerHtml}

      <div class="voucher-info-box mb-6">
        <table class="voucher-meta-table">
          <tr>
            <td><strong>اسم الموظف:</strong> ${emp.fullName}</td>
            <td><strong>الرقم الوظيفي:</strong> <span class="font-mono">${emp.code}</span></td>
          </tr>
          <tr>
            <td><strong>المسمى الوظيفي:</strong> ${emp.jobTitle || '—'}</td>
            <td><strong>الفرع / الإدارة:</strong> ${emp.branchName || '—'}</td>
          </tr>
          <tr>
            <td><strong>رقم الهوية:</strong> <span class="font-mono">${emp.nationalId}</span></td>
            <td><strong>شهر الاستحقاق:</strong> ${monthName}</td>
          </tr>
        </table>
      </div>

      <div class="salary-slip-breakdown-card mb-6">
        <h3 class="section-card-title"><i class="fa-solid fa-calculator text-primary"></i> تفاصيل مفردات الراتب والمستحقات المالية</h3>
        <table class="doc-data-table">
          <thead>
            <tr>
              <th>بيان الاستحقاقات (الإضافات)</th>
              <th>المبلغ</th>
              <th>بيان الاستقطاعات (الخصومات)</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>الراتب الأساسي</td>
              <td class="font-bold">${formatCurrency(base, emp.currency)}</td>
              <td>خصم التأمينات الاجتماعية</td>
              <td class="text-rose font-bold">${formatCurrency(ded, emp.currency)}</td>
            </tr>
            <tr>
              <td>بدل سكن وانتقال ومخصصات أخرى</td>
              <td class="text-emerald font-bold">${formatCurrency(allow, emp.currency)}</td>
              <td>استقطاعات وجزاءات أخرى</td>
              <td class="text-rose font-bold">0 ${emp.currency === 'SAR' ? 'ر.س' : 'ر.ي'}</td>
            </tr>
            <tr class="highlight-total-row">
              <td><strong>إجمالي الاستحقاقات:</strong></td>
              <td class="font-bold text-emerald">${formatCurrency(base + allow, emp.currency)}</td>
              <td><strong>إجمالي الخصومات:</strong></td>
              <td class="font-bold text-rose">${formatCurrency(ded, emp.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div class="net-payable-box mt-4 p-4 rounded bg-primary/10 border border-primary/20 flex justify-between items-center">
          <div>
            <span class="text-sm text-slate-700 block font-bold">صافي المبلغ المستحق للصرف:</span>
            <div class="text-xs text-muted mt-1 font-semibold">${tafqeet}</div>
          </div>
          <div class="text-2xl font-black text-primary">${formatCurrency(net, emp.currency)}</div>
        </div>
      </div>

      <div class="voucher-declaration-box">
        <h4 class="declaration-title"><i class="fa-solid fa-signature"></i> إقرار استلام الراتب</h4>
        <p class="declaration-text">
          أقر أنا الموظف المذكور أعلاه بأنني قد استلمت كامل مستحقاتي عن الشهر الموضح أعلاه وفق البيانات المرفقة، وليس لدي أي مطالبات مالية سابقة حتى تاريخه.
        </p>
      </div>

      ${renderSignatureBlock(emp.fullName, 'أ. عبدالسلام الحداد (مدير الموارد البشرية والمحاسب العام)', true)}

      ${footerHtml}
    </div>
  `;

  await previewAndPrintDocument(`قسيمة راتب - ${emp.fullName}`, html, `قسيمة_راتب_${emp.code}.pdf`, { module: 'الرواتب', recordId: emp.id });
}

export async function printPayrollSummarySheet() {
  const employees = await db.getAll('employees');
  const activeEmployees = employees.filter(e => e.status === 'active');
  const settings = await db.get('settings', 'company_settings');

  const monthName = new Date().toLocaleDateString('ar-YE', { month: 'long', year: 'numeric' });
  const sheetDocNum = `PAYROLL-${new Date().toISOString().slice(0, 7)}`;

  const headerHtml = renderDocumentHeader(settings, `كشف مسير الرواتب العام - ${monthName}`, sheetDocNum, new Date().toISOString().split('T')[0]);
  const footerHtml = renderDocumentFooter(settings, sheetDocNum);

  const rowsHtml = activeEmployees.map((e, idx) => {
    const base = Number(e.baseSalary || 0);
    const allow = Number(e.allowances || 0);
    const ded = Number(e.deductions || 0);
    const net = base + allow - ded;

    return `
      <tr>
        <td class="text-center font-mono text-xs">${idx + 1}</td>
        <td class="font-mono text-xs">${e.code}</td>
        <td><strong>${e.fullName}</strong></td>
        <td>${e.jobTitle || '—'}</td>
        <td>${e.branchName || '—'}</td>
        <td><span class="badge ${e.currency === 'SAR' ? 'badge-amber' : 'badge-subtle-blue'} text-xs">${e.currency}</span></td>
        <td>${formatCurrency(base, e.currency)}</td>
        <td class="text-emerald">+${formatCurrency(allow, e.currency)}</td>
        <td class="text-rose">-${formatCurrency(ded, e.currency)}</td>
        <td><strong>${formatCurrency(net, e.currency)}</strong></td>
        <td class="signature-cell">.....................</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="printable-a4-document payroll-summary-document">
      ${headerHtml}

      <div class="table-responsive mb-6">
        <table class="doc-data-table">
          <thead>
            <tr>
              <th width="30">#</th>
              <th>الرقم</th>
              <th>اسم الموظف</th>
              <th>المسمى الوظيفي</th>
              <th>الفرع</th>
              <th>العملة</th>
              <th>الأساسي</th>
              <th>البدلات</th>
              <th>الخصم</th>
              <th>صافي الراتب</th>
              <th>توقيع الموظف</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      ${renderSignatureBlock('المحاسب المالي العام', 'المدير العام التنفيذي', true)}

      ${footerHtml}
    </div>
  `;

  await previewAndPrintDocument(`مسير الرواتب - ${monthName}`, html, `مسير_رواتب_${sheetDocNum}.pdf`, { module: 'الرواتب', recordId: 'ALL' });
}

function setupSalaryEvents() {
  const searchInput = document.getElementById('salary-search-input');
  const branchFilter = document.getElementById('salary-filter-branch');
  const currencyFilter = document.getElementById('salary-filter-currency');
  const printPayrollBtn = document.getElementById('btn-print-full-payroll');

  if (searchInput) searchInput.addEventListener('input', () => renderSalariesList());
  if (branchFilter) branchFilter.addEventListener('change', () => renderSalariesList());
  if (currencyFilter) currencyFilter.addEventListener('change', () => renderSalariesList());
  if (printPayrollBtn) printPayrollBtn.addEventListener('click', () => printPayrollSummarySheet());

  document.addEventListener('click', async (e) => {
    const slipBtn = e.target.closest('[data-action="print-salary-slip"]');
    if (slipBtn) {
      printEmployeeSalarySlip(slipBtn.dataset.id);
    }
  });
}
