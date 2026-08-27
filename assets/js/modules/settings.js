/**
 * Abu Hudhayfah Exchange & Transfers - Settings & Backup Module
 */

import { db } from '../core/db.js';
import { formatDate } from '../utils/formatters.js';
import { exportDatabaseBackup, importDatabaseBackup } from '../services/backup-service.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';
import { generateId } from '../utils/helpers.js';

let currentEditingBranchId = null;

export async function initSettings() {
  await loadCompanySettingsForm();
  await renderBranchesList();
  setupSettingsEvents();
}

export async function loadCompanySettingsForm() {
  const settings = await db.get('settings', 'company_settings');
  if (!settings) return;

  const form = document.getElementById('company-settings-form');
  if (!form) return;

  form.elements['companyName'].value = settings.companyName || '';
  form.elements['companyNameEn'].value = settings.companyNameEn || '';
  form.elements['commercialRegister'].value = settings.commercialRegister || '';
  form.elements['taxNumber'].value = settings.taxNumber || '';
  form.elements['centralBankLicense'].value = settings.centralBankLicense || '';
  form.elements['headquarters'].value = settings.headquarters || '';
  form.elements['phone'].value = settings.phone || '';
  form.elements['phoneSecondary'].value = settings.phoneSecondary || '';
  form.elements['email'].value = settings.email || '';
  form.elements['defaultProbationPeriod'].value = settings.defaultProbationPeriod || '3 أشهر';
  form.elements['defaultWorkingHours'].value = settings.defaultWorkingHours || '8 ساعات يومياً';
  form.elements['defaultWorkingDays'].value = settings.defaultWorkingDays || 'من السبت إلى الخميس';
  form.elements['defaultNoticePeriod'].value = settings.defaultNoticePeriod || '30 يوماً';
  form.elements['legalDisclaimer'].value = settings.legalDisclaimer || '';

  const lastBackupEl = document.getElementById('settings-last-backup-date');
  if (lastBackupEl) {
    lastBackupEl.textContent = settings.lastBackupDate ? formatDate(settings.lastBackupDate) : 'لم يتم إجراء نسخة احتياطية بعد';
  }
}

export async function saveCompanySettings(e) {
  e.preventDefault();
  const form = document.getElementById('company-settings-form');
  const existing = await db.get('settings', 'company_settings') || {};

  const updatedSettings = {
    ...existing,
    companyName: form.elements['companyName'].value.trim(),
    companyNameEn: form.elements['companyNameEn'].value.trim(),
    commercialRegister: form.elements['commercialRegister'].value.trim(),
    taxNumber: form.elements['taxNumber'].value.trim(),
    centralBankLicense: form.elements['centralBankLicense'].value.trim(),
    headquarters: form.elements['headquarters'].value.trim(),
    phone: form.elements['phone'].value.trim(),
    phoneSecondary: form.elements['phoneSecondary'].value.trim(),
    email: form.elements['email'].value.trim(),
    defaultProbationPeriod: form.elements['defaultProbationPeriod'].value.trim(),
    defaultWorkingHours: form.elements['defaultWorkingHours'].value.trim(),
    defaultWorkingDays: form.elements['defaultWorkingDays'].value.trim(),
    defaultNoticePeriod: form.elements['defaultNoticePeriod'].value.trim(),
    legalDisclaimer: form.elements['legalDisclaimer'].value.trim(),
    updatedAt: new Date().toISOString()
  };

  await db.put('settings', updatedSettings);
  await logAudit('تحديث الإعدادات', 'الإعدادات', 'company_settings', 'تم حفظ وتحديث بيانات الشركة والإعدادات الافتراضية للنظام');
  showToast('تم حفظ إعدادات وبيانات الشركة بنجاح.');
}

