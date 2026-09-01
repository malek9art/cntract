/**
 * Abu Hudhayfah Exchange & Transfers - Master Application Orchestrator & Router
 * Exclusively powered by Supabase Cloud Authentication for abuhdyfh@gmail.com
 */

import { db } from './core/db.js';
import { setupModalListeners, openModal, closeModal } from './ui/modal.js';
import { showToast } from './ui/toast.js';
import { escapeHtml } from './utils/helpers.js';

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
  ensureSupabaseClient,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  getSupabaseCurrentUser,
  isSupabaseConnected,
  syncSupabaseToLocal,
  getSupabase,
  getCloudStatus,
  hasCloudKeys,
  cloudUnavailableMessage,
  isAllowedEmail
} from './services/supabase-service.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.isAuthenticated = false;
    this.gateMode = 'signin'; // 'signin' or 'signup'
    this.gateEventsBound = false;
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

      // Enforce exclusive cloud authentication gate
      await this.checkAuthenticationGate();

      // تنظيف روابط المصادقة (#access_token / type=recovery) قبل التوجيه
      const rawHash = window.location.hash || '';
      if (/access_token=|error_code=|type=recovery/.test(rawHash)) {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#dashboard');
      }

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
    // رابط إعادة تعيين كلمة المرور القادم من البريد
    if (this.pendingRecovery) {
      this.showGate();
      this.setupLoginGateEvents();
      this.enterRecoveryMode();
      await this.refreshGateCloudStatus();
      return false;
    }

    const currentUser = await getSupabaseCurrentUser();

    if (currentUser) {
      this.isAuthenticated = true;
      this.hideGate();
      this.updateUserBadge(currentUser.email || currentUser.name || '');
      if (currentUser.offline) {
        showToast('تم فتح النظام في وضع عدم الاتصال باستخدام آخر جلسة محفوظة.', 'info', 4000);
      }
      this.watchAuthState();
      return true;
    }

    this.isAuthenticated = false;
    this.showGate();
    this.setupLoginGateEvents();
    await this.refreshGateCloudStatus();
    this.watchAuthState();
    return false;
  }

  showGate() {
    const gate = document.getElementById('app-login-gate');
    if (!gate) return;
    gate.style.display = 'flex';
    document.body.classList.add('auth-locked');
    setTimeout(() => document.getElementById('gate-username-input')?.focus(), 150);
  }

  enterRecoveryMode() {
    this.pendingRecovery = false;
    document.getElementById('gate-login-form')?.style.setProperty('display', 'none');
    document.getElementById('gate-recovery-form')?.style.setProperty('display', 'block');
    document.querySelector('.auth-tabs-nav')?.style.setProperty('display', 'none');
    setTimeout(() => document.getElementById('gate-new-password')?.focus(), 150);
  }

  exitRecoveryMode() {
    document.getElementById('gate-recovery-form')?.style.setProperty('display', 'none');
    document.getElementById('gate-login-form')?.style.setProperty('display', 'block');
    document.querySelector('.auth-tabs-nav')?.style.setProperty('display', 'flex');
  }

  hideGate() {
    const gate = document.getElementById('app-login-gate');
    if (gate) gate.style.display = 'none';
    document.body.classList.remove('auth-locked');
  }

  /**
   * Keeps the UI honest when the Supabase session expires or is revoked.
   */
  watchAuthState() {
    if (this.authWatcherBound) return;
    const client = getSupabase();
    if (!client?.auth?.onAuthStateChange) return;
    this.authWatcherBound = true;

    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.showGate();
        this.setupLoginGateEvents();
        this.enterRecoveryMode();
        return;
      }
      if (event === 'SIGNED_OUT' || (!session && event === 'TOKEN_REFRESHED')) {
        this.isAuthenticated = false;
        sessionStorage.removeItem('ah_user_session');
        localStorage.removeItem('ah_user_session');
        this.showGate();
        this.setupLoginGateEvents();
        this.refreshGateCloudStatus();
      } else if (session?.user) {
        if (!isAllowedEmail(session.user.email)) {
          this.isAuthenticated = false;
          sessionStorage.removeItem('ah_user_session');
          localStorage.removeItem('ah_user_session');
          this.showGate();
          this.setupLoginGateEvents();
          supabaseSignOut().then(() => this.refreshGateCloudStatus());
          return;
        }
        this.isAuthenticated = true;
        this.updateUserBadge(session.user.email);
      }
    });
  }

  /**
   * Renders the read-only cloud connection strip on the login screen.
   * لا توجد أي تعليمات لإدخال المفاتيح - المفاتيح تأتي من أسرار GitHub فقط.
   */
  async refreshGateCloudStatus() {
    const box = document.getElementById('gate-cloud-status');
    const titleEl = document.getElementById('gate-cloud-status-title');
    const detailEl = document.getElementById('gate-cloud-status-detail');
    const retryBtn = document.getElementById('btn-gate-retry-cloud');
    const submitBtn = document.getElementById('btn-gate-submit-login');
    if (!box) return;

    const paint = (cls, title, detail, showRetry) => {
      box.className = `auth-cloud-status ${cls}`;
      if (titleEl) titleEl.textContent = title;
      if (detailEl) detailEl.textContent = detail;
      if (retryBtn) retryBtn.style.display = showRetry ? 'inline-flex' : 'none';
    };

    paint('is-connecting', 'جارٍ التحقق من الاتصال السحابي...', 'يرجى الانتظار لحظة', false);
    if (submitBtn) submitBtn.disabled = true;

    await ensureSupabaseClient();
    const status = getCloudStatus();

    if (status.ok) {
      paint('is-ready', 'الاتصال بقاعدة البيانات السحابية جاهز', status.detail, false);
      if (submitBtn) submitBtn.disabled = false;
    } else if (status.state === 'offline') {
      paint('is-offline', 'لا يوجد اتصال بالإنترنت', 'تسجيل الدخول يتطلب اتصالاً بالشبكة', true);
      if (submitBtn) submitBtn.disabled = true;
    } else if (status.state === 'missing-keys') {
      paint('is-error', 'الخدمة السحابية غير مُهيّأة في هذه النسخة', 'يرجى مراجعة مسؤول النظام لإعادة نشر التطبيق', true);
      if (submitBtn) submitBtn.disabled = true;
    } else {
      paint('is-error', 'تعذر تجهيز الاتصال السحابي', 'اضغط زر التحديث لإعادة المحاولة', true);
      if (submitBtn) submitBtn.disabled = true;
    }
  }

  updateUserBadge(nameOrEmail) {
    const badgeName = document.querySelector('.topbar-user-badge .user-name');
    if (badgeName && nameOrEmail) {
      badgeName.textContent = nameOrEmail;
    }
  }

  setupLoginGateEvents() {
    // ربط المستمعات مرة واحدة فقط لتفادي تكرار عمليات تسجيل الدخول
    if (this.gateEventsBound) return;
    this.gateEventsBound = true;

    const gate = document.getElementById('app-login-gate');
    const form = document.getElementById('gate-login-form');
    const quickFillBtn = document.getElementById('btn-quick-fill-email');
    const togglePassBtn = document.getElementById('btn-toggle-password-visibility');
    const forgotPassBtn = document.getElementById('btn-forgot-password');
    const retryCloudBtn = document.getElementById('btn-gate-retry-cloud');
    const tabSignIn = document.getElementById('tab-gate-signin');
    const tabSignUp = document.getElementById('tab-gate-signup');
    const nameGroup = document.getElementById('gate-signup-name-group');
    const submitBtnText = document.getElementById('gate-submit-btn-text');
    const msgBox = document.getElementById('gate-auth-message-box');
    const msgText = document.getElementById('gate-auth-message-text');
    const passInput = document.getElementById('gate-password-input');
    const capsHint = document.getElementById('gate-capslock-hint');

    // إغلاق إنشاء الحساب: الدخول بالبريد المصادق الوحيد فقط
    if (tabSignUp) tabSignUp.style.display = 'none';
    if (nameGroup) nameGroup.style.display = 'none';
    if (tabSignIn) tabSignIn.classList.add('active');

    const safeMessage = (msg) => escapeHtml(String(msg || ''))
      .replace(/&lt;strong&gt;/gi, '<strong>')
      .replace(/&lt;\/strong&gt;/gi, '</strong>');

    const showGateMessage = (msg, isError = true) => {
      if (!msgBox || !msgText) return;
      msgBox.className = isError ? 'auth-feedback-box error' : 'auth-feedback-box success';
      msgBox.style.display = 'flex';
      msgText.innerHTML = safeMessage(msg);
    };

    const clearGateMessage = () => {
      if (msgBox && msgText) {
        msgBox.style.display = 'none';
        msgText.innerHTML = '';
      }
    };

    // إعادة محاولة الاتصال السحابي
    if (retryCloudBtn) {
      retryCloudBtn.addEventListener('click', async () => {
        retryCloudBtn.classList.add('is-spinning');
        clearGateMessage();
        await initSupabaseClient(true);
        await this.refreshGateCloudStatus();
        retryCloudBtn.classList.remove('is-spinning');
      });
    }

    // تحديث الحالة تلقائياً عند عودة الشبكة
    window.addEventListener('online', () => {
      if (!this.isAuthenticated) {
        initSupabaseClient(true).then(() => this.refreshGateCloudStatus());
      }
    });
    window.addEventListener('offline', () => {
      if (!this.isAuthenticated) this.refreshGateCloudStatus();
    });

    // تنبيه Caps Lock
    if (passInput && capsHint) {
      const checkCaps = (e) => {
        const on = e.getModifierState && e.getModifierState('CapsLock');
        capsHint.style.display = on ? 'block' : 'none';
      };
      passInput.addEventListener('keyup', checkCaps);
      passInput.addEventListener('keydown', checkCaps);
      passInput.addEventListener('blur', () => { capsHint.style.display = 'none'; });
    }

    // Quick Fill abuhdyfh@gmail.com
    if (quickFillBtn) {
      quickFillBtn.addEventListener('click', () => {
        const usernameInput = document.getElementById('gate-username-input');
        if (usernameInput) {
          usernameInput.value = 'abuhdyfh@gmail.com';
          document.getElementById('gate-password-input')?.focus();
        }
      });
    }

    // Toggle Password Visibility Eye Icon
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        const eyeIcon = document.getElementById('gate-eye-icon');
        if (passInput && eyeIcon) {
          const isPassword = passInput.type === 'password';
          passInput.type = isPassword ? 'text' : 'password';
          eyeIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
      });
    }

    // Forgot Password Flow
    if (forgotPassBtn) {
      forgotPassBtn.addEventListener('click', async () => {
        const email = (document.getElementById('gate-username-input')?.value || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          showGateMessage('يرجى كتابة بريدك الإلكتروني في خانة البريد أولاً ثم الضغط على "نسيت كلمة المرور".');
          document.getElementById('gate-username-input')?.focus();
          return;
        }

        const client = await ensureSupabaseClient();
        if (!client) {
          showGateMessage(cloudUnavailableMessage());
          return;
        }

        try {
          forgotPassBtn.disabled = true;
          forgotPassBtn.textContent = 'جاري الإرسال...';
          const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
          });
          if (error) throw error;
          showGateMessage(`تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك: <strong>${email}</strong>. يرجى مراجعة صندوق الوارد.`, false);
        } catch (err) {
          showGateMessage(`تعذر إرسال رابط الاستعادة: ${err.message}`);
        } finally {
          forgotPassBtn.disabled = false;
          forgotPassBtn.textContent = 'نسيت كلمة المرور؟';
        }
      });
    }

    // Tabs: تسجيل الدخول فقط (إنشاء الحساب معطّل)
    if (tabSignIn) {
      tabSignIn.addEventListener('click', () => {
        this.gateMode = 'signin';
        tabSignIn.classList.add('active');
        if (submitBtnText) submitBtnText.textContent = 'تسجيل الدخول السحابي الآمن';
        clearGateMessage();
      });
    }

    // Save new password (recovery flow)
    const recoveryForm = document.getElementById('gate-recovery-form');
    if (recoveryForm) {
      recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearGateMessage();
        const pass1 = document.getElementById('gate-new-password')?.value || '';
        const pass2 = document.getElementById('gate-confirm-password')?.value || '';
        const saveBtn = document.getElementById('btn-gate-save-password');

        if (pass1.length < 6) {
          showGateMessage('كلمة المرور الجديدة يجب أن تتكون من 6 خانات أو أكثر.');
          return;
        }
        if (pass1 !== pass2) {
          showGateMessage('كلمتا المرور غير متطابقتين.');
          return;
        }

        const client = await ensureSupabaseClient();
        if (!client) {
          showGateMessage(cloudUnavailableMessage());
          return;
        }

        try {
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-2"></i> جاري الحفظ...';
          }
          const { data, error } = await client.auth.updateUser({ password: pass1 });
          if (error) throw error;
          this.exitRecoveryMode();
          showGateMessage('تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.', false);
          if (data?.user?.email) {
            const uInput = document.getElementById('gate-username-input');
            if (uInput) uInput.value = data.user.email;
          }
        } catch (err) {
          showGateMessage(`تعذر تحديث كلمة المرور: ${err.message}`);
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-key ml-1"></i> <span>حفظ كلمة المرور الجديدة</span>';
          }
        }
      });
    }

    // Form Submit Handler (Exclusive Cloud Auth)
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearGateMessage();

        const username = (document.getElementById('gate-username-input')?.value || '').trim().toLowerCase();
        const password = document.getElementById('gate-password-input')?.value || '';
        const fullName = (document.getElementById('gate-fullname-input')?.value || '').trim();
        const btn = document.getElementById('btn-gate-submit-login');

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(username)) {
          showGateMessage('يرجى إدخال بريد إلكتروني صحيح.');
          document.getElementById('gate-username-input')?.focus();
          return;
        }

        if (!password || password.length < 6) {
          showGateMessage('كلمة المرور يجب أن تتكون من 6 خانات أو أكثر.');
          document.getElementById('gate-password-input')?.focus();
          return;
        }

        if (!hasCloudKeys()) {
          showGateMessage(cloudUnavailableMessage());
          return;
        }

        // البريد المصادق الوحيد المسموح بالدخول
        if (!isAllowedEmail(username)) {
          showGateMessage('هذا البريد الإلكتروني غير مصرّح له بالدخول. الدخول حصرياً عبر حساب الإدارة المعتمد (abuhdyfh@gmail.com).');
          return;
        }

        const restoreBtn = () => {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-shield-halved ml-1"></i> <span id="gate-submit-btn-text">تسجيل الدخول السحابي الآمن</span>`;
          }
        };

        try {
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-2"></i> جاري التحقق السحابي...';
          }

          await supabaseSignIn(username, password);
          this.onAuthSuccess(username);
        } catch (err) {
          showGateMessage(err.message || 'تعذر إتمام العملية. يرجى المحاولة مرة أخرى.');
          document.getElementById('gate-password-input')?.select();
        } finally {
          restoreBtn();
        }
      });
    }
  }

  onAuthSuccess(email) {
    this.isAuthenticated = true;
    this.hideGate();
    this.updateUserBadge(email);
    this.watchAuthState();
    showToast(`مرحباً بك! تم تسجيل الدخول السحابي بنجاح (${email}) 🟢`);

    const form = document.getElementById('gate-login-form');
    if (form) form.reset();

    // مزامنة صامتة في الخلفية بعد الدخول
    syncSupabaseToLocal()
      .then((res) => {
        if (res?.count > 0) {
          showToast(`تمت مزامنة ${res.count} سجل من قاعدة البيانات السحابية.`, 'info', 3500);
          if (this.currentView) this.navigate(this.currentView);
        }
      })
      .catch((e) => console.warn('Background sync note:', e));
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

        if (user) {
          if (loggedInBox) loggedInBox.style.display = 'block';
          if (loginForm) loginForm.style.display = 'none';
          if (emailEl) emailEl.textContent = user.email || user.name || '';
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
          this.isAuthenticated = true;
          this.updateUserBadge(email);
          this.watchAuthState();
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
        this.isAuthenticated = false;
        showToast('تم تسجيل الخروج بنجاح.');
        closeModal('auth-modal');
        this.showGate();
        this.setupLoginGateEvents();
        await this.refreshGateCloudStatus();
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
        resultsContainer.innerHTML = `<div class="p-4 text-center text-muted text-xs">لا توجد نتائج بحث مطابقة لـ &quot;${escapeHtml(query)}&quot;</div>`;
        resultsContainer.style.display = 'block';
        return;
      }

      let html = '';

      if (matchedEmployees.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-users"></i> الموظفون</div>`;
        matchedEmployees.forEach(emp => {
          html += `
            <a href="#employee-detail?id=${encodeURIComponent(emp.id)}" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-slate-800">${escapeHtml(emp.fullName)}</div>
              <div class="text-xs text-muted font-mono">${escapeHtml(emp.code)} • ${escapeHtml(emp.jobTitle)}</div>
            </a>
          `;
        });
      }

      if (matchedContracts.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-file-contract"></i> العقود</div>`;
        matchedContracts.forEach(c => {
          html += `
            <a href="#contracts" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-primary font-mono">${escapeHtml(c.contractNumber)}</div>
              <div class="text-xs text-muted">${escapeHtml(c.employeeName)} (${escapeHtml(c.templateName || c.contractType)})</div>
            </a>
          `;
        });
      }

      if (matchedCustodies.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-boxes-stacked"></i> العهد والأجهزة</div>`;
        matchedCustodies.forEach(c => {
          html += `
            <a href="#custodies" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-slate-800">${escapeHtml(c.name)}</div>
              <div class="text-xs text-muted font-mono">${escapeHtml(c.code)} • ${c.status === 'delivered' ? 'مسلمة لـ ' + escapeHtml(c.employeeName) : 'متاحة'}</div>
            </a>
          `;
        });
      }

      if (matchedVehicles.length > 0) {
        html += `<div class="search-category-header"><i class="fa-solid fa-car"></i> السيارات</div>`;
        matchedVehicles.forEach(v => {
          html += `
            <a href="#vehicles" class="search-result-item" data-action="close-global-search">
              <div class="font-bold text-slate-800">${escapeHtml(v.brand)} ${escapeHtml(v.model)}</div>
              <div class="text-xs text-muted">لوحة: <span class="font-mono">${escapeHtml(v.plateNumber)}</span></div>
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
            <span>تنبيهات العقود القريبة (${escapeHtml(expiring.length)})</span>
            <a href="#reports" class="text-xs text-cyan hover:underline">عرض الكل</a>
          </div>
          <div class="max-h-60 overflow-y-auto">
            ${expiring.map(c => `
              <div class="p-3 border-b border-slate-50 hover:bg-slate-50 text-xs">
                <div class="font-bold text-slate-800">${escapeHtml(c.employeeName)}</div>
                <div class="text-muted">العقد <span class="font-mono font-bold">${escapeHtml(c.contractNumber)}</span> ينتهي في ${escapeHtml(c.endDate)}</div>
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
    if (!('serviceWorker' in navigator) || !window.location.protocol.startsWith('http')) return;

    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered:', reg.scope);

        // اكتشاف نسخة جديدة بعد النشر وتحديثها فوراً (يمنع بقاء مفاتيح/كود قديم)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('تتوفر نسخة محدّثة من النظام، جاري التحديث...', 'info', 3000);
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        });

        // فحص التحديثات عند العودة إلى التطبيق
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch((err) => {
        console.log('[PWA] Service Worker registration skipped:', err);
      });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
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
  // التقاط رابط إعادة تعيين كلمة المرور قبل أي توجيه
  window.app.pendingRecovery = /type=recovery/.test(window.location.hash || '');
  window.app.start();
});
