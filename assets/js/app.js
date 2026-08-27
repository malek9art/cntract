/**
 * Abu Hudhayfah Exchange & Transfers - Master Application Orchestrator & Router
 * Enhanced with Service Worker PWA, Offline-First state management, and high-precision printing.
 */

import { db } from './core/db.js';
import { setupModalListeners } from './ui/modal.js';
import { showToast } from './ui/toast.js';

// Module initializers
import { initDashboard, renderDashboardMetrics } from './modules/dashboard.js';
import { initEmployees, renderEmployeesList, viewEmployeeProfile, openEmployeeFormModal } from './modules/employees.js';
import { initContracts, renderContractsList, openContractModal } from './modules/contracts.js';
import { initTemplates, renderTemplatesList, openTemplateModal } from './modules/templates.js';
import { initClauses, renderClausesList, openClauseModal } from './modules/clauses.js';
import { initCustodies, renderCustodiesList, openCustodyModal, openHandoverModal } from './modules/custodies.js';
import { initVouchers, renderVouchersList } from './modules/vouchers.js';
import { initVehicles, renderVehiclesList, openVehicleModal, openVehicleInspectionModal } from './modules/vehicles.js';
import { initSalaries, renderSalariesList } from './modules/salaries.js';
import { initDocuments, renderDocumentsList, openUploadDocumentModal } from './modules/documents.js';
import { initReports, renderReportView } from './modules/reports.js';
import { initAuditLog, renderAuditLogList } from './modules/audit-log.js';
import { initSettings } from './modules/settings.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
  }

  async start() {
    try {
      console.log('Starting Abu Hudhayfah HR & Contracts Management System...');
      await db.init();
      setupModalListeners();
      this.setupRouter();
      this.setupGlobalEvents();
      this.setupGlobalSearch();
      this.setupNotificationsDropdown();
      this.setupQuickActions();
      this.startLiveClock();
      this.setupTabControllers();
      this.setupOfflineMonitor();
      this.registerServiceWorker();

      // Navigate to initial hash or dashboard
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      await this.navigate(hash);
      console.log('System ready.');
    } catch (error) {
      console.error('System initialization error:', error);
      showToast('حدث خطأ أثناء تهيئة قاعدة البيانات المحلية.', 'error');
    }
  }

  setupRouter() {
    window.addEventListener('hashchange', () => {
      const fullHash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(fullHash);
    });
  }

  async navigate(route) {
    const [viewName, queryString] = route.split('?');
    const params = new URLSearchParams(queryString || '');

    // Highlight active sidebar nav item
    document.querySelectorAll('.sidebar-nav-item').forEach(el => {
      const target = el.getAttribute('href')?.replace('#', '');
      if (target === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Hide all view containers and show target
    document.querySelectorAll('.app-view-container').forEach(container => {
      container.classList.remove('active');
    });

    const targetContainer = document.getElementById(`view-${viewName}`);
    if (targetContainer) {
      targetContainer.classList.add('active');
      this.currentView = viewName;
    } else {
      // Fallback to dashboard
      const fallback = document.getElementById('view-dashboard');
      if (fallback) fallback.classList.add('active');
      this.currentView = 'dashboard';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger module lifecycle
    switch (viewName) {
      case 'dashboard':
        await initDashboard();
        break;
      case 'employees':
        await initEmployees();
        break;
      case 'employee-detail':
        const empId = params.get('id');
        if (empId) await viewEmployeeProfile(empId);
        break;
      case 'contracts':
        await initContracts();
        break;
      case 'contract-templates':
        await initTemplates();
        break;
      case 'clauses-editor':
        await initClauses();
        break;
      case 'custodies':
        await initCustodies();
        break;
      case 'vouchers':
        await initVouchers();
        break;
      case 'vehicles':
        await initVehicles();
        break;
      case 'salaries':
        await initSalaries();
        break;
      case 'documents':
        await initDocuments();
        break;
      case 'reports':
        await initReports();
        break;
      case 'audit-log':
        await initAuditLog();
        break;
      case 'settings':
        await initSettings();
        break;
    }

    // Close mobile menu if open
    document.getElementById('app-sidebar')?.classList.remove('mobile-open');
  }

  setupGlobalEvents() {
    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('btn-toggle-mobile-sidebar');
    const sidebar = document.getElementById('app-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Close mobile sidebar when clicking backdrop
    document.addEventListener('click', (e) => {
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Close preview modal button
    const closePreviewBtn = document.getElementById('btn-close-pdf-preview');
    if (closePreviewBtn) {
      closePreviewBtn.addEventListener('click', () => {
        document.getElementById('pdf-preview-modal')?.classList.remove('active');
      });
    }
  }

  setupGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    const resultsContainer = document.getElementById('global-search-results-dropdown');
    if (!searchInput || !resultsContainer) return;

    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
      }

      const employees = await db.getAll('employees');
      const contracts = await db.getAll('contracts');
      const custodies = await db.getAll('custodies');
      const vehicles = await db.getAll('vehicles');

      const matchedEmployees = employees.filter(emp =>
        (emp.fullName || '').toLowerCase().includes(query) ||
        (emp.code || '').toLowerCase().includes(query) ||
        (emp.jobTitle || '').toLowerCase().includes(query)
      ).slice(0, 4);

      const matchedContracts = contracts.filter(c =>
        (c.contractNumber || '').toLowerCase().includes(query) ||
        (c.employeeName || '').toLowerCase().includes(query)
      ).slice(0, 4);

      const matchedCustodies = custodies.filter(c =>
        (c.name || '').toLowerCase().includes(query) ||
        (c.code || '').toLowerCase().includes(query) ||
        (c.serialNumber || '').toLowerCase().includes(query)
      ).slice(0, 4);

      const matchedVehicles = vehicles.filter(v =>
        (v.plateNumber || '').toLowerCase().includes(query) ||
        (v.brand || '').toLowerCase().includes(query)
      ).slice(0, 3);

      const totalMatches = matchedEmployees.length + matchedContracts.length + matchedCustodies.length + matchedVehicles.length;

      if (totalMatches === 0) {
        resultsContainer.innerHTML = `<div class="p-4 text-center text-muted text-xs">لا توجد نتائج بحث مطابقة لـ "${query}"</div>`;
        resultsContainer.style.display = 'block';
        return;
      }

      let html = '';

      if (matchedEmployees.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-users"></i> الموظفون</div>`;
        matchedEmployees.forEach(emp => {
          html += `
            <a href="#employee-detail?id=${emp.id}" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-slate-800">${emp.fullName}</div>
              <div class="text-xs text-muted font-mono">${emp.code} • ${emp.jobTitle}</div>
            </a>
          `;
        });
      }

      if (matchedContracts.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-file-contract"></i> العقود</div>`;
        matchedContracts.forEach(c => {
          html += `
            <a href="#contracts" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-primary font-mono">${c.contractNumber}</div>
              <div class="text-xs text-muted">${c.employeeName} (${c.templateName || c.contractType})</div>
            </a>
          `;
        });
      }

      if (matchedCustodies.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-boxes-stacked"></i> العهد والأجهزة</div>`;
        matchedCustodies.forEach(c => {
          html += `
            <a href="#custodies" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-slate-800">${c.name}</div>
              <div class="text-xs text-muted font-mono">${c.code} • ${c.status === 'delivered' ? 'مسلمة لـ ' + c.employeeName : 'متاحة'}</div>
            </a>
          `;
        });
      }

      if (matchedVehicles.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-car"></i> السيارات</div>`;
        matchedVehicles.forEach(v => {
          html += `
            <a href="#vehicles" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-slate-800">${v.brand} ${v.model}</div>
              <div class="text-xs text-muted">لوحة: <span class="font-mono">${v.plateNumber}</span></div>
            </a>
          `;
        });
      }

      resultsContainer.innerHTML = html;
      resultsContainer.style.display = 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.style.display = 'none';
      }
      if (e.target.closest('[data-action="close-global-search"]')) {
        resultsContainer.style.display = 'none';
        searchInput.value = '';
      }
    });
  }

  setupNotificationsDropdown() {
    const notifBtn = document.getElementById('btn-topbar-notifications');
    const dropdown = document.getElementById('topbar-notifications-dropdown');
    if (!notifBtn || !dropdown) return;

    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      if (isVisible) {
        dropdown.style.display = 'none';
        return;
      }

      const contracts = await db.getAll('contracts');
      const expiring = contracts.filter(c => {
        if (c.status !== 'approved' || !c.endDate) return false;
        const days = Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 60;
      });

      if (expiring.length === 0) {
        dropdown.innerHTML = `<div class="p-4 text-center text-muted text-xs">لا توجد تنبيهات جديدة حالياً.</div>`;
      } else {
        dropdown.innerHTML = `
          <div class="p-3 border-b border-slate-100 font-bold text-sm text-slate-800 flex justify-between items-center">
            <span>تنبيهات العقود القريبة (${expiring.length})</span>
            <a href="#reports" class="text-xs text-cyan hover:underline">عرض الكل</a>
          </div>
          <div class="max-h-60 overflow-y-auto">
            ${expiring.map(c => `
              <div class="p-3 border-b border-slate-50 hover:bg-slate-50 text-xs">
                <div class="font-bold text-slate-800">${c.employeeName}</div>
                <div class="text-muted">العقد <span class="font-mono font-bold">${c.contractNumber}</span> ينتهي في ${c.endDate}</div>
              </div>
            `).join('')}
          </div>
        `;
      }

      dropdown.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!notifBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  setupQuickActions() {
    const quickActionsBtn = document.getElementById('btn-topbar-quick-actions');
    const dropdown = document.getElementById('topbar-quick-actions-dropdown');
    if (!quickActionsBtn || !dropdown) return;

    quickActionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!quickActionsBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }

      const action = e.target.closest('[data-quick-action]');
      if (action) {
        dropdown.style.display = 'none';
        const type = action.dataset.quickAction;
        switch (type) {
          case 'new-employee':
            openEmployeeFormModal();
            break;
          case 'new-contract':
            openContractModal();
            break;
          case 'new-custody':
            openCustodyModal();
            break;
          case 'handover-custody':
            openHandoverModal();
            break;
          case 'new-vehicle':
            openVehicleModal();
            break;
        }
      }
    });
  }

  startLiveClock() {
    const clockEl = document.getElementById('topbar-live-clock');
    if (!clockEl) return;

    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('ar-YE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      clockEl.innerHTML = `<span class="clock-time font-mono font-bold">${timeStr}</span> • <span class="clock-date">${dateStr}</span>`;
    };

    updateClock();
    setInterval(updateClock, 1000);
  }

  setupOfflineMonitor() {
    const badge = document.getElementById('topbar-online-status-badge');
    if (!badge) return;

    const updateStatus = () => {
      const isOnline = navigator.onLine;
      if (isOnline) {
        badge.className = 'badge badge-emerald text-xs';
        badge.innerHTML = `<i class="fa-solid fa-wifi text-xs ml-1"></i> متصل بالشبكة`;
      } else {
        badge.className = 'badge badge-slate text-xs';
        badge.innerHTML = `<i class="fa-solid fa-plane text-xs ml-1"></i> يعمل محلياً (Offline)`;
        showToast('أنت تعمل الآن في وضع عدم الاتصال (Offline). جميع البيانات والوظائف تعمل محلياً.', 'info', 4000);
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.log('[PWA] Service Worker registration skipped or failed:', err);
        });
    }
  }

  setupTabControllers() {
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab-target]');
      if (tabBtn) {
        const targetId = tabBtn.dataset.tabTarget;
        const tabGroup = tabBtn.closest('.tab-header-group') || tabBtn.parentElement;
        const contentContainer = tabGroup.nextElementSibling || document.getElementById(tabBtn.dataset.tabContainer);

        // Deactivate siblings
        tabGroup.querySelectorAll('[data-tab-target]').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        // Show target tab content
        if (contentContainer) {
          contentContainer.querySelectorAll('.tab-content-pane').forEach(pane => pane.classList.remove('active'));
          const targetPane = contentContainer.querySelector(`#${targetId}`);
          if (targetPane) targetPane.classList.add('active');
        }
      }
    });
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.start();
});
