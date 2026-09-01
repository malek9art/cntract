/**
 * Abu Hudhayfah Exchange & Transfers - Vehicle Management & Inspection Module
 */

import { db } from '../core/db.js';
import { VEHICLE_CONDITIONS, FUEL_LEVELS } from '../data/constants.js';
import { formatDate } from '../utils/formatters.js';
import { VEHICLE_INSPECTION_ITEMS, createDefaultInspectionSheet } from '../services/vehicle-service.js';
import { generateId } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';
import { previewAndPrintDocument, buildVehicleInspectionDocumentHtml } from '../services/pdf-service.js';

let currentEditingVehicleId = null;
let currentInspectingVehicleId = null;
let currentInspectionType = 'handover'; // 'handover' or 'return'

export async function initVehicles() {
  await renderVehiclesList();
  setupVehicleEvents();
}

export async function renderVehiclesList() {
  const container = document.getElementById('vehicles-grid-container');
  const countEl = document.getElementById('vehicles-count-badge');
  if (!container) return;

  const searchInput = document.getElementById('vehicle-search-input')?.value.trim().toLowerCase() || '';
  const statusFilter = document.getElementById('vehicle-filter-status')?.value || '';

  const vehicles = await db.getAll('vehicles');

  const filtered = vehicles.filter(v => {
    if (statusFilter && v.status !== statusFilter) return false;
    if (searchInput) {
      const matchPlate = (v.plateNumber || '').toLowerCase().includes(searchInput);
      const matchBrand = (v.brand || '').toLowerCase().includes(searchInput);
      const matchModel = (v.model || '').toLowerCase().includes(searchInput);
      const matchEmp = (v.assignedEmployeeName || '').toLowerCase().includes(searchInput);
      if (!matchPlate && !matchBrand && !matchModel && !matchEmp) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} سيارة`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-full empty-state-card text-center py-8 text-muted">لا توجد سيارات مسجلة تطابق البحث.</div>`;
    return;
  }

  container.innerHTML = filtered.map(v => {
    const isDelivered = v.status === 'delivered';

    return `
      <div class="card vehicle-card border border-slate-200 hover:border-cyan-400 transition-colors">
        <div class="card-header flex justify-between items-start">
          <div>
            <span class="badge ${isDelivered ? 'badge-emerald' : 'badge-slate'} mb-1">${isDelivered ? 'مسلّمة لموظف' : 'متاحة بالمقر'}</span>
            <h3 class="text-lg font-bold text-slate-900"><i class="fa-solid fa-car text-cyan ml-1"></i> ${v.brand} ${v.model} (${v.year})</h3>
          </div>
          <span class="badge-plate">${v.plateNumber}</span>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded">
            <div><span class="text-muted block">الفرع:</span> <strong>${v.branchName || 'المركز الرئيسي'}</strong></div>
            <div><span class="text-muted block">العداد:</span> <strong class="font-mono font-bold">${v.odometer.toLocaleString()} كم</strong></div>
            <div><span class="text-muted block">مستوى الوقود:</span> <strong>${v.fuelLevel}</strong></div>
            <div><span class="text-muted block">حالة الهيكل:</span> <strong class="text-emerald">${v.bodyCondition}</strong></div>
            <div class="col-span-2"><span class="text-muted block">رقم الشاصي:</span> <strong class="font-mono text-slate-800">${v.chassisNumber}</strong></div>
          </div>

          <div class="vehicle-assignment-box p-3 rounded ${isDelivered ? 'bg-cyan-50 border border-cyan-100' : 'bg-slate-100'} mb-4">
            <div class="text-xs text-muted mb-1">${isDelivered ? 'الموظف المستلم حالياً:' : 'حالة التكليف:'}</div>
            <div class="font-bold text-slate-800">${isDelivered ? v.assignedEmployeeName : 'المركبة جاهزة للتسليم في كراج الشركة'}</div>
            ${isDelivered && v.handoverDate ? `<div class="text-xs text-slate-500 mt-1">تاريخ التسليم: ${formatDate(v.handoverDate)}</div>` : ''}
          </div>

          <div class="flex justify-between items-center pt-3 border-t border-slate-100">
            ${isDelivered ? `
              <button class="btn btn-sm btn-outline text-cyan" data-action="inspect-return-vehicle" data-id="${v.id}">
                <i class="fa-solid fa-rotate-left ml-1"></i> فحص وإرجاع
              </button>
            ` : `
              <button class="btn btn-sm btn-primary" data-action="inspect-handover-vehicle" data-id="${v.id}">
                <i class="fa-solid fa-key ml-1"></i> فحص وتسليم
              </button>
            `}
            <div class="flex gap-1">
              <button class="btn btn-sm btn-icon btn-ghost" data-action="print-vehicle-sheet" data-id="${v.id}" title="طباعة بطاقة فحص المركبة">
                <i class="fa-solid fa-print"></i>
              </button>
              <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-vehicle" data-id="${v.id}" title="تعديل بيانات المركبة">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-vehicle" data-id="${v.id}" title="حذف المركبة">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export async function openVehicleModal(vehicleId = null) {
  currentEditingVehicleId = vehicleId;
  const modal = document.getElementById('vehicle-form-modal');
  const titleEl = document.getElementById('vehicle-modal-title');
  const form = document.getElementById('vehicle-form');

  const branchSelect = document.getElementById('veh-form-branch');
  const condSelect = document.getElementById('veh-form-body-cond');
  const fuelSelect = document.getElementById('veh-form-fuel');

  const branches = await db.getAll('branches');
  branchSelect.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  condSelect.innerHTML = VEHICLE_CONDITIONS.map(c => `<option value="${c}">${c}</option>`).join('');
  fuelSelect.innerHTML = FUEL_LEVELS.map(f => `<option value="${f}">${f}</option>`).join('');

  if (vehicleId) {
    titleEl.innerHTML = `<i class="fa-solid fa-car text-primary"></i> تعديل بيانات السيارة`;
    const v = await db.get('vehicles', vehicleId);
    if (!v) return;

    form.elements['code'].value = v.code || '';
    form.elements['type'].value = v.type || 'سيارة سيدان';
    form.elements['brand'].value = v.brand || '';
    form.elements['model'].value = v.model || '';
    form.elements['year'].value = v.year || '';
    form.elements['plateNumber'].value = v.plateNumber || '';
    form.elements['chassisNumber'].value = v.chassisNumber || '';
    form.elements['engineNumber'].value = v.engineNumber || '';
    form.elements['color'].value = v.color || '';
    form.elements['odometer'].value = v.odometer || 0;
    form.elements['branchId'].value = v.branchId || '';
    form.elements['bodyCondition'].value = v.bodyCondition || VEHICLE_CONDITIONS[0];
    form.elements['fuelLevel'].value = v.fuelLevel || FUEL_LEVELS[4];
    form.elements['previousDamages'].value = v.previousDamages || '';
    form.elements['insuranceExpiry'].value = v.insuranceExpiry || '';
    form.elements['registrationExpiry'].value = v.registrationExpiry || '';
    form.elements['notes'].value = v.notes || '';
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-car-side text-primary"></i> تسجيل سيارة / مركبة جديدة`;
    form.reset();

    const count = await db.count('vehicles');
    form.elements['code'].value = `VEH-${String(count + 1).padStart(2, '0')}`;
    form.elements['year'].value = '2024';
    form.elements['odometer'].value = '0';
    form.elements['fuelLevel'].value = 'ممتلئ (Full)';
    form.elements['bodyCondition'].value = 'ممتاز (حالة الوكالة)';
  }

  openModal(modal);
}

export async function saveVehicleFromForm(e) {
  e.preventDefault();
  const form = document.getElementById('vehicle-form');
  const branches = await db.getAll('branches');
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  const branchId = form.elements['branchId'].value;
  const branchName = branchMap.get(branchId) || '';

  const plateNumber = form.elements['plateNumber'].value.trim();
  const brand = form.elements['brand'].value.trim();
  const model = form.elements['model'].value.trim();

  if (!plateNumber || !brand || !model) {
    showToast('رقم اللوحة، الماركة والموديل حقول مطلوبة.', 'error');
    return;
  }

  const vehicleData = {
    code: form.elements['code'].value.trim(),
    type: form.elements['type'].value.trim(),
    brand: brand,
    model: model,
    year: form.elements['year'].value.trim(),
    plateNumber: plateNumber,
    chassisNumber: form.elements['chassisNumber'].value.trim(),
    engineNumber: form.elements['engineNumber'].value.trim(),
    color: form.elements['color'].value.trim(),
    odometer: Number(form.elements['odometer'].value || 0),
    branchId: branchId,
    branchName: branchName,
    bodyCondition: form.elements['bodyCondition'].value,
    tireCondition: 'ممتاز',
    fuelLevel: form.elements['fuelLevel'].value,
    previousDamages: form.elements['previousDamages'].value.trim(),
    insuranceExpiry: form.elements['insuranceExpiry'].value,
    registrationExpiry: form.elements['registrationExpiry'].value,
    notes: form.elements['notes'].value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (currentEditingVehicleId) {
    const existing = await db.get('vehicles', currentEditingVehicleId);
    vehicleData.id = currentEditingVehicleId;
    vehicleData.createdAt = existing.createdAt;
    vehicleData.status = existing.status || 'available';
    vehicleData.assignedEmployeeId = existing.assignedEmployeeId || null;
    vehicleData.assignedEmployeeName = existing.assignedEmployeeName || null;
    vehicleData.handoverDate = existing.handoverDate || null;
    await db.put('vehicles', vehicleData);
    await logAudit('تعديل', 'السيارات', vehicleData.id, `تم تعديل بيانات المركبة: ${vehicleData.brand} (${vehicleData.plateNumber})`);
    showToast(`تم حفظ تعديلات المركبة (${vehicleData.plateNumber}) بنجاح.`);
  } else {
    vehicleData.id = generateId('VEH');
    vehicleData.status = 'available';
    vehicleData.assignedEmployeeId = null;
    vehicleData.assignedEmployeeName = null;
    vehicleData.handoverDate = null;
    vehicleData.createdAt = new Date().toISOString();
    await db.add('vehicles', vehicleData);
    await logAudit('إنشاء', 'السيارات', vehicleData.id, `تم تسجيل مركبة جديدة بالأسطول: ${vehicleData.brand} ${vehicleData.model} لوحة ${vehicleData.plateNumber}`);
    showToast(`تمت إضافة المركبة الجديدة (${vehicleData.plateNumber}) بنجاح.`);
  }

  closeModal('vehicle-form-modal');
  await renderVehiclesList();
}

/**
 * Open Interactive Vehicle Inspection & Handover/Return Sheet
 */
export async function openVehicleInspectionModal(vehicleId, type = 'handover') {
  currentInspectingVehicleId = vehicleId;
  currentInspectionType = type;

  const vehicle = await db.get('vehicles', vehicleId);
  if (!vehicle) return;

  const modal = document.getElementById('vehicle-inspection-modal');
  const titleEl = document.getElementById('vehicle-inspection-modal-title');
  const empSelect = document.getElementById('veh-inspect-employee');
  const checklistContainer = document.getElementById('veh-inspection-checklist-rows');
  const form = document.getElementById('vehicle-inspection-form');

  titleEl.innerHTML = `<i class="fa-solid fa-clipboard-check text-primary"></i> ${type === 'handover' ? 'محضر فحص وتسليم مركبة' : 'محضر فحص واستلام مركبة معادة'}: <strong>${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber})</strong>`;

  const employees = await db.getAll('employees');
  const activeEmployees = employees.filter(e => e.status === 'active');
  empSelect.innerHTML = `<option value="">-- اختر الموظف --</option>` +
    activeEmployees.map(e => `<option value="${e.id}" ${vehicle.assignedEmployeeId === e.id ? 'selected' : ''}>${e.fullName} (${e.code} - ${e.jobTitle})</option>`).join('');

  if (type === 'return') {
    empSelect.value = vehicle.assignedEmployeeId || '';
  }

  form.reset();
  form.elements['date'].value = new Date().toISOString().split('T')[0];
  form.elements['odometer'].value = vehicle.odometer || 0;
  form.elements['fuelLevel'].value = vehicle.fuelLevel || 'ممتلئ (Full)';
  form.elements['inspectorName'].value = 'مسؤول الحركة والخدمات';

  // Render Checklist
  checklistContainer.innerHTML = VEHICLE_INSPECTION_ITEMS.map((item, index) => `
    <tr class="inspection-row" data-key="${item.label}">
      <td class="text-center font-mono text-xs">${index + 1}</td>
      <td>
        <strong>${item.label}</strong>
        <span class="text-xs text-muted block">${item.category}</span>
      </td>
      <td>
        <select class="form-select form-select-sm inspect-status-select" name="item_status_${index}">
          <option value="سليم" selected>سليم وجيد</option>
          <option value="ملاحظة/خدش">ملاحظة / خدش طفيف</option>
          <option value="متضرر">متضرر / يحتاج إصلاح</option>
          <option value="غير متوفر">غير متوفر / مفقود</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm" name="item_note_${index}" placeholder="تفاصيل الملاحظة إن وجدت..." />
      </td>
    </tr>
  `).join('');

  openModal(modal);
}

export async function processVehicleInspection(e) {
  e.preventDefault();
  const form = document.getElementById('vehicle-inspection-form');
  const vehicle = await db.get('vehicles', currentInspectingVehicleId);
  if (!vehicle) return;

  const empId = form.elements['employeeId'].value;
  const date = form.elements['date'].value;
  const odometer = Number(form.elements['odometer'].value || 0);
  const fuelLevel = form.elements['fuelLevel'].value;
  const inspectorName = form.elements['inspectorName'].value.trim();
  const notes = form.elements['notes'].value.trim();

  if (currentInspectionType === 'handover' && !empId) {
    showToast('يجب تحديد الموظف المستلم للمركبة.', 'error');
    return;
  }

  const employee = empId ? await db.get('employees', empId) : null;

  // Build inspection data items
  const inspectionItems = {};
  const rows = document.querySelectorAll('#veh-inspection-checklist-rows .inspection-row');
  rows.forEach((row, idx) => {
    const key = row.dataset.key;
    const status = row.querySelector(`[name="item_status_${idx}"]`)?.value || 'سليم';
    const note = row.querySelector(`[name="item_note_${idx}"]`)?.value || '';
    inspectionItems[key] = { status, note };
  });

  const inspectionData = {
    date,
    inspectorName,
    items: inspectionItems,
    fuelLevel,
    odometer,
    notes
  };

  // Update vehicle
  if (currentInspectionType === 'handover') {
    vehicle.status = 'delivered';
    vehicle.assignedEmployeeId = employee.id;
    vehicle.assignedEmployeeName = employee.fullName;
    vehicle.handoverDate = date;
    vehicle.odometer = odometer;
    vehicle.fuelLevel = fuelLevel;
    vehicle.updatedAt = new Date().toISOString();
    await db.put('vehicles', vehicle);

    await logAudit('تسليم سيارة', 'السيارات', vehicle.id, `تم فحص وتسليم المركبة (${vehicle.brand} لوحة ${vehicle.plateNumber}) للموظف (${employee.fullName})`);
    showToast(`تم تسجيل فحص وتسليم السيارة للموظف (${employee.fullName}) بنجاح.`);
  } else {
    // Return vehicle
    const prevEmp = vehicle.assignedEmployeeName || 'موظف';
    vehicle.status = 'available';
    vehicle.assignedEmployeeId = null;
    vehicle.assignedEmployeeName = null;
    vehicle.handoverDate = null;
    vehicle.odometer = odometer;
    vehicle.fuelLevel = fuelLevel;
    vehicle.updatedAt = new Date().toISOString();
    await db.put('vehicles', vehicle);

    await logAudit('إرجاع سيارة', 'السيارات', vehicle.id, `تم استلام وفحص المركبة المعادة (${vehicle.brand} لوحة ${vehicle.plateNumber}) من (${prevEmp})`);
    showToast(`تم فحص واستلام المركبة المعادة بنجاح.`);
  }

  closeModal('vehicle-inspection-modal');
  await renderVehiclesList();

  // Print inspection sheet
  const settings = await db.get('settings', 'company_settings');
  const html = buildVehicleInspectionDocumentHtml(vehicle, inspectionData, employee, settings);
  await previewAndPrintDocument(`محضر فحص وتسليم مركبة - ${vehicle.plateNumber}`, html, `محضر_مركبة_${vehicle.plateNumber}.pdf`, { module: 'السيارات', recordId: vehicle.id });
}

function setupVehicleEvents() {
  const addBtn = document.getElementById('btn-add-vehicle');
  if (addBtn) addBtn.addEventListener('click', () => openVehicleModal(null));

  const form = document.getElementById('vehicle-form');
  if (form) form.addEventListener('submit', saveVehicleFromForm);

  const inspectForm = document.getElementById('vehicle-inspection-form');
  if (inspectForm) inspectForm.addEventListener('submit', processVehicleInspection);

  const searchInput = document.getElementById('vehicle-search-input');
  const statusFilter = document.getElementById('vehicle-filter-status');

  if (searchInput) searchInput.addEventListener('input', () => renderVehiclesList());
  if (statusFilter) statusFilter.addEventListener('change', () => renderVehiclesList());

  document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-vehicle"]');
    if (editBtn) openVehicleModal(editBtn.dataset.id);

    const inspectHandoverBtn = e.target.closest('[data-action="inspect-handover-vehicle"]');
    if (inspectHandoverBtn) openVehicleInspectionModal(inspectHandoverBtn.dataset.id, 'handover');

    const inspectReturnBtn = e.target.closest('[data-action="inspect-return-vehicle"]');
    if (inspectReturnBtn) openVehicleInspectionModal(inspectReturnBtn.dataset.id, 'return');

    const printBtn = e.target.closest('[data-action="print-vehicle-sheet"]');
    if (printBtn) {
      const vehicle = await db.get('vehicles', printBtn.dataset.id);
      if (vehicle) {
        const employee = vehicle.assignedEmployeeId ? await db.get('employees', vehicle.assignedEmployeeId) : null;
        const settings = await db.get('settings', 'company_settings');
        const inspection = createDefaultInspectionSheet('handover');
        inspection.odometer = vehicle.odometer;
        inspection.fuelLevel = vehicle.fuelLevel;
        const html = buildVehicleInspectionDocumentHtml(vehicle, inspection, employee, settings);
        await previewAndPrintDocument(`بطاقة فحص مركبة - ${vehicle.plateNumber}`, html, `فحص_مركبة_${vehicle.plateNumber}.pdf`);
      }
    }

    const deleteBtn = e.target.closest('[data-action="delete-vehicle"]');
    if (deleteBtn) {
      const vehicle = await db.get('vehicles', deleteBtn.dataset.id);
      if (vehicle) {
        const confirmed = await showConfirmDialog({
          title: 'تأكيد حذف المركبة',
          message: `هل أنت متأكد من رغبتك في حذف السيارة <strong>(${vehicle.brand} - لوحة: ${vehicle.plateNumber})</strong> نهائياً؟`,
          confirmText: 'نعم، حذف المركبة',
          isDanger: true
        });
        if (confirmed) {
          await db.delete('vehicles', vehicle.id);
          await logAudit('حذف', 'السيارات', vehicle.id, `تم حذف المركبة: ${vehicle.plateNumber}`);
          showToast(`تم حذف المركبة (${vehicle.plateNumber}).`);
          await renderVehiclesList();
        }
      }
    }
  });
}
