/**
 * Abu Hudhayfah Exchange & Transfers - Universal Modal Engine
 */

export function openModal(modalId) {
  const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
  if (!modal) return;
  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

export function closeModal(modalId) {
  const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
  if (!modal) return;
  modal.classList.remove('active');
  if (!document.querySelector('.app-modal.active')) {
    document.body.classList.remove('modal-open');
  }
}

export function setupModalListeners() {
  // Close buttons
  document.addEventListener('click', (e) => {
    const closeTrigger = e.target.closest('[data-close-modal]');
    if (closeTrigger) {
      const modal = closeTrigger.closest('.app-modal');
      if (modal) closeModal(modal);
    }

    // Click on modal backdrop (outside dialog)
    if (e.target.classList.contains('app-modal')) {
      closeModal(e.target);
    }
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.app-modal.active');
      if (activeModal) closeModal(activeModal);
    }
  });
}

/**
 * Universal Confirmation Dialog Promise
 */
export function showConfirmDialog({ title = 'تأكيد الإجراء', message = 'هل أنت متأكد من المتابعة؟', confirmText = 'نعم، تأكيد', cancelText = 'إلغاء', isDanger = false }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-action-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-submit-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

    if (!modal) {
      // Fallback
      resolve(window.confirm(message));
      return;
    }

    titleEl.textContent = title;
    messageEl.innerHTML = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    if (isDanger) {
      confirmBtn.className = 'btn btn-danger';
    } else {
      confirmBtn.className = 'btn btn-primary';
    }

    const cleanup = () => {
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      closeModal(modal);
    };

    confirmBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    openModal(modal);
  });
}