export async function renderBranchesList() {
  const container = document.getElementById('settings-branches-list');
  if (!container) return;

  const branches = await db.getAll('branches');

  container.innerHTML = branches.map(b => `
    <div class="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center mb-2">
      <div>
        <div class="font-bold text-slate-800">
          <i class="fa-solid fa-building text-cyan ml-1"></i> ${b.name}
          ${b.isMain ? '<span class="badge badge-emerald text-xs mr-1">المركز الرئيسي</span>' : ''}
        </div>
        <div class="text-xs text-muted">${b.city} • ${b.address || ''} • هاتف: ${b.phone || '—'}</div>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-branch" data-id="${b.id}" title="تعديل الفرع">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        ${!b.isMain ? `
          <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-branch" data-id="${b.id}" title="حذف الفرع">
            <i class="fa-solid fa-trash"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

export async function openBranchModal(branchId = null) {
  currentEditingBranchId = branchId;
  const modal = document.getElementById('branch-form-modal');
  const titleEl = document.getElementById('branch-modal-title');
  const form = document.getElementById('branch-form');

  if (branchId) {
    titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-primary"></i> تعديل بيانات الفرع`;
    const b = await db.get('branches', branchId);
    if (!b) return;

    form.elements['name'].value = b.name || '';
    form.elements['city'].value = b.city || '';
    form.elements['address'].value = b.address || '';
    form.elements['phone'].value = b.phone || '';
    form.elements['isMain'].checked = !!b.isMain;
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-building-circle-plus text-primary"></i> إضافة فرع جديد`;
    form.reset();
  }

  openModal(modal);
}

export async function saveBranchFromForm(e) {
  e.preventDefault();
  const form = document.getElementById('branch-form');
  const name = form.elements['name'].value.trim();
  const city = form.elements['city'].value.trim();
  const address = form.elements['address'].value.trim();
  const phone = form.elements['phone'].value.trim();
  const isMain = form.elements['isMain'].checked;

  if (!name || !city) {
    showToast('اسم الفرع والمدينة مطلوبان.', 'error');
    return;
  }

  const branchData = {
    name,
    city,
    address,
    phone,
    isMain,
    active: true,
    updatedAt: new Date().toISOString()
  };

  if (currentEditingBranchId) {
    const existing = await db.get('branches', currentEditingBranchId);
    branchData.id = currentEditingBranchId;
    branchData.code = existing.code;
    await db.put('branches', branchData);
    await logAudit('تعديل', 'الفروع', branchData.id, `تم تعديل بيانات الفرع: ${name}`);
    showToast(`تم تعديل الفرع (${name}) بنجاح.`);
  } else {
    branchData.id = generateId('BR');
    branchData.code = 'BR-' + Math.floor(Math.random() * 900 + 100);
    await db.add('branches', branchData);
    await logAudit('إنشاء', 'الفروع', branchData.id, `تمت إضافة فرع جديد: ${name}`);
    showToast(`تمت إضافة الفرع الجديد (${name}) بنجاح.`);
  }

  closeModal('branch-form-modal');
  await renderBranchesList();
}

function setupSettingsEvents() {
  const companyForm = document.getElementById('company-settings-form');
  if (companyForm) companyForm.addEventListener('submit', saveCompanySettings);

  const addBranchBtn = document.getElementById('btn-add-branch');
  if (addBranchBtn) addBranchBtn.addEventListener('click', () => openBranchModal(null));

  const branchForm = document.getElementById('branch-form');
  if (branchForm) branchForm.addEventListener('submit', saveBranchFromForm);

  // Backup & Restore
  const exportBackupBtn = document.getElementById('btn-export-backup-json');
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', async () => {
      try {
        const res = await exportDatabaseBackup();
        showToast(`تم تصدير النسخة الاحتياطية بنجاح (${res.filename}).`);
        await loadCompanySettingsForm();
      } catch (err) {
        showToast('حدث خطأ أثناء تصدير النسخة الاحتياطية.', 'error');
      }
    });
  }

  const restoreInput = document.getElementById('backup-file-input');
  if (restoreInput) {
    restoreInput.addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];

      const confirmed = await showConfirmDialog({
        title: 'تأكيد استعادة النسخة الاحتياطية',
        message: `هل أنت متأكد من استعادة النسخة الاحتياطية من الملف <strong>(${file.name})</strong>؟ سيتم استبدال البيانات الحالية بالبيانات المستوردة.`,
        confirmText: 'نعم، استعادة النسخة',
        isDanger: true
      });

      if (confirmed) {
        try {
          const res = await importDatabaseBackup(file);
          showToast(`تمت استعادة النسخة الاحتياطية بنجاح (${res.tablesRestored} جداول).`);
          setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
          showToast(`فشلت الاستعادة: ${err.message}`, 'error');
        }
      }
      restoreInput.value = '';
    });
  }

  // Reset demo data button
  const resetDemoBtn = document.getElementById('btn-reset-demo-data');
  if (resetDemoBtn) {
    resetDemoBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'تأكيد إعادة تعيين البيانات التجريبية',
        message: 'هل تريد إعادة تعيين كافة بيانات النظام إلى البيانات الأولية المعتمدة لشركة أبو حذيفة؟',
        confirmText: 'نعم، إعادة التعيين',
        isDanger: true
      });
      if (confirmed) {
        await db.resetToDemo();
        showToast('تمت إعادة تعيين البيانات التجريبية بنجاح.');
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }

  document.addEventListener('click', async (e) => {
    const editBranchBtn = e.target.closest('[data-action="edit-branch"]');
    if (editBranchBtn) openBranchModal(editBranchBtn.dataset.id);

    const deleteBranchBtn = e.target.closest('[data-action="delete-branch"]');
    if (deleteBranchBtn) {
      const b = await db.get('branches', deleteBranchBtn.dataset.id);
      if (b) {
        const confirmed = await showConfirmDialog({
          title: 'تأكيد حذف الفرع',
          message: `هل أنت متأكد من رغبتك في حذف الفرع <strong>(${b.name})</strong>؟`,
          confirmText: 'نعم، حذف الفرع',
          isDanger: true
        });
        if (confirmed) {
          await db.delete('branches', b.id);
          await logAudit('حذف', 'الفروع', b.id, `تم حذف الفرع: ${b.name}`);
          showToast(`تم حذف الفرع (${b.name}).`);
          await renderBranchesList();
        }
      }
    }
  });
}
