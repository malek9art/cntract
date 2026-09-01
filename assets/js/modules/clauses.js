/**
 * Abu Hudhayfah Exchange & Transfers - Contract Clauses Editor Module
 */

import { db } from '../core/db.js';
import { DYNAMIC_VARIABLES } from '../data/constants.js';
import { generateId } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';

let currentEditingClauseId = null;

export async function initClauses() {
  await renderClausesList();
  renderDynamicVariablesPalette();
  setupClauseEvents();
}

export async function renderClausesList() {
  const container = document.getElementById('clauses-list-container');
  const countEl = document.getElementById('clauses-count-badge');
  if (!container) return;

  const clauses = await db.getAll('contract_clauses');
  const sorted = clauses.sort((a, b) => (a.order || 0) - (b.order || 0));

  if (countEl) countEl.textContent = `${sorted.length} بند`;

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card text-center py-8 text-muted">
        <i class="fa-solid fa-file-circle-question text-3xl mb-2 text-slate-400"></i>
        <div>لا توجد بنود مسجلة. يمكنك إعادة تحميل البنود الافتراضية من الإعدادات.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = sorted.map((clause, index) => {
    const isFirst = index === 0;
    const isLast = index === sorted.length - 1;
    const isActive = clause.isActive !== false;

    return `
      <div class="clause-card ${isActive ? '' : 'clause-disabled'}" data-clause-id="${clause.id}">
        <div class="clause-card-header">
          <div class="clause-order-badge">${clause.order || (index + 1)}</div>
          <div class="clause-title-area">
            <span class="clause-num-tag font-semibold text-primary">${clause.numberText || `البند ${index + 1}`}</span>
            <h4 class="clause-heading">${clause.title}</h4>
            ${!isActive ? '<span class="badge badge-slate text-xs mr-2">معطّل</span>' : ''}
          </div>
          <div class="clause-card-actions">
            <button class="btn btn-sm btn-icon btn-ghost" data-action="reorder-clause-up" data-id="${clause.id}" ${isFirst ? 'disabled' : ''} title="تحريك لأعلى">
              <i class="fa-solid fa-arrow-up"></i>
            </button>
            <button class="btn btn-sm btn-icon btn-ghost" data-action="reorder-clause-down" data-id="${clause.id}" ${isLast ? 'disabled' : ''} title="تحريك لأسفل">
              <i class="fa-solid fa-arrow-down"></i>
            </button>
            <button class="btn btn-sm btn-icon btn-ghost" data-action="toggle-clause-status" data-id="${clause.id}" title="${isActive ? 'تعطيل البند' : 'تفعيل البند'}">
              <i class="fa-solid ${isActive ? 'fa-toggle-on text-emerald' : 'fa-toggle-off text-slate-400'} text-lg"></i>
            </button>
            <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-clause" data-id="${clause.id}" title="تعديل البند">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-sm btn-icon btn-ghost" data-action="clone-clause" data-id="${clause.id}" title="نسخ البند">
              <i class="fa-solid fa-clone"></i>
            </button>
            <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-clause" data-id="${clause.id}" title="حذف البند">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="clause-card-body">
          <p class="clause-text-preview">${clause.content}</p>
        </div>
      </div>
    `;
  }).join('');
}

export function renderDynamicVariablesPalette() {
  const container = document.getElementById('clause-variable-palette');
  if (!container) return;

  container.innerHTML = DYNAMIC_VARIABLES.map(v => `
    <button type="button" class="btn btn-xs btn-outline variable-tag-btn" data-tag="${v.tag}" title="${v.sample}">
      <i class="fa-solid fa-code text-cyan text-xs ml-1"></i> ${v.label} <code class="ltr-text text-xs mr-1 text-slate-500">${v.tag}</code>
    </button>
  `).join('');

  // Add click to insert tag
  container.querySelectorAll('.variable-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      const textarea = document.getElementById('clause-form-content');
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      textarea.value = val.substring(0, start) + tag + val.substring(end);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    });
  });
}

export async function openClauseModal(clauseId = null) {
  currentEditingClauseId = clauseId;
  const modal = document.getElementById('clause-form-modal');
  const titleEl = document.getElementById('clause-modal-title');
  const form = document.getElementById('clause-form');

  if (clauseId) {
    titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-primary"></i> تعديل بند التعاقد`;
    const clause = await db.get('contract_clauses', clauseId);
    if (!clause) return;

    form.elements['numberText'].value = clause.numberText || '';
    form.elements['title'].value = clause.title || '';
    form.elements['content'].value = clause.content || '';
    form.elements['order'].value = clause.order || 1;
    form.elements['isActive'].checked = clause.isActive !== false;
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-plus-circle text-primary"></i> إضافة بند جديد`;
    form.reset();
    const count = await db.count('contract_clauses');
    form.elements['order'].value = count + 1;
    form.elements['numberText'].value = `البند ${count + 1}`;
    form.elements['isActive'].checked = true;
  }

  openModal(modal);
}

