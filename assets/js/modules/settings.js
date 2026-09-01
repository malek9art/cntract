/**
 * Abu Hudhayfah Exchange & Transfers - Settings, First Party Configuration & Cloud Sync Module
 */

import { db } from '../core/db.js';
import { formatDate } from '../utils/formatters.js';
import { exportDatabaseBackup, importDatabaseBackup } from '../services/backup-service.js';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  syncLocalToSupabase,
  syncSupabaseToLocal,
  isSupabaseConnected
} from '../services/supabase-service.js';
import { DEMO_SAMPLE_DATA } from '../data/initial-data.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';
import { generateId } from '../utils/helpers.js';

let currentEditingBranchId = null;

export function applyBranding(settings) {
  if (!settings) return;

  const logoUrl = settings.logoUrl || 'assets/images/logo.svg';
  const stampUrl = settings.stampUrl || 'assets/images/stamp.svg';

  document.querySelectorAll('.topbar-logo-img, .sidebar-brand-logo, #login-gate-logo-img').forEach(img => {
    img.src = logoUrl;
  });

  const previewLogo = document.getElementById('settings-logo-preview-img');
  if (previewLogo) previewLogo.src = logoUrl;

  const previewStamp = document.getElementById('settings-stamp-preview-img');
  if (previewStamp) previewStamp.src = stampUrl;
}

export async function initSettings() {
  await loadCompanySettingsForm();
  await loadSupabaseSettingsForm();
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
  form.elements['firstPartyName'].value = settings.firstPartyName || settings.companyName || '';
  form.elements['firstPartyRepName'].value = settings.firstPartyRepName || '';
  form.elements['firstPartyRepRole'].value = settings.firstPartyRepRole || '';
  form.elements['commercialRegister'].value = settings.commercialRegister || '';
  form.elements['taxNumber'].value = settings.taxNumber || '';
  form.elements['centralBankLicense'].value = settings.centralBankLicense || '';
  form.elements['headquarters'].value = settings.headquarters || '';
  form.elements['phone'].value = settings.phone || '';
  form.elements['phoneSecondary'].value = settings.phoneSecondary || '';
  form.elements['email'].value = settings.email || '';
  form.elements['logoUrl'].value = settings.logoUrl || 'assets/images/logo.svg';
  form.elements['stampUrl'].value = settings.stampUrl || 'assets/images/stamp.svg';
  form.elements['defaultProbationPeriod'].value = settings.defaultProbationPeriod || '3 أشهر';
  form.elements['defaultWorkingHours'].value = settings.defaultWorkingHours || '8 ساعات يومياً';
  form.elements['defaultWorkingDays'].value = settings.defaultWorkingDays || 'من السبت إلى الخميس';
  form.elements['defaultNoticePeriod'].value = settings.defaultNoticePeriod || '30 يوماً';
  form.elements['legalDisclaimer'].value = settings.legalDisclaimer || '';

  const requireAuthCheckbox = document.getElementById('settings-require-auth-toggle');
  if (requireAuthCheckbox) {
    requireAuthCheckbox.checked = settings.requireAuthOnStart !== false;
  }

  const lastBackupEl = document.getElementById('settings-last-backup-date');
  if (lastBackupEl) {
    lastBackupEl.textContent = settings.lastBackupDate ? formatDate(settings.lastBackupDate) : 'لم يتم إجراء نسخة احتياطية بعد';
  }

  applyBranding(settings);
}

export async function loadSupabaseSettingsForm() {
  const config = await getSupabaseConfig();
  const form = document.getElementById('supabase-config-form');
  if (!form) return;

  form.elements['supabaseEnabled'].checked = !!config.enabled;
  form.elements['supabaseUrl'].value = config.url || '';
  form.elements['supabaseAnonKey'].value = config.anonKey || '';

  const syncDateEl = document.getElementById('supabase-last-sync-date');
  if (syncDateEl) {
    syncDateEl.textContent = config.lastSyncDate ? formatDate(config.lastSyncDate) : 'لم تتم المزامنة بعد';
  }

  const badgeEl = document.getElementById('supabase-status-badge');
  if (badgeEl) {
    if (config.enabled && isSupabaseConnected()) {
      badgeEl.className = 'badge badge-emerald text-xs';
      badgeEl.innerHTML = `<i class="fa-solid fa-cloud-bolt ml-1"></i> متصل بالسحابة`;
    } else if (config.enabled) {
      badgeEl.className = 'badge badge-amber text-xs';
      badgeEl.innerHTML = `<i class="fa-solid fa-cloud text-xs ml-1"></i> مهيأ (غير متصل)`;
    } else {
      badgeEl.className = 'badge badge-slate text-xs';
      badgeEl.innerHTML = `<i class="fa-solid fa-hard-drive text-xs ml-1"></i> وضع محلي فقط`;
    }
  }
}

