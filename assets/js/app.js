/**
 * Abu Hudhayfah Exchange & Transfers - Master Application Orchestrator & Router
 * Enhanced with Authentication Gate, Supabase Cloud Auth & Sign-Up, Dynamic Branding, and Auto-Sync.
 */

import { db } from './core/db.js';
import { setupModalListeners, openModal, closeModal } from './ui/modal.js';
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
import { initSettings, applyBranding } from './modules/settings.js';
import {
  initSupabaseClient,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  getSupabaseCurrentUser,
  isSupabaseConnected,
  syncSupabaseToLocal
} from './services/supabase-service.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.isAuthenticated = false;
    this.gateMode = 'signin'; // 'signin' or 'signup'
  }

  async start() {
    try {
      console.log('Starting Abu Hudhayfah HR & Contracts Management System...');
      await db.init();
      
      const settings = await db.get('settings', 'company_settings');
      if (settings) {
        applyBranding(settings);
      }

      await initSupabaseClient();
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

      // Enforce authentication gate
      await this.checkAuthenticationGate();

      // Navigate to initial hash or dashboard
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      await this.navigate(hash);
      console.log('System ready.');
    } catch (error) {
      console.error('System initialization error:', error);
      showToast('حدث خطأ أثناء تهيئة قاعدة البيانات المحلية.', 'error');
    }
  }

  async checkAuthenticationGate() {
    const settings = await db.get('settings', 'company_settings');
    const requireAuth = settings?.requireAuthOnStart ?? (window.ENV?.REQUIRE_AUTH_ON_START ?? true);
    const gate = document.getElementById('app-login-gate');

    const currentUser = await getSupabaseCurrentUser();
    const localSession = sessionStorage.getItem('ah_user_session') || localStorage.getItem('ah_user_session');

    if (currentUser || localSession || !requireAuth) {
      this.isAuthenticated = true;
      if (gate) gate.style.display = 'none';
      const userDisplayName = currentUser?.email || (localSession ? JSON.parse(localSession).name || JSON.parse(localSession).email : 'مدير النظام');
      this.updateUserBadge(userDisplayName);
      return true;
    }

    // Show Login Gate
    if (gate) {
      gate.style.display = 'flex';
    }
    this.isAuthenticated = false;
    this.setupLoginGateEvents();
    return false;
  }

  updateUserBadge(nameOrEmail) {
    const badgeName = document.querySelector('.topbar-user-badge .user-name');
    if (badgeName && nameOrEmail) {
      badgeName.textContent = nameOrEmail;
    }
  }

  setupLoginGateEvents() {
    const gate = document.getElementById('app-login-gate');
    const form = document.getElementById('gate-login-form');
    const bypassBtn = document.getElementById('btn-gate-offline-bypass');
    const openSettingsBtn = document.getElementById('btn-gate-open-settings');
    const tabSignIn = document.getElementById('tab-gate-signin');
    const tabSignUp = document.getElementById('tab-gate-signup');
    const nameGroup = document.getElementById('gate-signup-name-group');
    const submitBtnText = document.getElementById('gate-submit-btn-text');
    const msgBox = document.getElementById('gate-auth-message-box');

    const showGateMessage = (msg, isError = true) => {
      if (!msgBox) return;
      msgBox.style.display = 'block';
      msgBox.style.background = isError ? '#FEF2F2' : '#F0FDF4';
      msgBox.style.border = isError ? '1px solid #F87171' : '1px solid #4ADE80';
      msgBox.style.color = isError ? '#991B1B' : '#166534';
      msgBox.innerHTML = `${isError ? '<i class="fa-solid fa-circle-exclamation ml-1"></i>' : '<i class="fa-solid fa-circle-check ml-1"></i>'} ${msg}`;
    };

    const clearGateMessage = () => {
      if (msgBox) {
        msgBox.style.display = 'none';
        msgBox.innerHTML = '';
      }
    };

    // Switch to Sign In Tab
    if (tabSignIn && tabSignUp) {
      tabSignIn.addEventListener('click', () => {
        this.gateMode = 'signin';
        tabSignIn.className = 'btn btn-sm flex-1 bg-white shadow-sm font-bold text-primary';
        tabSignUp.className = 'btn btn-sm flex-1 btn-ghost text-slate-600 font-bold';
        if (nameGroup) nameGroup.style.display = 'none';
        if (submitBtnText) submitBtnText.textContent = 'الدخول إلى النظام';
        clearGateMessage();
      });

      // Switch to Sign Up Tab
      tabSignUp.addEventListener('click', () => {
        this.gateMode = 'signup';
        tabSignUp.className = 'btn btn-sm flex-1 bg-white shadow-sm font-bold text-primary';
        tabSignIn.className = 'btn btn-sm flex-1 btn-ghost text-slate-600 font-bold';
        if (nameGroup) nameGroup.style.display = 'block';
        if (submitBtnText) submitBtnText.textContent = 'إنشاء الحساب السحابي والمتابعة';
        clearGateMessage();
      });
    }

    // Bypass / Admin Local Mode
    if (bypassBtn) {
      bypassBtn.addEventListener('click', () => {
        sessionStorage.setItem('ah_user_session', JSON.stringify({
          name: 'مدير النظام (أبو حذيفة)',
          role: 'admin',
          type: 'local',
          loginTime: new Date().toISOString()
        }));
        this.isAuthenticated = true;
        if (gate) gate.style.display = 'none';
        this.updateUserBadge('مدير النظام (أبو حذيفة)');
        showToast('مرحباً بك! تم تسجيل الدخول كمسؤول النظام.');
      });
    }

    // Shortcut to Open Settings and Configure Cloud
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        if (gate) gate.style.display = 'none';
        window.location.hash = '#settings';
        showToast('يمكنك ضبط مفاتيح Supabase من قسم الربط السحابي في الإعدادات.', 'info');
      });
    }

    // Submit Form (Sign In or Sign Up)
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearGateMessage();

        const username = (document.getElementById('gate-username-input')?.value || '').trim();
        const password = document.getElementById('gate-password-input')?.value || '';
        const fullName = (document.getElementById('gate-fullname-input')?.value || '').trim();
        const btn = document.getElementById('btn-gate-submit-login');

        if (!username || !password) {
          showGateMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
          return;
        }

        try {
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-2"></i> جاري المعالجة...';
          }

          // 1. SIGN UP MODE (إنشاء حساب سحابي جديد في Supabase)
          if (this.gateMode === 'signup') {
            if (!username.includes('@')) {
              showGateMessage('يرجى إدخال بريد إلكتروني صحيح لإنشاء الحساب السحابي.');
              return;
            }

            try {
              const signUpRes = await supabaseSignUp(username, password, { fullName: fullName || 'أبو حذيفة' });
              
              if (signUpRes.session) {
                // Logged in immediately
                this.isAuthenticated = true;
                if (gate) gate.style.display = 'none';
                this.updateUserBadge(username);
                showToast(`تم إنشاء الحساب وتسجيل الدخول بنجاح (${username})`);
              } else {
                // Email confirmation required by Supabase
                showGateMessage(`تم إنشاء الحساب بنجاح لـ <strong>${username}</strong>! إذا كان خيار تأكيد البريد مفعلاً في Supabase، يرجى مراجعة صندوق بريدك لتأكيد الرابط ثم تسجيل الدخول.`, false);
                // Switch back to Sign In tab
                if (tabSignIn) tabSignIn.click();
              }
              return;
            } catch (err) {
              showGateMessage(err.message || 'فشل إنشاء الحساب السحابي.');
              return;
            }
          }

          // 2. SIGN IN MODE (تسجيل الدخول السحابي أو المحلي)
          const isEmail = username.includes('@');

          if (isEmail) {
            try {
              const authRes = await supabaseSignIn(username, password);
              this.isAuthenticated = true;
              if (gate) gate.style.display = 'none';
              this.updateUserBadge(username);
              showToast(`مرحباً بك! تم تسجيل الدخول السحابي بنجاح (${username}) 🟢`);

              // Auto-pull fresh cloud data in background
              syncSupabaseToLocal().then(res => {
                if (res.count > 0) {
                  console.log(`[Supabase] Auto-synced ${res.count} records after login.`);
                }
              }).catch(e => console.warn('Background sync note:', e));

              return;
            } catch (cloudErr) {
              // Show clear Supabase error message
              showGateMessage(cloudErr.message);
              return;
            }
          }

          // Local Admin Fallback (إذا كتب اسم المستخدم admin أو كلمة المرور الافتراضية)
          if ((username.toLowerCase() === 'admin' || username.includes('admin') || username === 'أبو حذيفة') && (password === '1234' || password === 'admin' || password === '123456')) {
            sessionStorage.setItem('ah_user_session', JSON.stringify({
              name: 'مدير النظام (أبو حذيفة)',
              role: 'admin',
              type: 'local',
              loginTime: new Date().toISOString()
            }));
            this.isAuthenticated = true;
            if (gate) gate.style.display = 'none';
            this.updateUserBadge('مدير النظام (أبو حذيفة)');
            showToast('تم تسجيل الدخول بنجاح كمسؤول النظام.');
          } else {
            showGateMessage('اسم المستخدم أو كلمة المرور غير صحيحة. للدخول السحابي يرجى كتابة بريدك الإلكتروني الكامل (مثل abuhdyfh@gmail.com).');
          }
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-right-to-bracket ml-2"></i> <span>${this.gateMode === 'signup' ? 'إنشاء الحساب السحابي والمتابعة' : 'الدخول إلى النظام'}</span>`;
          }
        }
      });
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

    // User Badge / Auth Modal Trigger
    const userBadge = document.querySelector('.topbar-user-badge');
    if (userBadge) {
      userBadge.style.cursor = 'pointer';
      userBadge.addEventListener('click', async () => {
        const user = await getSupabaseCurrentUser();
        const loggedInBox = document.getElementById('auth-logged-in-box');
        const loginForm = document.getElementById('auth-login-form');
        const emailEl = document.getElementById('auth-current-user-email');

        if (user || sessionStorage.getItem('ah_user_session') || localStorage.getItem('ah_user_session')) {
          if (loggedInBox) loggedInBox.style.display = 'block';
          if (loginForm) loginForm.style.display = 'none';
          const sessObj = JSON.parse(sessionStorage.getItem('ah_user_session') || localStorage.getItem('ah_user_session') || '{}');
          if (emailEl) emailEl.textContent = user?.email || sessObj.email || sessObj.name || 'مدير النظام';
        } else {
          if (loggedInBox) loggedInBox.style.display = 'none';
          if (loginForm) loginForm.style.display = 'block';
        }

        openModal('auth-modal');
      });
    }

    // Cloud Login Form Submit inside modal
    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email-input')?.value;
        const password = document.getElementById('auth-password-input')?.value;

        try {
          const btn = document.getElementById('btn-submit-cloud-login');
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-1"></i> جاري التحقق...';
          }
          await supabaseSignIn(email, password);
          this.updateUserBadge(email);
          showToast(`تم تسجيل الدخول بنجاح للمستخدم (${email})`);
          closeModal('auth-modal');
          loginForm.reset();
        } catch (err) {
          showToast(`فشل تسجيل الدخول: ${err.message}`, 'error');
        } finally {
          const btn = document.getElementById('btn-submit-cloud-login');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket ml-1"></i> تسجيل الدخول السحابي الآمن';
          }
        }
      });
    }

    // Cloud & Local Logout
    const logoutBtn = document.getElementById('btn-supabase-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await supabaseSignOut();
        showToast('تم تسجيل الخروج.');
        closeModal('auth-modal');
        const gate = document.getElementById('app-login-gate');
        if (gate) gate.style.display = 'flex';
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
