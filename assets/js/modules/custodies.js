/**
 * Abu Hudhayfah Exchange & Transfers - Central Custody Management Module
 */

import { db } from '../core/db.js';
import { CUSTODY_TYPES, CUSTODY_STATUSES } from '../data/constants.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { validateCustodyHandover, validateCustodyReturn } from '../utils/validators.js';
import { generateId, readFileAsDataURL } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';
import { previewAndPrintDocument, buildCustodyHandoverVoucherHtml, buildCustodyReturnVoucherHtml } from '../services/pdf-service.js';

let currentEditingCustodyId = null;
let currentHandoverCustodyId = null;
let currentReturnCustodyId = null;

export async function initCustodies() {
  await renderCustodyFilters();
  await renderCustodiesList();
  setupCustodyEvents();
}

export async function renderCustodyFilters() {
  const branches = await db.getAll('branches');
  const branchSelect = document.getElementById('custody-filter-branch');
  const typeSelect = document.getElementById('custody-filter-type');

  if (branchSelect) {
    branchSelect.innerHTML = `<option value="">جميع الفروع</option>` +
      branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  }

  if (typeSelect) {
    typeSelect.innerHTML = `<option value="">جميع الأنواع</option>` +
      CUSTODY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  }
}

export async function renderCustodiesList() {
  const tableBody = document.getElementById('custodies-table-body');
  const countEl = document.getElementById('custodies-count-badge');
  if (!tableBody) return;

  const searchInput = document.getElementById('custody-search-input');
  const typeFilter = document.getElementById('custody-filter-type');
  const statusFilter = document.getElementById('custody-filter-status');
  const branchFilter = document.getElementById('custody-filter-branch');

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedType = typeFilter?.value || '';
  const selectedStatus = statusFilter?.value || '';
  const selectedBranch = branchFilter?.value || '';

  const custodies = await db.getAll('custodies');

  const filtered = custodies.filter(c => {
    if (selectedType && c.type !== selectedType) return false;
    if (selectedStatus && c.status !== selectedStatus) return false;
    if (selectedBranch && c.branchId !== selectedBranch) return false;

    if (query) {
      const matchName = (c.name || '').toLowerCase().includes(query);
      const matchCode = (c.code || '').toLowerCase().includes(query);
      const matchSerial = (c.serialNumber || '').toLowerCase().includes(query);
      const matchEmp = (c.employeeName || '').toLowerCase().includes(query);
      const matchBrand = (c.brand || '').toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchSerial && !matchEmp && !matchBrand) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} عهدة`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-muted">
          <i class="fa-solid fa-boxes-packing text-3xl mb-2 text-slate-400"></i>
          <div>لم يتم العثور على أجهزة أو عهد مطابقة.</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(c => {
    const stConfig = CUSTODY_STATUSES[c.status.toUpperCase()] || { label: c.status, color: 'slate', icon: 'fa-box' };
    const isAvailable = c.status === 'available';
    const isDelivered = c.status === 'delivered';

    return `
      <tr>
        <td>
          <div class="font-mono font-bold text-primary">${c.code}</div>
          <span class="badge badge-subtle-cyan text-xs">${c.type}</span>
        </td>
        <td>
          <div class="font-bold text-slate-800">${c.name}</div>
          <div class="text-xs text-muted">${c.brand || ''} ${c.model || ''}</div>
        </td>
        <td class="font-mono text-xs font-semibold text-slate-700">
          ${c.serialNumber || '—'}
        </td>
        <td>
          <span class="badge badge-${stConfig.color}"><i class="fa-solid ${stConfig.icon} text-xs ml-1"></i> ${stConfig.label}</span>
        </td>
        <td>
          ${isDelivered ? `
            <div class="font-semibold text-slate-900">${c.employeeName}</div>
            <div class="text-xs text-muted">تاريخ التسليم: ${formatDate(c.handoverDate)}</div>
          ` : `<span class="text-muted text-xs">— (في المستودع)</span>`}
        </td>
        <td>
          <div class="text-xs"><i class="fa-solid fa-building text-xs text-muted"></i> ${c.branchName || '—'}</div>
          ${c.estimatedValue ? `<div class="text-xs font-bold text-slate-700 mt-1">${formatCurrency(c.estimatedValue, c.currency || 'YER')}</div>` : ''}
        </td>
        <td class="text-end table-actions">
          ${isAvailable ? `
            <button class="btn btn-sm btn-primary" data-action="handover-custody-direct" data-id="${c.id}" title="تسليم العهدة لموظف">
              <i class="fa-solid fa-hand-holding-hand ml-1"></i> تسليم
            </button>
          ` : isDelivered ? `
            <button class="btn btn-sm btn-outline text-cyan" data-action="return-custody-direct" data-id="${c.id}" title="إرجاع العهدة">
              <i class="fa-solid fa-rotate-left ml-1"></i> إرجاع
            </button>
          ` : ''}
          <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-custody" data-id="${c.id}" title="تعديل بيانات العهدة">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost" data-action="view-custody-history" data-id="${c.id}" title="سجل حركة العهدة">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-custody" data-id="${c.id}" title="حذف العهدة">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export async function openCustodyModal(custodyId = null) {
  currentEditingCustodyId = custodyId;
  const modal = document.getElementById('custody-form-modal');
  const titleEl = document.getElementById('custody-modal-title');
  const form = document.getElementById('custody-form');

  const typeSelect = document.getElementById('cust-form-type');
  const branchSelect = document.getElementById('cust-form-branch');

  const branches = await db.getAll('branches');
  branchSelect.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  typeSelect.innerHTML = CUSTODY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

  if (custodyId) {
    titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-primary"></i> تعديل بيانات العهدة / الجهاز`;
    const c = await db.get('custodies', custodyId);
    if (!c) return;

    form.elements['code'].value = c.code || '';
    form.elements['name'].value = c.name || '';
    form.elements['type'].value = c.type || CUSTODY_TYPES[0];
    form.elements['brand'].value = c.brand || '';
    form.elements['model'].value = c.model || '';
    form.elements['serialNumber'].value = c.serialNumber || '';
    form.elements['color'].value = c.color || '';
    form.elements['estimatedValue'].value = c.estimatedValue || 0;
    form.elements['currency'].value = c.currency || 'YER';
    form.elements['branchId'].value = c.branchId || '';
    form.elements['status'].value = c.status || 'available';
    form.elements['purchaseDate'].value = c.purchaseDate || '';
    form.elements['condition'].value = c.condition || 'ممتاز';
    form.elements['notes'].value = c.notes || '';
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-boxes-packing text-primary"></i> إضافة عهدة / جهاز جديد`;
    form.reset();

    const count = await db.count('custodies');
    form.elements['code'].value = `AST-${100 + count + 1}`;
    form.elements['status'].value = 'available';
    form.elements['condition'].value = 'جديد وممتاز';
    form.elements['currency'].value = 'YER';
    form.elements['purchaseDate'].value = new Date().toISOString().split('T')[0];
  }

  openModal(modal);
}

export async function saveCustodyFromForm(e) {
  e.preventDefault();
  const form = document.getElementById('custody-form');
  const branches = await db.getAll('branches');
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  const branchId = form.elements['branchId'].value;
  const branchName = branchMap.get(branchId) || '';

  const custodyData = {
    code: form.elements['code'].value.trim(),
    name: form.elements['name'].value.trim(),
    type: form.elements['type'].value,
    brand: form.elements['brand'].value.trim(),
    model: form.elements['model'].value.trim(),
    serialNumber: form.elements['serialNumber'].value.trim(),
    color: form.elements['color'].value.trim(),
    estimatedValue: Number(form.elements['estimatedValue'].value || 0),
    currency: form.elements['currency'].value,
    branchId: branchId,
    branchName: branchName,
    status: form.elements['status'].value,
    purchaseDate: form.elements['purchaseDate'].value,
    condition: form.elements['condition'].value.trim(),
    notes: form.elements['notes'].value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (!custodyData.name || !custodyData.code) {
    showToast('اسم العهدة وكود العهدة مطلوبان.', 'error');
    return;
  }

  if (currentEditingCustodyId) {
    const existing = await db.get('custodies', currentEditingCustodyId);
    custodyData.id = currentEditingCustodyId;
    custodyData.createdAt = existing.createdAt;
    custodyData.employeeId = existing.employeeId;
    custodyData.employeeName = existing.employeeName;
    custodyData.handoverDate = existing.handoverDate;
    await db.put('custodies', custodyData);
    await logAudit('تعديل', 'العهد والمعدات', custodyData.id, `تم تعديل بيانات العهدة: ${custodyData.name} (${custodyData.code})`);
    showToast(`تم حفظ تعديلات العهدة (${custodyData.name}) بنجاح.`);
  } else {
    custodyData.id = generateId('CUST');
    custodyData.createdAt = new Date().toISOString();
    custodyData.employeeId = null;
    custodyData.employeeName = null;
    custodyData.handoverDate = null;
    await db.add('custodies', custodyData);
    await logAudit('إنشاء عهدة', 'العهد والمعدات', custodyData.id, `تمت إضافة عهدة جديدة للسجل المركزي: ${custodyData.name} برقم ${custodyData.code}`);
    showToast(`تمت إضافة العهدة الجديدة (${custodyData.name}) بنجاح.`);
  }

  closeModal('custody-form-modal');
  await renderCustodiesList();
}

/**
 * Handover Custody Modal & Processing (تسليم عهدة لموظف)
 */
export async function openHandoverModal(custodyId, prefilledEmpId = null) {
  currentHandoverCustodyId = custodyId;
  const modal = document.getElementById('custody-handover-modal');
  const empSelect = document.getElementById('handover-form-employee');
  const custodySelect = document.getElementById('handover-form-custody');
  const form = document.getElementById('custody-handover-form');

  const employees = await db.getAll('employees');
  const activeEmployees = employees.filter(e => e.status === 'active');
  empSelect.innerHTML = `<option value="">-- اختر الموظف المستلم --</option>` +
    activeEmployees.map(e => `<option value="${e.id}" ${prefilledEmpId === e.id ? 'selected' : ''}>${e.fullName} (${e.code} - ${e.jobTitle})</option>`).join('');

  const custodies = await db.getAll('custodies');
  const availableCustodies = custodies.filter(c => c.status === 'available' || c.id === custodyId);
  custodySelect.innerHTML = availableCustodies.map(c => `<option value="${c.id}" ${c.id === custodyId ? 'selected' : ''}>${c.name} (${c.code} - S/N: ${c.serialNumber || 'N/A'})</option>`).join('');

  form.reset();
  form.elements['date'].value = new Date().toISOString().split('T')[0];
  form.elements['condition'].value = 'ممتاز وسليم وجاهز للاستخدام';
  form.elements['companyRep'].value = 'عصام عبدالجليل قاسم (أمين المستودع المركزي)';

  if (custodyId) custodySelect.value = custodyId;
  if (prefilledEmpId) empSelect.value = prefilledEmpId;

  openModal(modal);
}

export async function processCustodyHandover(e) {
  e.preventDefault();
  const form = document.getElementById('custody-handover-form');
  const custodyId = form.elements['custodyId'].value;
  const employeeId = form.elements['employeeId'].value;
  const date = form.elements['date'].value;
  const condition = form.elements['condition'].value.trim();
  const companyRep = form.elements['companyRep'].value.trim();
  const notes = form.elements['notes'].value.trim();

  const validation = await validateCustodyHandover(custodyId, employeeId);
  if (!validation.isValid) {
    showToast(validation.errors.join('<br>'), 'error');
    return;
  }

  const custody = await db.get('custodies', custodyId);
  const employee = await db.get('employees', employeeId);

  // Update custody status
  custody.status = 'delivered';
  custody.employeeId = employee.id;
  custody.employeeName = employee.fullName;
  custody.handoverDate = date;
  custody.condition = condition;
  custody.updatedAt = new Date().toISOString();
  await db.put('custodies', custody);

  // Generate Handover Voucher
  const vouchersCount = await db.count('vouchers');
  const year = new Date().getFullYear();
  const voucherNumber = `REC-${year}-${String(vouchersCount + 1).padStart(3, '0')}`;

  const voucher = {
    id: generateId('VOU'),
    voucherNumber,
    type: 'handover',
    date,
    employeeId: employee.id,
    employeeName: employee.fullName,
    jobTitle: employee.jobTitle,
    branchId: employee.branchId,
    branchName: employee.branchName,
    items: [
      {
        custodyId: custody.id,
        name: custody.name,
        code: custody.code,
        brand: custody.brand,
        model: custody.model,
        serialNumber: custody.serialNumber,
        condition: condition,
        notes: notes
      }
    ],
    declaration: 'أقر أنا الموظف الموقع أدناه بأنني قد استلمت العهدة الموضحة أعلاه بحالة جيدة وسليمة وخالية من أي عيوب أو أضرار، وأتعهد بالمحافظة عليها واستخدامها في مهام العمل الموكلة إليّ حصراً وإعادتها عند طلب الإدارة أو انتهاء خدمتي.',
    companyRepName: companyRep,
    notes: notes,
    createdAt: new Date().toISOString()
  };
  await db.add('vouchers', voucher);

  // Log transaction
  const tx = {
    id: generateId('CTX'),
    custodyId: custody.id,
    custodyName: custody.name,
    employeeId: employee.id,
    employeeName: employee.fullName,
    type: 'handover',
    date,
    voucherId: voucher.id,
    voucherNumber: voucher.voucherNumber,
    notes: notes,
    timestamp: new Date().toISOString()
  };
  await db.add('custody_transactions', tx);

  await logAudit('تسليم عهدة', 'العهد والمعدات', custody.id, `تم تسليم العهدة (${custody.name} - ${custody.code}) للموظف (${employee.fullName}) بموجب محضر ${voucher.voucherNumber}`);

  closeModal('custody-handover-modal');
  showToast(`تم تسليم العهدة بنجاح وإنشاء المحضر رقم (${voucher.voucherNumber}).`);
  await renderCustodiesList();

  // Prompt to print Handover Voucher
  const settings = await db.get('settings', 'company_settings');
  const voucherHtml = buildCustodyHandoverVoucherHtml(voucher, employee, settings);
  await previewAndPrintDocument(`محضر استلام عهدة - ${voucher.voucherNumber}`, voucherHtml, `محضر_استلام_${voucher.voucherNumber}.pdf`, { module: 'محاضر الاستلام', recordId: voucher.id });
}

/**
 * Return Custody Modal & Processing (إرجاع عهدة)
 */
export async function openReturnModal(custodyId) {
  currentReturnCustodyId = custodyId;
  const modal = document.getElementById('custody-return-modal');
  const form = document.getElementById('custody-return-form');
  const custody = await db.get('custodies', custodyId);
  if (!custody) return;

  const titleEl = document.getElementById('return-modal-custody-title');
  if (titleEl) {
    titleEl.innerHTML = `إرجاع: <strong>${custody.name}</strong> (${custody.code}) • المسلّم لـ: <strong>${custody.employeeName || 'موظف'}</strong>`;
  }

  form.reset();
  form.elements['date'].value = new Date().toISOString().split('T')[0];
  form.elements['returnCondition'].value = 'سليم ومكتمل';
  form.elements['damages'].value = 'لا توجد أضرار';
  form.elements['missingItems'].value = 'لا توجد نواقص';
  form.elements['receivedBy'].value = 'عصام عبدالجليل قاسم (أمين المستودع المركزي)';

  openModal(modal);
}

export async function processCustodyReturn(e) {
  e.preventDefault();
  const form = document.getElementById('custody-return-form');
  const custody = await db.get('custodies', currentReturnCustodyId);
  if (!custody) return;

  const date = form.elements['date'].value;
  const returnCondition = form.elements['returnCondition'].value;
  const damages = form.elements['damages'].value.trim();
  const missingItems = form.elements['missingItems'].value.trim();
  const receivedBy = form.elements['receivedBy'].value.trim();
  const nextStatus = form.elements['nextStatus'].value; // 'available' or 'damaged' or 'maintenance'
  const notes = form.elements['notes'].value.trim();

  const employee = custody.employeeId ? await db.get('employees', custody.employeeId) : null;
  const prevEmployeeName = custody.employeeName || 'موظف';

  // Update custody
  custody.status = nextStatus;
  custody.employeeId = null;
  custody.employeeName = null;
  custody.handoverDate = null;
  custody.condition = returnCondition;
  custody.notes = (custody.notes ? custody.notes + ' | ' : '') + `أرجعت بتاريخ ${date} (${returnCondition})`;
  custody.updatedAt = new Date().toISOString();
  await db.put('custodies', custody);

  // Generate Return Voucher
  const vouchersCount = await db.count('vouchers');
  const year = new Date().getFullYear();
  const voucherNumber = `RET-${year}-${String(vouchersCount + 1).padStart(3, '0')}`;

  const voucher = {
    id: generateId('VOU'),
    voucherNumber,
    type: 'return',
    date,
    employeeId: employee?.id || 'EMP-N/A',
    employeeName: prevEmployeeName,
    jobTitle: employee?.jobTitle || 'موظف',
    branchId: custody.branchId,
    branchName: custody.branchName,
    items: [
      {
        custodyId: custody.id,
        name: custody.name,
        code: custody.code,
        serialNumber: custody.serialNumber,
        returnCondition,
        damages,
        missingItems
      }
    ],
    receivedByName: receivedBy,
    notes,
    createdAt: new Date().toISOString()
  };
  await db.add('vouchers', voucher);

  // Log transaction
  const tx = {
    id: generateId('CTX'),
    custodyId: custody.id,
    custodyName: custody.name,
    employeeId: employee?.id || null,
    employeeName: prevEmployeeName,
    type: returnCondition === 'متضرر' ? 'damage' : 'return',
    date,
    voucherId: voucher.id,
    voucherNumber: voucher.voucherNumber,
    notes: `${returnCondition} - ${damages}`,
    timestamp: new Date().toISOString()
  };
  await db.add('custody_transactions', tx);

  await logAudit('إرجاع عهدة', 'العهد والمعدات', custody.id, `تم إرجاع العهدة (${custody.name}) من الموظف (${prevEmployeeName}) بحالة (${returnCondition}) بموجب محضر ${voucher.voucherNumber}`);

  closeModal('custody-return-modal');
  showToast(`تم إرجاع العهدة بنجاح وإنشاء محضر الإرجاع رقم (${voucher.voucherNumber}).`);
  await renderCustodiesList();

  // Print preview return voucher
  const settings = await db.get('settings', 'company_settings');
  const voucherHtml = buildCustodyReturnVoucherHtml(voucher, employee, settings);
  await previewAndPrintDocument(`محضر إرجاع عهدة - ${voucher.voucherNumber}`, voucherHtml, `محضر_إرجاع_${voucher.voucherNumber}.pdf`, { module: 'محاضر الإرجاع', recordId: voucher.id });
}

export async function viewCustodyHistory(custodyId) {
  const custody = await db.get('custodies', custodyId);
  if (!custody) return;

  const transactions = await db.find('custody_transactions', tx => tx.custodyId === custodyId);
  const modal = document.getElementById('custody-history-modal');
  const titleEl = document.getElementById('custody-history-title');
  const bodyEl = document.getElementById('custody-history-body');

  titleEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-primary"></i> سجل حركة العهدة: <strong>${custody.name}</strong> (${custody.code})`;

  if (transactions.length === 0) {
    bodyEl.innerHTML = `<div class="empty-state-card text-center py-6 text-muted">لا توجد حركات سابقة مسجلة لهذه العهدة.</div>`;
  } else {
    bodyEl.innerHTML = `
      <div class="activity-timeline">
        ${transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(tx => `
          <div class="activity-timeline-item">
            <div class="activity-icon-bullet"><i class="fa-solid fa-circle-dot"></i></div>
            <div class="activity-content">
              <div class="activity-title font-bold text-slate-800">
                <span class="activity-action-tag">${tx.type === 'handover' ? 'تسليم' : tx.type === 'return' ? 'إرجاع' : tx.type}</span>
                ${tx.employeeName ? `إلى/من: ${tx.employeeName}` : ''}
              </div>
              <p class="activity-desc">${tx.notes || 'تمت العملية وتوثيق المحضر'}</p>
              <div class="activity-time">${formatDate(tx.date)} ${tx.voucherNumber ? `• رقم المحضر: ${tx.voucherNumber}` : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  openModal(modal);
}

function setupCustodyEvents() {
  const addBtn = document.getElementById('btn-add-custody');
  if (addBtn) addBtn.addEventListener('click', () => openCustodyModal(null));

  const form = document.getElementById('custody-form');
  if (form) form.addEventListener('submit', saveCustodyFromForm);

  const handoverForm = document.getElementById('custody-handover-form');
  if (handoverForm) handoverForm.addEventListener('submit', processCustodyHandover);

  const returnForm = document.getElementById('custody-return-form');
  if (returnForm) returnForm.addEventListener('submit', processCustodyReturn);

  // Filters & Search
  const searchInput = document.getElementById('custody-search-input');
  const typeFilter = document.getElementById('custody-filter-type');
  const statusFilter = document.getElementById('custody-filter-status');
  const branchFilter = document.getElementById('custody-filter-branch');

  if (searchInput) searchInput.addEventListener('input', () => renderCustodiesList());
  if (typeFilter) typeFilter.addEventListener('change', () => renderCustodiesList());
  if (statusFilter) statusFilter.addEventListener('change', () => renderCustodiesList());
  if (branchFilter) branchFilter.addEventListener('change', () => renderCustodiesList());

  // Action delegations
  document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-custody"]');
    if (editBtn) openCustodyModal(editBtn.dataset.id);

    const handoverBtn = e.target.closest('[data-action="handover-custody-direct"]');
    if (handoverBtn) openHandoverModal(handoverBtn.dataset.id);

    const handoverModalBtn = e.target.closest('[data-action="handover-custody-modal"]');
    if (handoverModalBtn) openHandoverModal(null, handoverModalBtn.dataset.empId);

    const returnBtn = e.target.closest('[data-action="return-custody-direct"]');
    if (returnBtn) openReturnModal(returnBtn.dataset.id);

    const returnModalBtn = e.target.closest('[data-action="return-custody-modal"]');
    if (returnModalBtn) openReturnModal(returnModalBtn.dataset.id);

    const historyBtn = e.target.closest('[data-action="view-custody-history"]');
    if (historyBtn) viewCustodyHistory(historyBtn.dataset.id);

    const deleteBtn = e.target.closest('[data-action="delete-custody"]');
    if (deleteBtn) {
      const custody = await db.get('custodies', deleteBtn.dataset.id);
      if (custody) {
        const confirmed = await showConfirmDialog({
          title: 'تأكيد حذف العهدة',
          message: `هل أنت متأكد من رغبتك في حذف العهدة <strong>(${custody.name} - ${custody.code})</strong> نهائياً من السجل؟`,
          confirmText: 'نعم، حذف العهدة',
          isDanger: true
        });
        if (confirmed) {
          await db.delete('custodies', custody.id);
          await logAudit('حذف', 'العهد والمعدات', custody.id, `تم حذف العهدة: ${custody.name}`);
          showToast(`تم حذف العهدة (${custody.name}).`);
          await renderCustodiesList();
        }
      }
    }
  });
}
