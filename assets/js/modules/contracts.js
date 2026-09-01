/**
 * Abu Hudhayfah Exchange & Transfers - Contracts Management & Versioning Module
 */

import { db } from '../core/db.js';
import { CONTRACT_TYPES, CONTRACT_STATUSES } from '../data/constants.js';
import { formatCurrency, formatDate, getDaysRemaining } from '../utils/formatters.js';
import { validateContract } from '../utils/validators.js';
import { generateId, deepClone, escapeHtml } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';
import { previewAndPrintDocument, buildContractDocumentHtml } from '../services/pdf-service.js';

let currentEditingContractId = null;
let activeContractClauses = [];

export async function initContracts() {
  await renderContractFilters();
  await renderContractsList();
  setupContractEvents();
}

export async function renderContractFilters() {
  const branches = await db.getAll('branches');
  const branchSelect = document.getElementById('contract-filter-branch');
  if (branchSelect) {
    const current = branchSelect.value;
    branchSelect.innerHTML = `<option value="">جميع الفروع</option>` +
      branches.map(b => `<option value="${escapeHtml(b.id)}" ${current === b.id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('');
  }
}

export async function renderContractsList() {
  const tableBody = document.getElementById('contracts-table-body');
  const countEl = document.getElementById('contracts-count-badge');
  if (!tableBody) return;

  const searchInput = document.getElementById('contract-search-input');
  const statusFilter = document.getElementById('contract-filter-status');
  const branchFilter = document.getElementById('contract-filter-branch');
  const currencyFilter = document.getElementById('contract-filter-currency');
  const expiringFilter = document.getElementById('contract-filter-expiring');

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedStatus = statusFilter?.value || '';
  const selectedBranch = branchFilter?.value || '';
  const selectedCurrency = currencyFilter?.value || '';
  const selectedExpiring = expiringFilter?.value || '';

  const contracts = await db.getAll('contracts');

  const filtered = contracts.filter(c => {
    if (selectedStatus && c.status !== selectedStatus) return false;
    if (selectedBranch && c.branchId !== selectedBranch) return false;
    if (selectedCurrency && c.currency !== selectedCurrency) return false;

    if (selectedExpiring && c.endDate && c.status === 'approved') {
      const days = getDaysRemaining(c.endDate);
      const threshold = parseInt(selectedExpiring, 10);
      if (days === null || days < 0 || days > threshold) return false;
    }

    if (query) {
      const matchNum = (c.contractNumber || '').toLowerCase().includes(query);
      const matchEmp = (c.employeeName || '').toLowerCase().includes(query);
      const matchJob = (c.jobTitle || '').toLowerCase().includes(query);
      const matchBranch = (c.branchName || '').toLowerCase().includes(query);
      if (!matchNum && !matchEmp && !matchJob && !matchBranch) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} عقد`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-muted">
          <i class="fa-solid fa-file-excel text-3xl mb-2 text-slate-400"></i>
          <div>لم يتم العثور على عقود مطابقة للشروط المحددة.</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(c => {
    const statusMap = {
      approved: { label: 'معتمد', class: 'badge-emerald', icon: 'fa-check' },
      draft: { label: 'مسودة', class: 'badge-slate', icon: 'fa-file-lines' },
      review: { label: 'قيد المراجعة', class: 'badge-amber', icon: 'fa-clock' },
      expired: { label: 'منتهي', class: 'badge-rose', icon: 'fa-calendar-xmark' },
      cancelled: { label: 'ملغى', class: 'badge-red', icon: 'fa-ban' }
    };
    const st = statusMap[c.status] || { label: c.status, class: 'badge-slate' };

    let expiryBadge = '';
    if (c.status === 'approved' && c.endDate) {
      const daysLeft = getDaysRemaining(c.endDate);
      if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) {
        expiryBadge = `<div class="badge badge-amber text-xs mt-1"><i class="fa-solid fa-triangle-exclamation"></i> ينتهي خلال ${daysLeft} يوم</div>`;
      } else if (daysLeft !== null && daysLeft < 0) {
        expiryBadge = `<div class="badge badge-rose text-xs mt-1">منتهي منذ ${Math.abs(daysLeft)} يوم</div>`;
      }
    }

    const netSalaryFormatted = formatCurrency(c.netSalary || c.baseSalary, c.currency);

    return `
      <tr>
        <td>
          <div class="font-mono font-bold text-primary">${escapeHtml(c.contractNumber)}</div>
          <div class="text-xs text-muted"><span class="badge badge-slate text-xs font-mono">v${escapeHtml(c.version) || '1.0'}</span> • ${escapeHtml(formatDate(c.issueDate))}</div>
        </td>
        <td>
          <div class="font-bold text-slate-800">${escapeHtml(c.employeeName)}</div>
          <div class="text-xs text-muted">${escapeHtml(c.jobTitle) || '—'}</div>
        </td>
        <td>
          <span class="badge badge-subtle-blue">${escapeHtml(c.templateName || c.contractType)}</span>
          <div class="text-xs text-muted mt-1"><i class="fa-solid fa-building text-xs"></i> ${escapeHtml(c.branchName) || '—'}</div>
        </td>
        <td>
          <div class="text-sm">من: <strong>${escapeHtml(formatDate(c.startDate))}</strong></div>
          <div class="text-xs text-muted">إلى: ${c.endDate ? escapeHtml(formatDate(c.endDate)) : 'غير محدد'}</div>
          ${expiryBadge}
        </td>
        <td>
          <div class="font-bold text-slate-900">${escapeHtml(netSalaryFormatted)}</div>
          <div class="text-xs text-muted">أساسي: ${escapeHtml(formatCurrency(c.baseSalary, c.currency))}</div>
        </td>
        <td>
          <span class="badge ${st.class}"><i class="fa-solid ${st.icon || 'fa-circle'} text-xs ml-1"></i> ${escapeHtml(st.label)}</span>
        </td>
        <td class="text-end table-actions">
          <button class="btn btn-sm btn-icon btn-primary" data-action="view-contract-pdf" data-id="${escapeHtml(c.id)}" title="معاينة وطباعة العقد الرسمي">
            <i class="fa-solid fa-print"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-contract" data-id="${escapeHtml(c.id)}" title="تعديل العقد">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost" data-action="view-contract-revisions" data-id="${escapeHtml(c.id)}" title="سجل إصدارات العقد">
            <i class="fa-solid fa-code-branch"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-contract" data-id="${escapeHtml(c.id)}" title="حذف العقد">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export async function openContractModal(contractId = null, prefilledEmployeeId = null, prefilledTemplateId = null) {
  currentEditingContractId = contractId;
  const modal = document.getElementById('contract-form-modal');
  const titleEl = document.getElementById('contract-modal-title');
  const form = document.getElementById('contract-form');

  const empSelect = document.getElementById('cnt-form-employee');
  const tplSelect = document.getElementById('cnt-form-template');
  const branchSelect = document.getElementById('cnt-form-branch');
  const typeSelect = document.getElementById('cnt-form-type');

  // Populate Dropdowns
  const employees = await db.getAll('employees');
  const templates = await db.getAll('contract_templates');
  const branches = await db.getAll('branches');

  empSelect.innerHTML = `<option value="">-- اختر الموظف المتعاقد معه --</option>` +
    employees.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.fullName)} (${escapeHtml(e.code)} - ${escapeHtml(e.jobTitle)})</option>`).join('');

  tplSelect.innerHTML = `<option value="">-- اختر قالب العقد (أو عقد مخصص) --</option>` +
    templates.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${escapeHtml(t.type)})</option>`).join('');

  branchSelect.innerHTML = branches.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join('');
  typeSelect.innerHTML = CONTRACT_TYPES.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

  if (contractId) {
    titleEl.innerHTML = `<i class="fa-solid fa-file-pen text-primary"></i> تعديل عقد العمل`;
    const contract = await db.get('contracts', contractId);
    if (!contract) return;

    empSelect.value = contract.employeeId || '';
    tplSelect.value = contract.templateId || '';
    form.elements['contractNumber'].value = contract.contractNumber || '';
    form.elements['contractType'].value = contract.contractType || CONTRACT_TYPES[0];
    form.elements['status'].value = contract.status || 'approved';
    form.elements['issueDate'].value = contract.issueDate || '';
    form.elements['startDate'].value = contract.startDate || '';
    form.elements['endDate'].value = contract.endDate || '';
    form.elements['duration'].value = contract.duration || '';
    form.elements['jobTitle'].value = contract.jobTitle || '';
    form.elements['department'].value = contract.department || '';
    form.elements['branchId'].value = contract.branchId || '';
    form.elements['workplace'].value = contract.workplace || '';
    form.elements['baseSalary'].value = contract.baseSalary || 0;
    form.elements['allowances'].value = contract.allowances || 0;
    form.elements['deductions'].value = contract.deductions || 0;
    form.elements['currency'].value = contract.currency || 'YER';
    form.elements['probationPeriod'].value = contract.probationPeriod || '3 أشهر';
    form.elements['workingHours'].value = contract.workingHours || '8 ساعات يومياً';
    form.elements['workingDays'].value = contract.workingDays || 'من السبت إلى الخميس';
    form.elements['noticePeriod'].value = contract.noticePeriod || '30 يوماً';
    form.elements['notes'].value = contract.notes || '';

    activeContractClauses = deepClone(contract.clauses || []);
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-file-circle-plus text-primary"></i> إنشاء عقد عمل جديد`;
    form.reset();

    const count = await db.count('contracts');
    const year = new Date().getFullYear();
    const seq = String(count + 1).padStart(4, '0');
    form.elements['contractNumber'].value = `CNT-${year}-${seq}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];

    form.elements['issueDate'].value = todayStr;
    form.elements['startDate'].value = todayStr;
    form.elements['endDate'].value = nextYearStr;
    form.elements['duration'].value = 'سنة واحدة';
    form.elements['status'].value = 'approved';
    form.elements['contractType'].value = 'عقد موظف صراف';
    form.elements['probationPeriod'].value = '3 أشهر';
    form.elements['workingHours'].value = '8 ساعات يومياً';
    form.elements['workingDays'].value = 'من السبت إلى الخميس';
    form.elements['noticePeriod'].value = '30 يوماً';
    form.elements['baseSalary'].value = '350000';
    form.elements['allowances'].value = '0';
    form.elements['deductions'].value = '0';
    form.elements['currency'].value = 'YER';

    // Prefills
    if (prefilledEmployeeId) {
      empSelect.value = prefilledEmployeeId;
      await handleEmployeeSelectChange(prefilledEmployeeId);
    }
    if (prefilledTemplateId) {
      tplSelect.value = prefilledTemplateId;
      await handleTemplateSelectChange(prefilledTemplateId);
    } else {
      // Default to teller template
      const defaultTpl = templates.find(t => t.id === 'TPL-TELLER') || templates[0];
      if (defaultTpl) {
        tplSelect.value = defaultTpl.id;
        await handleTemplateSelectChange(defaultTpl.id);
      }
    }
  }

  calcFormNetSalary();
  renderContractClausesEditor();
  openModal(modal);
}

export async function handleEmployeeSelectChange(employeeId) {
  if (!employeeId) return;
  const emp = await db.get('employees', employeeId);
  if (!emp) return;

  const form = document.getElementById('contract-form');
  if (!form) return;

  form.elements['jobTitle'].value = emp.jobTitle || '';
  form.elements['department'].value = emp.department || '';
  if (emp.branchId) form.elements['branchId'].value = emp.branchId;
  form.elements['workplace'].value = emp.branchName || 'مقر الفرع';
  form.elements['baseSalary'].value = emp.baseSalary || 0;
  form.elements['allowances'].value = emp.allowances || 0;
  form.elements['deductions'].value = emp.deductions || 0;
  form.elements['currency'].value = emp.currency || 'YER';

  calcFormNetSalary();
}

export async function handleTemplateSelectChange(templateId) {
  if (!templateId) return;
  const tpl = await db.get('contract_templates', templateId);
  if (!tpl) return;

  const form = document.getElementById('contract-form');
  if (!form) return;

  if (tpl.type) form.elements['contractType'].value = tpl.type;
  if (tpl.defaultProbation) form.elements['probationPeriod'].value = tpl.defaultProbation;
  if (tpl.defaultHours) form.elements['workingHours'].value = tpl.defaultHours;
  if (tpl.defaultDays) form.elements['workingDays'].value = tpl.defaultDays;
  if (tpl.defaultNotice) form.elements['noticePeriod'].value = tpl.defaultNotice;

  // Load template clauses
  const allClauses = await db.getAll('contract_clauses');
  const sortedClauses = allClauses.sort((a, b) => (a.order || 0) - (b.order || 0));

  if (tpl.clauseIds && tpl.clauseIds.length > 0) {
    activeContractClauses = sortedClauses.filter(c => tpl.clauseIds.includes(c.id));
  } else {
    activeContractClauses = deepClone(sortedClauses);
  }

  renderContractClausesEditor();
}

function calcFormNetSalary() {
  const form = document.getElementById('contract-form');
  if (!form) return;
  const base = Number(form.elements['baseSalary']?.value || 0);
  const allow = Number(form.elements['allowances']?.value || 0);
  const ded = Number(form.elements['deductions']?.value || 0);
  const net = base + allow - ded;
  const netEl = document.getElementById('cnt-form-net-salary-preview');
  const currency = form.elements['currency']?.value || 'YER';
  if (netEl) {
    netEl.textContent = formatCurrency(net, currency);
  }
}

export function renderContractClausesEditor() {
  const container = document.getElementById('contract-embedded-clauses-list');
  if (!container) return;

  if (!activeContractClauses || activeContractClauses.length === 0) {
    container.innerHTML = `<div class="text-muted text-center py-4">لم يتم تحديد بنود لهذا العقد.</div>`;
    return;
  }

  container.innerHTML = activeContractClauses.map((clause, idx) => `
    <div class="embedded-clause-item flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200 mb-2">
      <div class="flex items-center gap-2">
        <span class="badge badge-slate text-xs font-mono">${idx + 1}</span>
        <strong class="text-sm text-slate-800">${escapeHtml(clause.title)}</strong>
      </div>
      <div class="flex gap-1">
        <button type="button" class="btn btn-xs btn-icon btn-ghost" data-clause-idx="${idx}" data-action="embedded-clause-up" ${idx === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
        <button type="button" class="btn btn-xs btn-icon btn-ghost" data-clause-idx="${idx}" data-action="embedded-clause-down" ${idx === activeContractClauses.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
        <button type="button" class="btn btn-xs btn-icon btn-ghost text-rose" data-clause-idx="${idx}" data-action="embedded-clause-remove"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
  `).join('');
}

export async function saveContractFromForm(e) {
  e.preventDefault();
  const form = document.getElementById('contract-form');
  const employees = await db.getAll('employees');
  const templates = await db.getAll('contract_templates');
  const branches = await db.getAll('branches');

  const empMap = new Map(employees.map(e => [e.id, e]));
  const tplMap = new Map(templates.map(t => [t.id, t]));
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  const empId = form.elements['employeeId'].value;
  const selectedEmp = empMap.get(empId);
  const tplId = form.elements['templateId'].value;
  const selectedTpl = tplMap.get(tplId);
  const branchId = form.elements['branchId'].value;
  const branchName = branchMap.get(branchId) || '';

  const baseSalary = Number(form.elements['baseSalary'].value || 0);
  const allowances = Number(form.elements['allowances'].value || 0);
  const deductions = Number(form.elements['deductions'].value || 0);
  const netSalary = baseSalary + allowances - deductions;

  const contractData = {
    contractNumber: form.elements['contractNumber'].value.trim(),
    employeeId: empId,
    employeeName: selectedEmp ? selectedEmp.fullName : '',
    templateId: tplId || null,
    templateName: selectedTpl ? selectedTpl.name : form.elements['contractType'].value,
    contractType: form.elements['contractType'].value,
    status: form.elements['status'].value,
    issueDate: form.elements['issueDate'].value,
    startDate: form.elements['startDate'].value,
    endDate: form.elements['endDate'].value || null,
    duration: form.elements['duration'].value.trim() || 'سنة واحدة',
    jobTitle: form.elements['jobTitle'].value.trim(),
    department: form.elements['department'].value.trim(),
    branchId: branchId,
    branchName: branchName,
    workplace: form.elements['workplace'].value.trim(),
    baseSalary: baseSalary,
    allowances: allowances,
    deductions: deductions,
    netSalary: netSalary,
    currency: form.elements['currency'].value,
    probationPeriod: form.elements['probationPeriod'].value.trim(),
    workingHours: form.elements['workingHours'].value.trim(),
    workingDays: form.elements['workingDays'].value.trim(),
    noticePeriod: form.elements['noticePeriod'].value.trim(),
    notes: form.elements['notes'].value.trim(),
    clauses: activeContractClauses,
    updatedAt: new Date().toISOString()
  };

  const validation = await validateContract(contractData, !!currentEditingContractId, currentEditingContractId);
  if (!validation.isValid) {
    showToast(validation.errors.join(' • '), 'error');
    return;
  }

  if (currentEditingContractId) {
    const existing = await db.get('contracts', currentEditingContractId);
    if (!existing) return;

    // Revision system logic:
    // If the contract is already "approved", saving modifications should create a new revision record!
    if (existing.status === 'approved') {
      const oldVersionNum = parseFloat(existing.version || '1.0');
      const newVersionStr = (oldVersionNum + 0.1).toFixed(1);

      // Save Revision snapshot
      const revisionRecord = {
        id: generateId('REV'),
        contractId: existing.id,
        contractNumber: existing.contractNumber,
        version: existing.version || '1.0',
        snapshot: deepClone(existing),
        reason: 'تعديل بنود وبيانات العقد بعد الاعتماد',
        updatedBy: 'مدير النظام',
        createdAt: new Date().toISOString()
      };
      await db.add('contract_revisions', revisionRecord);

      contractData.version = newVersionStr;
      contractData.revisionCount = (existing.revisionCount || 1) + 1;
      await logAudit('إصدار نسخة معدلة', 'العقود', existing.id, `تم حفظ تعديلات العقد وإصدار نسخة جديدة v${newVersionStr} مع أرشفة الإصدار v${existing.version || '1.0'}`);
    } else {
      contractData.version = existing.version || '1.0';
      contractData.revisionCount = existing.revisionCount || 1;
    }

    contractData.id = currentEditingContractId;
    contractData.createdAt = existing.createdAt;
    await db.put('contracts', contractData);
    await logAudit('تعديل', 'العقود', contractData.id, `تم تحديث بيانات العقد: ${contractData.contractNumber} للموظف ${contractData.employeeName}`);
    showToast(`تم حفظ تعديلات العقد (${contractData.contractNumber}) بنجاح.`);
  } else {
    contractData.id = generateId('CNT');
    contractData.version = '1.0';
    contractData.revisionCount = 1;
    contractData.createdAt = new Date().toISOString();
    await db.add('contracts', contractData);
    await logAudit('إنشاء', 'العقود', contractData.id, `تم إنشاء عقد جديد برقم ${contractData.contractNumber} للموظف ${contractData.employeeName}`);
    showToast(`تم إنشاء العقد الجديد (${contractData.contractNumber}) بنجاح.`);
  }

  closeModal('contract-form-modal');
  await renderContractsList();
}

export async function viewContractRevisions(contractId) {
  const contract = await db.get('contracts', contractId);
  if (!contract) return;

  const revisions = await db.find('contract_revisions', r => r.contractId === contractId);
  const modal = document.getElementById('contract-revisions-modal');
  const bodyEl = document.getElementById('contract-revisions-body');
  const titleEl = document.getElementById('contract-revisions-title');

  titleEl.innerHTML = `<i class="fa-solid fa-code-branch text-primary"></i> سجل إصدارات العقد: <span class="font-mono">${escapeHtml(contract.contractNumber)}</span>`;

  if (revisions.length === 0) {
    bodyEl.innerHTML = `
      <div class="empty-state-card text-center py-6 text-muted">
        <p>لا توجد إصدارات سابقة مؤرشفة لهذا العقد (الإصدار الحالي: <strong>v${escapeHtml(contract.version) || '1.0'}</strong>).</p>
      </div>
    `;
  } else {
    bodyEl.innerHTML = `
      <div class="mb-4 p-3 bg-emerald-50 rounded border border-emerald-200 text-sm">
        <strong class="text-emerald-800">الإصدار الحالي المعتمد:</strong> <span class="badge badge-emerald">v${escapeHtml(contract.version) || '1.0'}</span> • تاريخ التحديث: ${escapeHtml(formatDate(contract.updatedAt || contract.createdAt))}
      </div>
      <h4 class="font-bold text-slate-800 mb-2">الإصدارات السابقة المؤرشفة:</h4>
      <div class="space-y-3">
        ${revisions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(rev => `
          <div class="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
            <div>
              <div class="font-bold text-slate-800">إصدار v${escapeHtml(rev.version)}</div>
              <div class="text-xs text-muted">أرشف في: ${escapeHtml(formatDate(rev.createdAt))} • السبب: ${escapeHtml(rev.reason)}</div>
            </div>
            <button class="btn btn-sm btn-outline" data-action="print-revision-snapshot" data-rev-id="${escapeHtml(rev.id)}">
              <i class="fa-solid fa-print ml-1"></i> معاينة هذا الإصدار
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  openModal(modal);
}

function setupContractEvents() {
  const addBtn = document.getElementById('btn-add-contract');
  if (addBtn) addBtn.addEventListener('click', () => openContractModal(null));

  const form = document.getElementById('contract-form');
  if (form) {
    form.addEventListener('submit', saveContractFromForm);

    const empSelect = document.getElementById('cnt-form-employee');
    const tplSelect = document.getElementById('cnt-form-template');

    if (empSelect) empSelect.addEventListener('change', (e) => handleEmployeeSelectChange(e.target.value));
    if (tplSelect) tplSelect.addEventListener('change', (e) => handleTemplateSelectChange(e.target.value));

    ['baseSalary', 'allowances', 'deductions', 'currency'].forEach(field => {
      const input = form.elements[field];
      if (input) {
        input.addEventListener('input', calcFormNetSalary);
        input.addEventListener('change', calcFormNetSalary);
      }
    });
  }

  // Search & Filters
  const searchInput = document.getElementById('contract-search-input');
  const statusFilter = document.getElementById('contract-filter-status');
  const branchFilter = document.getElementById('contract-filter-branch');
  const currencyFilter = document.getElementById('contract-filter-currency');
  const expiringFilter = document.getElementById('contract-filter-expiring');

  if (searchInput) searchInput.addEventListener('input', () => renderContractsList());
  if (statusFilter) statusFilter.addEventListener('change', () => renderContractsList());
  if (branchFilter) branchFilter.addEventListener('change', () => renderContractsList());
  if (currencyFilter) currencyFilter.addEventListener('change', () => renderContractsList());
  if (expiringFilter) expiringFilter.addEventListener('change', () => renderContractsList());

  // Embedded Clauses Reordering within Contract Form
  document.addEventListener('click', (e) => {
    const upBtn = e.target.closest('[data-action="embedded-clause-up"]');
    if (upBtn) {
      const idx = parseInt(upBtn.dataset.clauseIdx, 10);
      if (idx > 0) {
        const temp = activeContractClauses[idx];
        activeContractClauses[idx] = activeContractClauses[idx - 1];
        activeContractClauses[idx - 1] = temp;
        renderContractClausesEditor();
      }
    }

    const downBtn = e.target.closest('[data-action="embedded-clause-down"]');
    if (downBtn) {
      const idx = parseInt(downBtn.dataset.clauseIdx, 10);
      if (idx < activeContractClauses.length - 1) {
        const temp = activeContractClauses[idx];
        activeContractClauses[idx] = activeContractClauses[idx + 1];
        activeContractClauses[idx + 1] = temp;
        renderContractClausesEditor();
      }
    }

    const removeBtn = e.target.closest('[data-action="embedded-clause-remove"]');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.clauseIdx, 10);
      activeContractClauses.splice(idx, 1);
      renderContractClausesEditor();
    }

    const editBtn = e.target.closest('[data-action="edit-contract"]');
    if (editBtn) openContractModal(editBtn.dataset.id);

    const revisionsBtn = e.target.closest('[data-action="view-contract-revisions"]');
    if (revisionsBtn) viewContractRevisions(revisionsBtn.dataset.id);

    const useTplBtn = e.target.closest('[data-action="use-template"]');
    if (useTplBtn) openContractModal(null, null, useTplBtn.dataset.id);

    const newForEmpBtn = e.target.closest('[data-action="new-contract-for-emp"]');
    if (newForEmpBtn) openContractModal(null, newForEmpBtn.dataset.id);

    const printRevBtn = e.target.closest('[data-action="print-revision-snapshot"]');
    if (printRevBtn) {
      (async () => {
        const rev = await db.get('contract_revisions', printRevBtn.dataset.revId);
        if (rev && rev.snapshot) {
          const employee = await db.get('employees', rev.snapshot.employeeId);
          const settings = await db.get('settings', 'company_settings');
          const html = buildContractDocumentHtml(rev.snapshot, employee, settings);
          await previewAndPrintDocument(`عقد عمل (نسخة تاريخية v${rev.version}) - ${rev.snapshot.employeeName}`, html, `عقد_تاريخي_${rev.contractNumber}_v${rev.version}.pdf`);
        }
      })();
    }

    const deleteBtn = e.target.closest('[data-action="delete-contract"]');
    if (deleteBtn) {
      (async () => {
        const contract = await db.get('contracts', deleteBtn.dataset.id);
        if (contract) {
          const confirmed = await showConfirmDialog({
            title: 'تأكيد إلغاء / حذف العقد',
            message: `هل أنت متأكد من رغبتك في حذف العقد <strong>(${contract.contractNumber})</strong> للموظف (${contract.employeeName})؟`,
            confirmText: 'نعم، حذف العقد',
            isDanger: true
          });
          if (confirmed) {
            await db.delete('contracts', contract.id);
            await logAudit('حذف', 'العقود', contract.id, `تم حذف العقد: ${contract.contractNumber}`);
            showToast(`تم حذف العقد (${contract.contractNumber}).`);
            await renderContractsList();
          }
        }
      })();
    }
  });
}
