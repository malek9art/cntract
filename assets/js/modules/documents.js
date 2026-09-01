/**
 * Abu Hudhayfah Exchange & Transfers - Document Repository Module
 */

import { db } from '../core/db.js';
import { formatDate } from '../utils/formatters.js';
import { generateId, readFileAsDataURL, escapeHtml } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal, showConfirmDialog } from '../ui/modal.js';

const MAX_DOC_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export async function initDocuments() {
  await renderDocumentsList();
  setupDocumentEvents();
}

export async function renderDocumentsList() {
  const container = document.getElementById('documents-grid-container');
  const countEl = document.getElementById('documents-count-badge');
  if (!container) return;

  const typeFilter = document.getElementById('doc-filter-category')?.value || '';
  const searchInput = document.getElementById('doc-search-input')?.value.trim().toLowerCase() || '';

  const documents = await db.getAll('documents');

  const filtered = documents.filter(d => {
    if (typeFilter && d.category !== typeFilter) return false;
    if (searchInput) {
      const matchTitle = (d.title || '').toLowerCase().includes(searchInput);
      const matchEmp = (d.relatedName || '').toLowerCase().includes(searchInput);
      if (!matchTitle && !matchEmp) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} مستند`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-full empty-state-card text-center py-8 text-muted">لا توجد مستندات مرفوعة تطابق الفلتر.</div>`;
    return;
  }

  container.innerHTML = filtered.map(d => {
    const isImage = d.fileType && d.fileType.startsWith('image/');
    const iconClass = isImage ? 'fa-file-image text-cyan' : d.fileType === 'application/pdf' ? 'fa-file-pdf text-rose' : 'fa-file-lines text-primary';

    return `
      <div class="card doc-item-card border border-slate-200 hover:shadow-md transition-shadow">
        <div class="card-body">
          <div class="flex items-start gap-3 mb-3">
            <div class="doc-file-icon text-3xl">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="flex-1">
              <h4 class="font-bold text-slate-800 line-clamp-1">${escapeHtml(d.title)}</h4>
              <span class="badge badge-subtle-blue text-xs mt-1">${escapeHtml(d.category) || 'مستند عام'}</span>
            </div>
          </div>

          <div class="text-xs text-slate-600 space-y-1 mb-4 bg-slate-50 p-2.5 rounded">
            <div><span class="text-muted">الجهة المرتبطة:</span> <strong>${escapeHtml(d.relatedName) || 'عام'}</strong></div>
            <div><span class="text-muted">تاريخ الرفع:</span> <span>${formatDate(d.createdAt)}</span></div>
            <div><span class="text-muted">حجم الملف:</span> <span class="ltr-text font-mono">${escapeHtml(d.fileSize) || 'N/A'}</span></div>
          </div>

          <div class="flex justify-between items-center pt-2 border-t border-slate-100">
            <button class="btn btn-sm btn-outline" data-action="preview-doc-file" data-id="${d.id}">
              <i class="fa-solid fa-eye ml-1"></i> معاينة
            </button>
            <button class="btn btn-sm btn-icon btn-ghost text-rose" data-action="delete-doc-file" data-id="${d.id}" title="حذف المستند">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export async function openUploadDocumentModal() {
  const modal = document.getElementById('upload-document-modal');
  const form = document.getElementById('upload-document-form');
  const empSelect = document.getElementById('doc-upload-employee');

  const employees = await db.getAll('employees');
  empSelect.innerHTML = `<option value="">-- غير مرتبط بموظف محدد (مستند عام) --</option>` +
    employees.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.fullName)} (${escapeHtml(e.code)})</option>`).join('');

  form.reset();
  openModal(modal);
}

export async function saveDocumentFromForm(e) {
  e.preventDefault();
  const form = document.getElementById('upload-document-form');
  const fileInput = document.getElementById('doc-file-input');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('يرجى اختيار ملف لرفعه.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const title = form.elements['title'].value.trim() || file.name;
  const category = form.elements['category'].value;
  const empId = form.elements['employeeId'].value;

  if (file.size > MAX_DOC_FILE_SIZE) {
    showToast('حجم الملف يجب ألا يتجاوز 10 ميجابايت.', 'error');
    return;
  }

  const normalizedFileType = (file.type || '').toLowerCase().split(/[;\s]/)[0];
  const isAllowedType = ALLOWED_DOC_TYPES.includes(normalizedFileType) ||
    normalizedFileType.startsWith('image/');
  if (!isAllowedType) {
    showToast('نوع الملف غير مدعوم. يُسمح فقط بالصور وملفات PDF والمستندات النصية وملفات Word وExcel.', 'error');
    return;
  }

  let relatedName = 'مستند عام للشركة';
  if (empId) {
    const emp = await db.get('employees', empId);
    if (emp) relatedName = `${emp.fullName} (${emp.code})`;
  }

  let fileDataUrl = '';
  try {
    fileDataUrl = await readFileAsDataURL(file);
  } catch (err) {
    showToast('فشل في قراءة الملف المحدد.', 'error');
    return;
  }

  const fileSizeStr = file.size > 1024 * 1024
    ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    : (file.size / 1024).toFixed(1) + ' KB';

  const doc = {
    id: generateId('DOC'),
    title,
    category,
    relatedType: empId ? 'employee' : 'general',
    relatedId: empId || null,
    relatedName,
    fileName: file.name,
    fileType: file.type,
    fileSize: fileSizeStr,
    dataUrl: fileDataUrl,
    createdAt: new Date().toISOString()
  };

  await db.add('documents', doc);
  await logAudit('إنشاء', 'المستندات', doc.id, `تم رفع مستند جديد: ${title} (${file.name})`);
  showToast(`تم رفع المستند (${title}) بنجاح.`);

  closeModal('upload-document-modal');
  await renderDocumentsList();
}

function setupDocumentEvents() {
  const uploadBtn = document.getElementById('btn-open-upload-doc');
  if (uploadBtn) uploadBtn.addEventListener('click', () => openUploadDocumentModal());

  const form = document.getElementById('upload-document-form');
  if (form) form.addEventListener('submit', saveDocumentFromForm);

  const searchInput = document.getElementById('doc-search-input');
  const catFilter = document.getElementById('doc-filter-category');

  if (searchInput) searchInput.addEventListener('input', () => renderDocumentsList());
  if (catFilter) catFilter.addEventListener('change', () => renderDocumentsList());

  document.addEventListener('click', async (e) => {
    const previewBtn = e.target.closest('[data-action="preview-doc-file"]');
    if (previewBtn) {
      const doc = await db.get('documents', previewBtn.dataset.id);
      if (doc && doc.dataUrl) {
        const isImg = doc.fileType && doc.fileType.startsWith('image/');
        const modal = document.getElementById('pdf-preview-modal');
        const bodyEl = document.getElementById('pdf-preview-body');
        const titleEl = document.getElementById('pdf-preview-title');

        titleEl.textContent = `معاينة مستند: ${doc.title}`;
        if (isImg) {
          bodyEl.innerHTML = `<div class="p-6 text-center"><img src="${escapeHtml(doc.dataUrl)}" alt="${escapeHtml(doc.title)}" class="max-h-[70vh] mx-auto rounded shadow" /></div>`;
        } else {
          bodyEl.innerHTML = `<iframe src="${escapeHtml(doc.dataUrl)}" class="w-full h-[70vh] border-0"></iframe>`;
        }
        openModal(modal);
      }
    }

    const deleteBtn = e.target.closest('[data-action="delete-doc-file"]');
    if (deleteBtn) {
      const doc = await db.get('documents', deleteBtn.dataset.id);
      if (doc) {
        const confirmed = await showConfirmDialog({
          title: 'تأكيد حذف المستند',
          message: `هل أنت متأكد من رغبتك في حذف المستند <strong>(${doc.title})</strong>؟`,
          confirmText: 'نعم، حذف',
          isDanger: true
        });
        if (confirmed) {
          await db.delete('documents', doc.id);
          await logAudit('حذف', 'المستندات', doc.id, `تم حذف المستند: ${doc.title}`);
          showToast(`تم حذف المستند.`);
          await renderDocumentsList();
        }
      }
    }
  });
}
