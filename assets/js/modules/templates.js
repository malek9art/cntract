/**
 * Abu Hudhayfah Exchange & Transfers - Contract Templates Management Module
 */

import { db } from '../core/db.js';
import { CONTRACT_TYPES } from '../data/constants.js';
import { generateId } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';

let currentEditingTemplateId = null;

export async function initTemplates() {
  await renderTemplatesList();
  setupTemplateEvents();
}

export async function renderTemplatesList() {
  const container = document.getElementById('templates-grid-container');
  const countEl = document.getElementById('templates-count-badge');
  if (!container) return;

  const templates = await db.getAll('contract_templates');
  const clauses = await db.getAll('contract_clauses');
  const contracts = await db.getAll('contracts');

  if (countEl) countEl.textContent = `${templates.length} قوالب`;

  if (templates.length === 0) {
    container.innerHTML = `<div class="col-span-full empty-state-card text-center py-8 text-muted">لا توجد قوالب عقود مسجلة.</div>`;
    return;
  }

  container.innerHTML = templates.map(tpl => {
    const includedClausesCount = tpl.clauseIds ? tpl.clauseIds.length : clauses.length;
    const usageCount = contracts.filter(c => c.templateId === tpl.id).length;

    return `
      <div class="template-card card">
        <div class="card-header flex justify-between items-start">
          <div>
            <span class="badge badge-subtle-blue mb-1">${tpl.type || 'عقد مخصص'}</span>
            <h3 class="template-title text-lg font-bold text-slate-800">${tpl.name}</h3>
          </div>
          ${tpl.isDefault ? '<span class="badge badge-emerald">افتراضي</span>' : ''}
        </div>
        <div class="card-body">
          <p class="template-desc text-sm text-slate-600 mb-4">${tpl.description || 'لا يوجد وصف'}</p>

          <div class="template-meta-grid text-xs text-slate-500 mb-4">
            <div><i class="fa-solid fa-list-check text-cyan"></i> <strong>${includedClausesCount}</strong> بنود تعاقدية</div>
            <div><i class="fa-solid fa-file-contract text-primary"></i> تم استخدامه في <strong>${usageCount}</strong> عقود</div>
            <div><i class="fa-solid fa-clock"></i> تجربة: <strong>${tpl.defaultProbation || '3 أشهر'}</strong></div>
            <div><i class="fa-solid fa-bell"></i> إشعار: <strong>${tpl.defaultNotice || '30 يوماً'}</strong></div>
          </div>

          <div class="template-card-footer flex justify-between items-center pt-3 border-t border-slate-100">
            <button class="btn btn-sm btn-primary" data-action="use-template" data-id="${tpl.id}">
              <i class="fa-solid fa-file-circle-plus ml-1"></i> إنشاء عقد بهذا القالب
            </button>
            <div class="flex gap-1">
              <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-template" data-id="${tpl.id}" title="تعديل القالب والبنود">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-sm btn-icon btn-ghost" data-action="clone-template" data-id="${tpl.id}" title="نسخ القالب">
                <i class="fa-solid fa-clone"></i>
              </button>
              ${!tpl.isDefault ? `
                <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-template" data-id="${tpl.id}" title="حذف القالب">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export async function openTemplateModal(templateId = null) {
  currentEditingTemplateId = templateId;
  const modal = document.getElementById('template-form-modal');
  const titleEl = document.getElementById('template-modal-title');
  const form = document.getElementById('template-form');
  const typeSelect = document.getElementById('tpl-form-type');
  const clausesCheckboxContainer = document.getElementById('tpl-form-clauses-selection');

  // Populate Types
  typeSelect.innerHTML = CONTRACT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

  // Populate Clauses checkboxes
  const clauses = await db.getAll('contract_clauses');
  const sortedClauses = clauses.sort((a, b) => (a.order || 0) - (b.order || 0));

  let selectedClauseIds = [];

  if (templateId) {
    titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-primary"></i> تعديل قالب العقد`;
    const tpl = await db.get('contract_templates', templateId);
    if (!tpl) return;

    form.elements['name'].value = tpl.name || '';
    form.elements['type'].value = tpl.type || CONTRACT_TYPES[0];
    form.elements['description'].value = tpl.description || '';
    form.elements['defaultProbation'].value = tpl.defaultProbation || '3 أشهر';
    form.elements['defaultHours'].value = tpl.defaultHours || '8 ساعات يومياً';
    form.elements['defaultDays'].value = tpl.defaultDays || 'من السبت إلى الخميس';
    form.elements['defaultNotice'].value = tpl.defaultNotice || '30 يوماً';
    form.elements['isDefault'].checked = !!tpl.isDefault;

    selectedClauseIds = tpl.clauseIds || sortedClauses.map(c => c.id);
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-folder-plus text-primary"></i> إنشاء قالب عقد جديد`;
    form.reset();
    form.elements['defaultProbation'].value = '3 أشهر';
    form.elements['defaultHours'].value = '8 ساعات يومياً';
    form.elements['defaultDays'].value = 'من السبت إلى الخميس';
    form.elements['defaultNotice'].value = '30 يوماً';
    selectedClauseIds = sortedClauses.map(c => c.id);
  }

  // Render checklist
  clausesCheckboxContainer.innerHTML = sortedClauses.map((c, i) => `
    <label class="clause-check-item flex items-start gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer text-sm">
      <input type="checkbox" name="clause_id" value="${c.id}" ${selectedClauseIds.includes(c.id) ? 'checked' : ''} class="mt-1" />
      <div>
        <strong class="text-slate-800">${c.numberText || `البند ${i + 1}`}: ${c.title}</strong>
        <p class="text-xs text-slate-500 line-clamp-1">${c.content.substring(0, 70)}...</p>
      </div>
    </label>
  `).join('');

  openModal(modal);
}

export async function saveTemplateFromForm(e) {
  e.preventDefault();
  const form = document.getElementById('template-form');
  const name = form.elements['name'].value.trim();
  const type = form.elements['type'].value;
  const description = form.elements['description'].value.trim();
  const defaultProbation = form.elements['defaultProbation'].value.trim();
  const defaultHours = form.elements['defaultHours'].value.trim();
  const defaultDays = form.elements['defaultDays'].value.trim();
  const defaultNotice = form.elements['defaultNotice'].value.trim();
  const isDefault = form.elements['isDefault'].checked;

  const checkedBoxes = form.querySelectorAll('input[name="clause_id"]:checked');
  const clauseIds = Array.from(checkedBoxes).map(cb => cb.value);

  if (!name) {
    showToast('اسم القالب مطلوب.', 'error');
    return;
  }

  if (clauseIds.length === 0) {
    showToast('يجب اختيار بند تعاقدي واحد على الأقل في القالب.', 'warning');
    return;
  }

  const templateData = {
    name,
    type,
    description,
    defaultProbation,
    defaultHours,
    defaultDays,
    defaultNotice,
    isDefault,
    clauseIds,
    updatedAt: new Date().toISOString()
  };

  if (currentEditingTemplateId) {
    const existing = await db.get('contract_templates', currentEditingTemplateId);
    templateData.id = currentEditingTemplateId;
    templateData.createdAt = existing.createdAt;
    await db.put('contract_templates', templateData);
    await logAudit('تعديل قالب', 'قوالب العقود', templateData.id, `تم تعديل قالب العقد: ${name}`);
    showToast(`تم حفظ تعديلات القالب (${name}) بنجاح.`);
  } else {
    templateData.id = generateId('TPL');
    templateData.createdAt = new Date().toISOString();
    await db.add('contract_templates', templateData);
    await logAudit('إنشاء', 'قوالب العقود', templateData.id, `تم إنشاء قالب عقد جديد: ${name}`);
    showToast(`تم إنشاء القالب الجديد (${name}) بنجاح.`);
  }

  closeModal('template-form-modal');
  await renderTemplatesList();
}

function setupTemplateEvents() {
  const addBtn = document.getElementById('btn-add-template');
  if (addBtn) addBtn.addEventListener('click', () => openTemplateModal(null));

  const form = document.getElementById('template-form');
  if (form) form.addEventListener('submit', saveTemplateFromForm);

  // Select all / deselect all clauses
  const selectAllBtn = document.getElementById('btn-tpl-select-all-clauses');
  const deselectAllBtn = document.getElementById('btn-tpl-deselect-all-clauses');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('#tpl-form-clauses-selection input[name="clause_id"]').forEach(cb => cb.checked = true);
    });
  }
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('#tpl-form-clauses-selection input[name="clause_id"]').forEach(cb => cb.checked = false);
    });
  }

  document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-template"]');
    if (editBtn) openTemplateModal(editBtn.dataset.id);

    const cloneBtn = e.target.closest('[data-action="clone-template"]');
    if (cloneBtn) {
      const tpl = await db.get('contract_templates', cloneBtn.dataset.id);
      if (tpl) {
        const cloned = {
          ...tpl,
          id: generateId('TPL'),
          name: tpl.name + ' (نسخة مطابقة)',
          isDefault: false,
          createdAt: new Date().toISOString()
        };
        await db.add('contract_templates', cloned);
        await logAudit('إنشاء', 'قوالب العقود', cloned.id, `تم نسخ القالب: ${tpl.name}`);
        showToast(`تم استنساخ القالب (${tpl.name}) بنجاح.`);
        await renderTemplatesList();
      }
    }

    const deleteBtn = e.target.closest('[data-action="delete-template"]');
    if (deleteBtn) {
      const tpl = await db.get('contract_templates', deleteBtn.dataset.id);
      if (tpl) {
        const confirmed = await showConfirmDialog({
          title: 'تأكيد حذف القالب',
          message: `هل أنت متأكد من رغبتك في حذف القالب <strong>(${tpl.name})</strong>؟ لن تتأثر العقود السابقة الصادرة بموجبه.`,
          confirmText: 'نعم، حذف القالب',
          isDanger: true
        });
        if (confirmed) {
          await db.delete('contract_templates', tpl.id);
          await logAudit('حذف', 'قوالب العقود', tpl.id, `تم حذف القالب: ${tpl.name}`);
          showToast(`تم حذف القالب (${tpl.name}).`);
          await renderTemplatesList();
        }
      }
    }
  });
}
