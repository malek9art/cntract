/**
 * Abu Hudhayfah Exchange & Transfers - Employee Management Module
 */

import { db } from '../core/db.js';
import { formatCurrency, formatDate, tafqeetArabic } from '../utils/formatters.js';
import { validateEmployee } from '../utils/validators.js';
import { generateId, readFileAsDataURL } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';
import { previewAndPrintDocument, buildContractDocumentHtml, buildCustodyHandoverVoucherHtml, buildCustodyReturnVoucherHtml } from '../services/pdf-service.js';
import { openHandoverModal, openReturnModal } from './custodies.js';
import { openContractModal } from './contracts.js';
import { openVehicleInspectionModal } from './vehicles.js';

let currentEditingEmployeeId = null;
let currentViewingEmployeeId = null;

export async function initEmployees() {
  await renderEmployeeFilters();
  await renderEmployeesList();
  setupEmployeeEvents();
}

export async function renderEmployeeFilters() {
  const branches = await db.getAll('branches');
  const branchSelect = document.getElementById('employee-filter-branch');
  if (branchSelect) {
    const current = branchSelect.value;
    branchSelect.innerHTML = `<option value="">جميع الفروع</option>` +
      branches.map(b => `<option value="${b.id}" ${current === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
  }
}

export async function renderEmployeesList() {
  const tableBody = document.getElementById('employees-table-body');
  const countEl = document.getElementById('employees-count-badge');
  if (!tableBody) return;

  const searchInput = document.getElementById('employee-search-input');
  const branchFilter = document.getElementById('employee-filter-branch');
  const statusFilter = document.getElementById('employee-filter-status');
  const currencyFilter = document.getElementById('employee-filter-currency');

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedBranch = branchFilter?.value || '';
  const selectedStatus = statusFilter?.value || '';
  const selectedCurrency = currencyFilter?.value || '';

  const employees = await db.getAll('employees');
  const contracts = await db.getAll('contracts');
  const custodies = await db.getAll('custodies');

  const filtered = employees.filter(emp => {
    if (selectedBranch && emp.branchId !== selectedBranch) return false;
    if (selectedStatus && emp.status !== selectedStatus) return false;
    if (selectedCurrency && emp.currency !== selectedCurrency) return false;

    if (query) {
      const matchName = (emp.fullName || '').toLowerCase().includes(query);
      const matchCode = (emp.code || '').toLowerCase().includes(query);
      const matchId = (emp.nationalId || '').toLowerCase().includes(query);
      const matchPhone = (emp.phone || '').toLowerCase().includes(query);
      const matchJob = (emp.jobTitle || '').toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchId && !matchPhone && !matchJob) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} موظف`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-muted">
          <i class="fa-solid fa-users-slash text-3xl mb-2 text-slate-400"></i>
          <div>لم يتم العثور على موظفين مطابقين للبحث أو الفلتر المختار.</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(emp => {
    const statusMap = {
      active: { label: 'نشط', class: 'badge-emerald' },
      on_leave: { label: 'في إجازة', class: 'badge-blue' },
      suspended: { label: 'موقوف', class: 'badge-amber' },
      terminated: { label: 'منتهي الخدمة', class: 'badge-slate' }
    };
    const st = statusMap[emp.status] || { label: emp.status, class: 'badge-slate' };

    // Related active contracts & custodies count
    const empContracts = contracts.filter(c => c.employeeId === emp.id && c.status === 'approved');
    const empCustodies = custodies.filter(c => c.employeeId === emp.id && c.status === 'delivered');

    const netSalaryFormatted = formatCurrency(emp.netSalary || emp.baseSalary, emp.currency);

    const avatarInitial = emp.fullName ? emp.fullName.trim().charAt(0) : 'م';
    const avatarHtml = emp.photoUrl
      ? `<img src="${emp.photoUrl}" alt="${emp.fullName}" class="employee-table-avatar-img" />`
      : `<div class="employee-table-avatar-initial">${avatarInitial}</div>`;

    return `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            ${avatarHtml}
            <div>
              <a href="javascript:void(0)" class="employee-link-name" data-action="view-employee" data-id="${emp.id}">${emp.fullName}</a>
              <div class="text-xs text-muted font-mono">${emp.code}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="font-medium text-slate-800">${emp.jobTitle || '—'}</div>
          <div class="text-xs text-muted">${emp.department || '—'}</div>
        </td>
        <td><i class="fa-solid fa-building text-xs text-muted ml-1"></i> ${emp.branchName || '—'}</td>
        <td class="font-mono text-xs font-semibold">${emp.phone || '—'}</td>
        <td><span class="badge ${st.class}">${st.label}</span></td>
        <td>
          <div class="font-bold text-slate-900">${netSalaryFormatted}</div>
        </td>
        <td>
          <div class="flex items-center gap-2 text-xs">
            <span class="badge badge-subtle-blue" title="العقود المعتمدة"><i class="fa-solid fa-file-contract"></i> ${empContracts.length}</span>
            <span class="badge badge-subtle-cyan" title="العهد المسلمة"><i class="fa-solid fa-boxes-stacked"></i> ${empCustodies.length}</span>
          </div>
        </td>
        <td class="text-end table-actions">
          <button class="btn btn-sm btn-icon btn-ghost" data-action="view-employee" data-id="${emp.id}" title="عرض ملف الموظف الكامل">
            <i class="fa-solid fa-address-card text-primary"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-employee" data-id="${emp.id}" title="تعديل بيانات الموظف">
            <i class="fa-solid fa-user-pen"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-employee" data-id="${emp.id}" title="حذف الموظف">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export async function openEmployeeFormModal(employeeId = null) {
  currentEditingEmployeeId = employeeId;
  const modal = document.getElementById('employee-form-modal');
  const titleEl = document.getElementById('employee-modal-title');
  const form = document.getElementById('employee-form');
  const branchSelect = document.getElementById('emp-form-branch');

  // Populate branch select options
  const branches = await db.getAll('branches');
  branchSelect.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

  if (employeeId) {
    titleEl.innerHTML = `<i class="fa-solid fa-user-pen text-primary"></i> تعديل بيانات الموظف`;
    const emp = await db.get('employees', employeeId);
    if (!emp) return;

    form.elements['code'].value = emp.code || '';
    form.elements['fullName'].value = emp.fullName || '';
    form.elements['nationalId'].value = emp.nationalId || '';
    form.elements['phone'].value = emp.phone || '';
    form.elements['address'].value = emp.address || '';
    form.elements['nationality'].value = emp.nationality || 'يمني';
    form.elements['jobTitle'].value = emp.jobTitle || '';
    form.elements['department'].value = emp.department || '';
    form.elements['branchId'].value = emp.branchId || '';
    form.elements['hireDate'].value = emp.hireDate || '';
    form.elements['employmentType'].value = emp.employmentType || 'دوام كامل';
    form.elements['status'].value = emp.status || 'active';
    form.elements['endOfServiceDate'].value = emp.endOfServiceDate || '';
    form.elements['baseSalary'].value = emp.baseSalary || 0;
    form.elements['allowances'].value = emp.allowances || 0;
    form.elements['deductions'].value = emp.deductions || 0;
    form.elements['currency'].value = emp.currency || 'YER';
    form.elements['notes'].value = emp.notes || '';

    // Preview photo if exists
    const previewImg = document.getElementById('emp-photo-preview');
    if (previewImg) {
      previewImg.src = emp.photoUrl || 'assets/images/avatar-placeholder.png';
      previewImg.style.display = emp.photoUrl ? 'block' : 'none';
    }
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-user-plus text-primary"></i> إضافة موظف جديد`;
    form.reset();
    const count = await db.count('employees');
    form.elements['code'].value = `EMP-${1000 + count + 1}`;
    form.elements['nationality'].value = 'يمني';
    form.elements['employmentType'].value = 'دوام كامل';
    form.elements['status'].value = 'active';
    form.elements['currency'].value = 'YER';
    form.elements['hireDate'].value = new Date().toISOString().split('T')[0];
    form.elements['baseSalary'].value = '350000';
    form.elements['allowances'].value = '0';
    form.elements['deductions'].value = '0';

    const previewImg = document.getElementById('emp-photo-preview');
    if (previewImg) previewImg.style.display = 'none';
  }

  calcFormNetSalary();
  openModal(modal);
}

function calcFormNetSalary() {
  const form = document.getElementById('employee-form');
  if (!form) return;
  const base = Number(form.elements['baseSalary']?.value || 0);
  const allow = Number(form.elements['allowances']?.value || 0);
  const ded = Number(form.elements['deductions']?.value || 0);
  const net = base + allow - ded;
  const netEl = document.getElementById('emp-form-net-salary-preview');
  const currency = form.elements['currency']?.value || 'YER';
  if (netEl) {
    netEl.textContent = formatCurrency(net, currency);
  }
}

export async function saveEmployeeFromForm(event) {
  event.preventDefault();
  const form = document.getElementById('employee-form');
  const branches = await db.getAll('branches');
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  const baseSalary = Number(form.elements['baseSalary'].value || 0);
  const allowances = Number(form.elements['allowances'].value || 0);
  const deductions = Number(form.elements['deductions'].value || 0);
  const netSalary = baseSalary + allowances - deductions;

  const photoInput = document.getElementById('emp-photo-input');
  let photoUrl = null;
  if (photoInput && photoInput.files && photoInput.files[0]) {
    try {
      photoUrl = await readFileAsDataURL(photoInput.files[0]);
    } catch (e) {
      console.warn('Failed to read image:', e);
    }
  }

  const branchId = form.elements['branchId'].value;
  const branchName = branchMap.get(branchId) || '';

  const employeeData = {
    code: form.elements['code'].value.trim(),
    fullName: form.elements['fullName'].value.trim(),
    nationalId: form.elements['nationalId'].value.trim(),
    phone: form.elements['phone'].value.trim(),
    address: form.elements['address'].value.trim(),
    nationality: form.elements['nationality'].value.trim(),
    jobTitle: form.elements['jobTitle'].value.trim(),
    department: form.elements['department'].value.trim(),
    branchId: branchId,
    branchName: branchName,
    hireDate: form.elements['hireDate'].value,
    employmentType: form.elements['employmentType'].value,
    status: form.elements['status'].value,
    endOfServiceDate: form.elements['endOfServiceDate'].value || null,
    baseSalary: baseSalary,
    allowances: allowances,
    deductions: deductions,
    netSalary: netSalary,
    currency: form.elements['currency'].value,
    notes: form.elements['notes'].value.trim(),
    updatedAt: new Date().toISOString()
  };

  const validation = await validateEmployee(employeeData, !!currentEditingEmployeeId, currentEditingEmployeeId);
  if (!validation.isValid) {
    showToast(validation.errors.join('<br>'), 'error');
    return;
  }

  if (currentEditingEmployeeId) {
    const existing = await db.get('employees', currentEditingEmployeeId);
    if (!existing) return;
    employeeData.id = currentEditingEmployeeId;
    employeeData.createdAt = existing.createdAt;
    if (!photoUrl && existing.photoUrl) {
      employeeData.photoUrl = existing.photoUrl;
    } else if (photoUrl) {
      employeeData.photoUrl = photoUrl;
    }
    await db.put('employees', employeeData);
    await logAudit('تعديل', 'الموظفون', employeeData.id, `تم تعديل بيانات الموظف: ${employeeData.fullName} (${employeeData.code})`);
    showToast(`تم تحديث بيانات الموظف (${employeeData.fullName}) بنجاح.`);
  } else {
    employeeData.id = generateId('EMP');
    employeeData.createdAt = new Date().toISOString();
    employeeData.photoUrl = photoUrl;
    await db.add('employees', employeeData);
    await logAudit('إنشاء', 'الموظفون', employeeData.id, `تم تسجيل موظف جديد: ${employeeData.fullName} برقم ${employeeData.code}`);
    showToast(`تمت إضافة الموظف الجديد (${employeeData.fullName}) بنجاح.`);
  }

  closeModal('employee-form-modal');
  await renderEmployeesList();

  // If currently viewing this employee detail, refresh it
  if (currentViewingEmployeeId === (currentEditingEmployeeId || employeeData.id)) {
    await viewEmployeeProfile(currentViewingEmployeeId);
  }
}

/**
 * Detailed Employee Profile View with all 6 Sub-Tabs
 */
export async function viewEmployeeProfile(employeeId) {
  currentViewingEmployeeId = employeeId;
  const emp = await db.get('employees', employeeId);
  if (!emp) {
    showToast('الموظف غير موجود.', 'error');
    return;
  }

  // Switch SPA view to employee detail view
  window.location.hash = `employee-detail?id=${employeeId}`;

  const nameEl = document.getElementById('emp-detail-name');
  const codeEl = document.getElementById('emp-detail-code');
  const jobEl = document.getElementById('emp-detail-job');
  const branchEl = document.getElementById('emp-detail-branch');
  const statusEl = document.getElementById('emp-detail-status-badge');
  const avatarEl = document.getElementById('emp-detail-avatar');

  if (nameEl) nameEl.textContent = emp.fullName;
  if (codeEl) codeEl.textContent = emp.code;
  if (jobEl) jobEl.textContent = `${emp.jobTitle} • ${emp.department || 'الشؤون الإدارية'}`;
  if (branchEl) branchEl.innerHTML = `<i class="fa-solid fa-building"></i> ${emp.branchName}`;

  const statusMap = {
    active: { label: 'نشط على رأس العمل', class: 'badge-emerald' },
    on_leave: { label: 'في إجازة رسمية', class: 'badge-blue' },
    suspended: { label: 'موقوف عن العمل', class: 'badge-amber' },
    terminated: { label: 'منتهي الخدمة', class: 'badge-slate' }
  };
  const st = statusMap[emp.status] || { label: emp.status, class: 'badge-slate' };
  if (statusEl) {
    statusEl.className = `badge ${st.class} text-sm py-1 px-3`;
    statusEl.textContent = st.label;
  }

  if (avatarEl) {
    if (emp.photoUrl) {
      avatarEl.innerHTML = `<img src="${emp.photoUrl}" alt="${emp.fullName}" class="profile-avatar-img" />`;
    } else {
      const initial = emp.fullName ? emp.fullName.trim().charAt(0) : 'م';
      avatarEl.innerHTML = `<div class="profile-avatar-initial">${initial}</div>`;
    }
  }

  // Fill Tab 1: Overview & Salary
  const overviewContainer = document.getElementById('emp-tab-overview');
  if (overviewContainer) {
    const netSalaryFormatted = formatCurrency(emp.netSalary || emp.baseSalary, emp.currency);
    const baseFormatted = formatCurrency(emp.baseSalary, emp.currency);
    const allowFormatted = formatCurrency(emp.allowances || 0, emp.currency);
    const dedFormatted = formatCurrency(emp.deductions || 0, emp.currency);
    const tafqeet = tafqeetArabic(emp.netSalary || emp.baseSalary, emp.currency);

    overviewContainer.innerHTML = `
      <div class="profile-grid">
        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-id-card text-primary"></i> البيانات الشخصية والوظيفية</h3>
          </div>
          <div class="card-body">
            <div class="detail-rows">
              <div class="detail-row"><span>الاسم الرباعي:</span><strong>${emp.fullName}</strong></div>
              <div class="detail-row"><span>رقم الهوية / الجواز:</span><strong class="font-mono">${emp.nationalId}</strong></div>
              <div class="detail-row"><span>الجنسية:</span><strong>${emp.nationality || 'يمني'}</strong></div>
              <div class="detail-row"><span>رقم الهاتف:</span><strong class="font-mono">${emp.phone}</strong></div>
              <div class="detail-row"><span>العنوان:</span><strong>${emp.address || '—'}</strong></div>
              <div class="detail-row"><span>تاريخ التعيين:</span><strong>${formatDate(emp.hireDate)}</strong></div>
              <div class="detail-row"><span>نوع التوظيف:</span><strong>${emp.employmentType || 'دوام كامل'}</strong></div>
              ${emp.endOfServiceDate ? `<div class="detail-row text-rose"><span>تاريخ انتهاء الخدمة:</span><strong>${formatDate(emp.endOfServiceDate)}</strong></div>` : ''}
              <div class="detail-row"><span>ملاحظات إدارية:</span><div>${emp.notes || 'لا توجد ملاحظات مسجلة'}</div></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-coins text-accent"></i> البيانات المالية والراتب</h3>
          </div>
          <div class="card-body">
            <div class="salary-breakdown-box mb-4">
              <div class="salary-total-badge">
                <div class="text-xs opacity-80">صافي الراتب الشهري المستحق:</div>
                <div class="text-2xl font-black">${netSalaryFormatted}</div>
                <div class="text-xs mt-1 bg-white/10 rounded px-2 py-1">${tafqeet}</div>
              </div>
            </div>

            <div class="detail-rows">
              <div class="detail-row"><span>الراتب الأساسي:</span><strong>${baseFormatted}</strong></div>
              <div class="detail-row"><span>إجمالي البدلات:</span><strong class="text-emerald">+ ${allowFormatted}</strong></div>
              <div class="detail-row"><span>إجمالي الخصومات:</span><strong class="text-rose">- ${dedFormatted}</strong></div>
              <div class="detail-row"><span>عملة الراتب:</span><strong class="badge badge-subtle-blue">${emp.currency === 'SAR' ? 'الريال السعودي (SAR)' : 'الريال اليمني (YER)'}</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Fill Tab 2: Contracts
  const contractsContainer = document.getElementById('emp-tab-contracts');
  if (contractsContainer) {
    const contracts = await db.find('contracts', c => c.employeeId === emp.id);
    if (contracts.length === 0) {
      contractsContainer.innerHTML = `
        <div class="empty-state-card text-center py-6">
          <p class="text-muted mb-3">لا توجد عقود مسجلة لهذا الموظف حتى الآن.</p>
          <button class="btn btn-sm btn-primary" data-action="new-contract-for-emp" data-id="${emp.id}">
            <i class="fa-solid fa-plus ml-1"></i> إنشاء عقد جديد لهذا الموظف
          </button>
        </div>
      `;
    } else {
      contractsContainer.innerHTML = `
        <div class="flex justify-between items-center mb-4">
          <h4 class="font-bold text-slate-800">عقود العمل الصادرة للموظف (${contracts.length})</h4>
          <button class="btn btn-sm btn-outline" data-action="new-contract-for-emp" data-id="${emp.id}">
            <i class="fa-solid fa-plus ml-1"></i> إضافة عقد جديد
          </button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>رقم العقد</th>
                <th>نوع القالب</th>
                <th>تاريخ البداية</th>
                <th>تاريخ النهاية</th>
                <th>الراتب</th>
                <th>الحالة</th>
                <th>الإصدار</th>
                <th class="text-end">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr>
                  <td class="font-mono font-bold text-primary">${c.contractNumber}</td>
                  <td>${c.templateName || c.contractType}</td>
                  <td>${formatDate(c.startDate)}</td>
                  <td>${c.endDate ? formatDate(c.endDate) : 'غير محدد'}</td>
                  <td>${formatCurrency(c.netSalary || c.baseSalary, c.currency)}</td>
                  <td><span class="badge ${c.status === 'approved' ? 'badge-emerald' : c.status === 'expired' ? 'badge-rose' : 'badge-amber'}">${c.status === 'approved' ? 'معتمد' : c.status}</span></td>
                  <td><span class="badge badge-slate">v${c.version || '1.0'}</span></td>
                  <td class="text-end table-actions">
                    <button class="btn btn-sm btn-icon btn-ghost" data-action="view-contract-pdf" data-id="${c.id}" title="معاينة وطباعة">
                      <i class="fa-solid fa-print"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-contract" data-id="${c.id}" title="تعديل">
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // Fill Tab 3: Custodies
  const custodiesContainer = document.getElementById('emp-tab-custodies');
  if (custodiesContainer) {
    const custodies = await db.find('custodies', c => c.employeeId === emp.id && c.status === 'delivered');
    if (custodies.length === 0) {
      custodiesContainer.innerHTML = `
        <div class="empty-state-card text-center py-6">
          <p class="text-muted mb-3">لا توجد عهد أو أجهزة مسلمة للموظف حالياً.</p>
          <button class="btn btn-sm btn-primary" data-action="handover-custody-modal" data-emp-id="${emp.id}">
            <i class="fa-solid fa-hand-holding-hand ml-1"></i> تسليم عهدة جديدة للموظف
          </button>
        </div>
      `;
    } else {
      custodiesContainer.innerHTML = `
        <div class="flex justify-between items-center mb-4">
          <h4 class="font-bold text-slate-800">العهد والأجهزة بعهدة الموظف حالياً (${custodies.length})</h4>
          <button class="btn btn-sm btn-outline" data-action="handover-custody-modal" data-emp-id="${emp.id}">
            <i class="fa-solid fa-plus ml-1"></i> تسليم عهدة إضافية
          </button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>كود العهدة</th>
                <th>نوع العهدة</th>
                <th>اسم الجهاز / العهدة</th>
                <th>الرقم التسلسلي (S/N)</th>
                <th>تاريخ التسليم</th>
                <th>الحالة الفنية</th>
                <th class="text-end">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${custodies.map(c => `
                <tr>
                  <td class="font-mono font-bold">${c.code}</td>
                  <td><span class="badge badge-subtle-cyan">${c.type}</span></td>
                  <td><strong>${c.name}</strong><div class="text-xs text-muted">${c.brand || ''} ${c.model || ''}</div></td>
                  <td class="font-mono text-xs">${c.serialNumber || '—'}</td>
                  <td>${formatDate(c.handoverDate)}</td>
                  <td><span class="badge badge-emerald">${c.condition || 'سليم'}</span></td>
                  <td class="text-end table-actions">
                    <button class="btn btn-sm btn-outline text-cyan" data-action="return-custody-modal" data-id="${c.id}" title="إرجاع العهدة">
                      <i class="fa-solid fa-rotate-left ml-1"></i> إرجاع
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // Fill Tab 4: Vehicles
  const vehiclesContainer = document.getElementById('emp-tab-vehicles');
  if (vehiclesContainer) {
    const vehicles = await db.find('vehicles', v => v.assignedEmployeeId === emp.id && v.status === 'delivered');
    if (vehicles.length === 0) {
      vehiclesContainer.innerHTML = `<div class="empty-state-card text-center py-6 text-muted">لا توجد مركبات أو سيارات مسلمة لهذا الموظف.</div>`;
    } else {
      vehiclesContainer.innerHTML = vehicles.map(v => `
        <div class="card mb-4 border border-cyan-200">
          <div class="card-header flex justify-between items-center bg-cyan-50/50">
            <div>
              <h4 class="font-bold text-slate-800"><i class="fa-solid fa-car text-cyan"></i> ${v.brand} ${v.model} (${v.year})</h4>
              <span class="badge-plate mt-1">${v.plateNumber}</span>
            </div>
            <button class="btn btn-sm btn-outline" data-action="inspect-return-vehicle" data-id="${v.id}">
              <i class="fa-solid fa-rotate-left ml-1"></i> إرجاع وفحص السيارة
            </button>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span class="text-muted block text-xs">رقم الشاصي:</span><strong class="font-mono">${v.chassisNumber}</strong></div>
              <div><span class="text-muted block text-xs">قراءة العداد:</span><strong>${v.odometer.toLocaleString()} كم</strong></div>
              <div><span class="text-muted block text-xs">مستوى الوقود:</span><strong>${v.fuelLevel}</strong></div>
              <div><span class="text-muted block text-xs">حالة الهيكل:</span><strong class="text-emerald">${v.bodyCondition}</strong></div>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Fill Tab 5: Vouchers
  const vouchersContainer = document.getElementById('emp-tab-vouchers');
  if (vouchersContainer) {
    const vouchers = await db.find('vouchers', v => v.employeeId === emp.id);
    if (vouchers.length === 0) {
      vouchersContainer.innerHTML = `<div class="empty-state-card text-center py-6 text-muted">لا توجد محاضر استلام أو إرجاع مسجلة لهذا الموظف.</div>`;
    } else {
      vouchersContainer.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>رقم المحضر</th>
                <th>نوع المحضر</th>
                <th>التاريخ</th>
                <th>البيان</th>
                <th class="text-end">معاينة وطباعة</th>
              </tr>
            </thead>
            <tbody>
              ${vouchers.map(v => `
                <tr>
                  <td class="font-mono font-bold">${v.voucherNumber}</td>
                  <td><span class="badge ${v.type === 'handover' ? 'badge-blue' : 'badge-emerald'}">${v.type === 'handover' ? 'محضر استلام عهدة' : 'محضر إرجاع عهدة'}</span></td>
                  <td>${formatDate(v.date)}</td>
                  <td>${v.items ? v.items.map(i => i.name).join('، ') : '—'}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-icon btn-ghost" data-action="view-voucher-pdf" data-id="${v.id}">
                      <i class="fa-solid fa-print"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // Fill Tab 6: Audit logs
  const logsContainer = document.getElementById('emp-tab-logs');
  if (logsContainer) {
    const logs = await db.find('audit_logs', l => (l.recordId && l.recordId.includes(emp.id)) || (l.description && l.description.includes(emp.fullName)));
    if (logs.length === 0) {
      logsContainer.innerHTML = `<div class="empty-state-card text-center py-6 text-muted">لا توجد عمليات مسجلة في سجل التدقيق للموظف.</div>`;
    } else {
      logsContainer.innerHTML = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(l => `
        <div class="activity-timeline-item">
          <div class="activity-icon-bullet"><i class="fa-solid fa-circle-dot"></i></div>
          <div class="activity-content">
            <div class="activity-title"><span class="activity-action-tag">${l.action}</span> <span>${l.module}</span></div>
            <p class="activity-desc">${l.description}</p>
            <div class="activity-time">${formatDate(l.timestamp)} • ${l.user}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

function setupEmployeeEvents() {
  const addBtn = document.getElementById('btn-add-employee');
  if (addBtn) {
    addBtn.addEventListener('click', () => openEmployeeFormModal(null));
  }

  const form = document.getElementById('employee-form');
  if (form) {
    form.addEventListener('submit', saveEmployeeFromForm);

    ['baseSalary', 'allowances', 'deductions', 'currency'].forEach(field => {
      const input = form.elements[field];
      if (input) {
        input.addEventListener('input', calcFormNetSalary);
        input.addEventListener('change', calcFormNetSalary);
      }
    });
  }

  // Search & Filters
  const searchInput = document.getElementById('employee-search-input');
  const branchFilter = document.getElementById('employee-filter-branch');
  const statusFilter = document.getElementById('employee-filter-status');
  const currencyFilter = document.getElementById('employee-filter-currency');

  if (searchInput) searchInput.addEventListener('input', () => renderEmployeesList());
  if (branchFilter) branchFilter.addEventListener('change', () => renderEmployeesList());
  if (statusFilter) statusFilter.addEventListener('change', () => renderEmployeesList());
  if (currencyFilter) currencyFilter.addEventListener('change', () => renderEmployeesList());

  // Action delegations
  document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-employee"]');
    if (editBtn) {
      const empId = editBtn.dataset.id;
      openEmployeeFormModal(empId);
    }

    const viewBtn = e.target.closest('[data-action="view-employee"]');
    if (viewBtn) {
      const empId = viewBtn.dataset.id;
      viewEmployeeProfile(empId);
    }

    const deleteBtn = e.target.closest('[data-action="delete-employee"]');
    if (deleteBtn) {
      const empId = deleteBtn.dataset.id;
      const emp = await db.get('employees', empId);
      if (emp) {
        const confirmed = await showConfirmDialog({
          title: 'تأكيد أرشفة/حذف الموظف',
          message: `هل أنت متأكد من رغبتك في حذف ملف الموظف <strong>(${emp.fullName})</strong>؟ لن يتم حذف العقود التاريخية المرتبطة به ولكن سيتم تعيين حالته كمنتهي الخدمة.`,
          confirmText: 'نعم، حذف الموظف',
          isDanger: true
        });

        if (confirmed) {
          emp.status = 'terminated';
          emp.endOfServiceDate = new Date().toISOString().split('T')[0];
          await db.put('employees', emp);
          await logAudit('أرشفة', 'الموظفون', emp.id, `تم إنهاء خدمة الموظف: ${emp.fullName}`);
          showToast(`تم تغيير حالة الموظف (${emp.fullName}) إلى منتهي الخدمة.`);
          await renderEmployeesList();
        }
      }
    }

    const handoverCustodyBtn = e.target.closest('[data-action="handover-custody-modal"]');
    if (handoverCustodyBtn) {
      const empId = handoverCustodyBtn.dataset.empId;
      openHandoverModal(null, empId);
    }

    const returnCustodyBtn = e.target.closest('[data-action="return-custody-modal"]');
    if (returnCustodyBtn) {
      const custId = returnCustodyBtn.dataset.id;
      openReturnModal(custId);
    }

    const inspectVehBtn = e.target.closest('[data-action="inspect-return-vehicle"]');
    if (inspectVehBtn) {
      const vehId = inspectVehBtn.dataset.id;
      openVehicleInspectionModal(vehId, 'return');
    }
  });
}