export async function saveClauseFromForm(e) {
  e.preventDefault();
  const form = document.getElementById('clause-form');
  const title = form.elements['title'].value.trim();
  const content = form.elements['content'].value.trim();
  const numberText = form.elements['numberText'].value.trim();
  const order = parseInt(form.elements['order'].value, 10) || 1;
  const isActive = form.elements['isActive'].checked;

  if (!title || !content) {
    showToast('عنوان البند ونص البند مطلوبان.', 'error');
    return;
  }

  if (currentEditingClauseId) {
    const existing = await db.get('contract_clauses', currentEditingClauseId);
    const updated = {
      ...existing,
      title,
      content,
      numberText,
      order,
      isActive,
      updatedAt: new Date().toISOString()
    };
    await db.put('contract_clauses', updated);
    await logAudit('تعديل', 'بنود العقود', updated.id, `تم تعديل البند: ${title}`);
    showToast(`تم حفظ تعديلات البند (${title}) بنجاح.`);
  } else {
    const newClause = {
      id: generateId('CLS'),
      title,
      content,
      numberText,
      order,
      isActive,
      createdAt: new Date().toISOString()
    };
    await db.add('contract_clauses', newClause);
    await logAudit('إنشاء', 'بنود العقود', newClause.id, `تمت إضافة بند تعاقدي جديد: ${title}`);
    showToast(`تمت إضافة البند الجديد (${title}) بنجاح.`);
  }

  closeModal('clause-form-modal');
  await renderClausesList();
}

async function moveClauseOrder(clauseId, direction) {
  const clauses = await db.getAll('contract_clauses');
  const sorted = clauses.sort((a, b) => (a.order || 0) - (b.order || 0));
  const index = sorted.findIndex(c => c.id === clauseId);

  if (index === -1) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return;

  // Swap orders
  const currentOrder = sorted[index].order || (index + 1);
  const targetOrder = sorted[targetIndex].order || (targetIndex + 1);

  sorted[index].order = targetOrder;
  sorted[targetIndex].order = currentOrder;

  await db.put('contract_clauses', sorted[index]);
  await db.put('contract_clauses', sorted[targetIndex]);

  await renderClausesList();
}

function setupClauseEvents() {
  const addBtn = document.getElementById('btn-add-clause');
  if (addBtn) addBtn.addEventListener('click', () => openClauseModal(null));

  const form = document.getElementById('clause-form');
  if (form) form.addEventListener('submit', saveClauseFromForm);

  document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-action="edit-clause"]');
    if (editBtn) openClauseModal(editBtn.dataset.id);

    const upBtn = e.target.closest('[data-action="reorder-clause-up"]');
    if (upBtn) moveClauseOrder(upBtn.dataset.id, 'up');

    const downBtn = e.target.closest('[data-action="reorder-clause-down"]');
    if (downBtn) moveClauseOrder(downBtn.dataset.id, 'down');

    const toggleBtn = e.target.closest('[data-action="toggle-clause-status"]');
    if (toggleBtn) {
      const clause = await db.get('contract_clauses', toggleBtn.dataset.id);
      if (clause) {
        clause.isActive = clause.isActive === false ? true : false;
        await db.put('contract_clauses', clause);
        await logAudit('تعديل', 'بنود العقود', clause.id, `تم ${clause.isActive ? 'تفعيل' : 'تعطيل'} البند: ${clause.title}`);
        showToast(`تم ${clause.isActive ? 'تفعيل' : 'تعطيل'} البند (${clause.title}).`);
        await renderClausesList();
      }
    }

    const cloneBtn = e.target.closest('[data-action="clone-clause"]');
    if (cloneBtn) {
      const clause = await db.get('contract_clauses', cloneBtn.dataset.id);
      if (clause) {
        const count = await db.count('contract_clauses');
        const cloned = {
          ...clause,
          id: generateId('CLS'),
          title: clause.title + ' (نسخة مكررة)',
          order: count + 1,
          createdAt: new Date().toISOString()
        };
        await db.add('contract_clauses', cloned);
        await logAudit('إنشاء', 'بنود العقود', cloned.id, `تم نسخ البند: ${clause.title}`);
        showToast(`تم نسخ البند (${clause.title}) بنجاح.`);
        await renderClausesList();
      }
    }

    const deleteBtn = e.target.closest('[data-action="delete-clause"]');
    if (deleteBtn) {
      const clause = await db.get('contract_clauses', deleteBtn.dataset.id);
      if (clause) {
        const confirmed = await showConfirmDialog({
          title: 'تأكيد حذف البند',
          message: `هل أنت متأكد من رغبتك في حذف البند <strong>(${clause.title})</strong> نهائياً من قائمة البنود المركزية؟`,
          confirmText: 'نعم، حذف البند',
          isDanger: true
        });
        if (confirmed) {
          await db.delete('contract_clauses', clause.id);
          await logAudit('حذف', 'بنود العقود', clause.id, `تم حذف البند: ${clause.title}`);
          showToast(`تم حذف البند (${clause.title}).`);
          await renderClausesList();
        }
      }
    }
  });
}