export async function saveCompanySettings(e) {
  e.preventDefault();
  const form = document.getElementById('company-settings-form');
  const existing = await db.get('settings', 'company_settings') || {};
  const requireAuthCheckbox = document.getElementById('settings-require-auth-toggle');

  const updatedSettings = {
    ...existing,
    companyName: form.elements['companyName'].value.trim(),
    companyNameEn: form.elements['companyNameEn'].value.trim(),
    firstPartyName: form.elements['firstPartyName'].value.trim() || form.elements['companyName'].value.trim(),
    firstPartyRepName: form.elements['firstPartyRepName'].value.trim(),
    firstPartyRepRole: form.elements['firstPartyRepRole'].value.trim(),
    commercialRegister: form.elements['commercialRegister'].value.trim(),
    taxNumber: form.elements['taxNumber'].value.trim(),
    centralBankLicense: form.elements['centralBankLicense'].value.trim(),
    headquarters: form.elements['headquarters'].value.trim(),
    phone: form.elements['phone'].value.trim(),
    phoneSecondary: form.elements['phoneSecondary'].value.trim(),
    email: form.elements['email'].value.trim(),
    logoUrl: form.elements['logoUrl'].value.trim() || 'assets/images/logo.svg',
    stampUrl: form.elements['stampUrl'].value.trim() || 'assets/images/stamp.svg',
    defaultProbationPeriod: form.elements['defaultProbationPeriod'].value.trim(),
    defaultWorkingHours: form.elements['defaultWorkingHours'].value.trim(),
    defaultWorkingDays: form.elements['defaultWorkingDays'].value.trim(),
    defaultNoticePeriod: form.elements['defaultNoticePeriod'].value.trim(),
    legalDisclaimer: form.elements['legalDisclaimer'].value.trim(),
    requireAuthOnStart: requireAuthCheckbox ? requireAuthCheckbox.checked : true,
    updatedAt: new Date().toISOString()
  };

  await db.put('settings', updatedSettings);
  applyBranding(updatedSettings);
  await logAudit('تحديث الإعدادات', 'الإعدادات', 'company_settings', `تم تحديث بيانات الطرف الأول (${updatedSettings.firstPartyName}) والشعار والإعدادات العامة`);
  showToast('تم حفظ بيانات الشركة والشعار والطرف الأول بنجاح.');
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

  const branchForm = document.getElementById('branch-form');
  if (branchForm) branchForm.addEventListener('submit', saveBranchFromForm);

  const addBranchBtn = document.getElementById('btn-add-branch');
  if (addBranchBtn) addBranchBtn.addEventListener('click', () => openBranchModal(null));

  // Logo File Upload handler (Convert to Base64)
  const logoFileInput = document.getElementById('logo-file-input');
  if (logoFileInput) {
    logoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showToast('حجم صورة الشعار يجب ألا يتجاوز 2 ميجابايت.', 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result;
          const urlInput = document.getElementById('settings-logo-url-input');
          const preview = document.getElementById('settings-logo-preview-img');
          if (urlInput) urlInput.value = base64Data;
          if (preview) preview.src = base64Data;
          showToast('تم تحميل صورة الشعار بنجاح. اضغط حفظ الإعدادات لتثبيتها.');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Stamp File Upload handler (Convert to Base64)
  const stampFileInput = document.getElementById('stamp-file-input');
  if (stampFileInput) {
    stampFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showToast('حجم صورة الختم يجب ألا يتجاوز 2 ميجابايت.', 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result;
          const urlInput = document.getElementById('settings-stamp-url-input');
          const preview = document.getElementById('settings-stamp-preview-img');
          if (urlInput) urlInput.value = base64Data;
          if (preview) preview.src = base64Data;
          showToast('تم تحميل صورة الختم بنجاح. اضغط حفظ الإعدادات لتثبيتها.');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Supabase Form & Actions
  const supabaseForm = document.getElementById('supabase-config-form');
  if (supabaseForm) {
    supabaseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enabled = supabaseForm.elements['supabaseEnabled'].checked;
      const url = supabaseForm.elements['supabaseUrl'].value.trim();
      const anonKey = supabaseForm.elements['supabaseAnonKey'].value.trim();

      await saveSupabaseConfig({ enabled, url, anonKey });
      showToast('تم حفظ إعدادات ربط Supabase السحابية.');
      await loadSupabaseSettingsForm();
    });
  }

  const testSupabaseBtn = document.getElementById('btn-test-supabase');
  if (testSupabaseBtn) {
    testSupabaseBtn.addEventListener('click', async () => {
      const url = document.getElementById('supabase-url-input')?.value.trim();
      const anonKey = document.getElementById('supabase-anon-key-input')?.value.trim();

      if (!url || !anonKey) {
        showToast('يرجى إدخال عنوان المشروع Project URL والمفتاح العام Anon Key أولاً.', 'warning');
        return;
      }

      try {
        testSupabaseBtn.disabled = true;
        testSupabaseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-1"></i> جاري الاتصال...';
        const res = await testSupabaseConnection(url, anonKey);
        showToast(res.message, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        testSupabaseBtn.disabled = false;
        testSupabaseBtn.innerHTML = '<i class="fa-solid fa-plug ml-1"></i> اختبار الاتصال بـ Supabase';
      }
    });
  }

  const syncToCloudBtn = document.getElementById('btn-sync-to-supabase');
  if (syncToCloudBtn) {
    syncToCloudBtn.addEventListener('click', async () => {
      try {
        syncToCloudBtn.disabled = true;
        syncToCloudBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-1"></i> جاري رفع البيانات...';
        const res = await syncLocalToSupabase();
        showToast(`تمت مزامنة ورفع ${res.count} سجل إلى قاعدة Supabase بنجاح.`);
        await loadSupabaseSettingsForm();
      } catch (err) {
        showToast(`فشلت المزامنة: ${err.message}`, 'error');
      } finally {
        syncToCloudBtn.disabled = false;
        syncToCloudBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up ml-1"></i> مزامنة ورفع البيانات إلى السحابة';
      }
    });
  }

  const pullFromCloudBtn = document.getElementById('btn-pull-from-supabase');
  if (pullFromCloudBtn) {
    pullFromCloudBtn.addEventListener('click', async () => {
      try {
        pullFromCloudBtn.disabled = true;
        pullFromCloudBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-1"></i> جاري تنزيل البيانات...';
        const res = await syncSupabaseToLocal();
        showToast(`تم استيراد ${res.count} سجل من قاعدة بيانات Supabase بنجاح.`);
        await loadSupabaseSettingsForm();
      } catch (err) {
        showToast(`فشل الاستيراد: ${err.message}`, 'error');
      } finally {
        pullFromCloudBtn.disabled = false;
        pullFromCloudBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down ml-1"></i> تنزيل واستيراد البيانات من السحابة';
      }
    });
  }

  // Backup JSON
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
        message: `هل أنت متأكد من استعادة النسخة الاحتياطية من الملف <strong>(${file.name})</strong>؟`,
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

  // Load Demo Data on Explicit Demand
  const loadDemoBtn = document.getElementById('btn-load-sample-demo-data');
  if (loadDemoBtn) {
    loadDemoBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'تحميل بيانات تجريبية',
        message: 'هل تريد تحميل عينة بيانات تجريبية (موظفين، عهد، سيارات) لأغراض الاختبار والمعاينة؟',
        confirmText: 'نعم، تحميل العينة',
        isDanger: false
      });
      if (confirmed) {
        if (DEMO_SAMPLE_DATA.employees) await db.bulkAdd('employees', DEMO_SAMPLE_DATA.employees);
        if (DEMO_SAMPLE_DATA.custodies) await db.bulkAdd('custodies', DEMO_SAMPLE_DATA.custodies);
        if (DEMO_SAMPLE_DATA.vehicles) await db.bulkAdd('vehicles', DEMO_SAMPLE_DATA.vehicles);
        await logAudit('تحميل بيانات تجريبية', 'النظام', 'DEMO', 'تم تحميل عينة بيانات تجريبية للاختبار');
        showToast('تم تحميل البيانات التجريبية بنجاح.');
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }

  // Clear All Data
  const clearAllBtn = document.getElementById('btn-clear-all-system-data');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'تأكيد تفريغ كافة البيانات',
        message: 'تحذير: سيتم مسح كافة الموظفين والعقود والعهد والسيارات والمحاضر لتبدأ بقاعدة بيانات نظيفة 100%. هل أنت متأكد؟',
        confirmText: 'نعم، مسح وتفريغ البيانات',
        isDanger: true
      });
      if (confirmed) {
        await db.clearAllData();
        await logAudit('تفريغ البيانات', 'النظام', 'CLEAN', 'تم تفريغ كافة البيانات لتبدأ بقاعدة نظيفة');
        showToast('تم تفريغ كافة البيانات بنجاح.');
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
