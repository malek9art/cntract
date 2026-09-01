/**
 * Abu Hudhayfah Exchange & Transfers - Supabase Cloud Database & Auth Integration Service
 * Provides optional, configurable cloud synchronization and secure user authentication.
 */

import { db, TABLE_NAMES } from '../core/db.js';
import { logAudit } from '../core/audit.js';

let supabaseClient = null;

export function translateSupabaseAuthError(err) {
  if (!err) return 'حدث خطأ غير معروف أثناء تسجيل الدخول.';
  const msg = typeof err === 'string' ? err : (err.message || '');

  if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور المسجلة في Supabase.';
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'لم يتم تأكيد البريد الإلكتروني بعد! يرجى مراجعة رابط التأكيد المرسل إلى بريدك، أو قم بإلغاء خيار (Confirm Email) من لوحة تحكم Supabase > Authentication > Providers > Email.';
  }
  if (msg.includes('User not found') || msg.includes('user_not_found')) {
    return 'المستخدم غير مسجل في قاعدة بيانات Supabase. يرجى إنشاء حساب جديد أولاً.';
  }
  if (msg.includes('Password should be at least')) {
    return 'يجب أن تتكون كلمة المرور من 6 خانات على الأقل.';
  }
  if (msg.includes('User already registered') || msg.includes('user_already_exists')) {
    return 'هذا البريد الإلكتروني مسجل بالفعل. يرجى الانتقال إلى تسجيل الدخول.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'تعذر الاتصال بخادم Supabase. يرجى التحقق من اتصال الإنترنت وصحة Project URL.';
  }
  if (msg.includes('JWT') || msg.includes('apiKey') || msg.includes('anon')) {
    return 'مفتاح Supabase Anon Key غير صحيح أو منتهي الصلاحية.';
  }
  return `خطأ المصادقة السحابية: ${msg}`;
}

/**
 * Reads the Supabase configuration.
 * المصدر الوحيد للمفاتيح هو أسرار GitHub المحقونة في window.ENV أثناء النشر.
 * لا يوجد أي إدخال يدوي للمفاتيح داخل التطبيق ولا يتم تخزينها في المتصفح إطلاقاً.
 */
export function getEnvConfig() {
  const env = window.ENV || {};
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = String(env.SUPABASE_ANON_KEY || '').trim();
  return { url, anonKey };
}

export function hasCloudKeys() {
  const { url, anonKey } = getEnvConfig();
  return !!url && !!anonKey;
}

export async function getSupabaseConfig() {
  const settings = await db.get('settings', 'company_settings');
  const stored = settings?.supabaseConfig || {};
  const { url, anonKey } = getEnvConfig();

  return {
    // مفعّل تلقائياً بمجرد توفر المفاتيح من أسرار GitHub
    enabled: !!url && !!anonKey,
    url,
    anonKey,
    source: 'github-secrets',
    buildTime: window.ENV?.BUILD_TIME || null,
    autoSync: stored.autoSync || false,
    lastSyncDate: stored.lastSyncDate || null,
    requireAuth: true
  };
}

/**
 * Persists non-sensitive cloud preferences only (sync metadata).
 * أي مفاتيح تمرر هنا يتم تجاهلها عمداً - المفاتيح تأتي من أسرار GitHub فقط.
 */
export async function saveSupabaseConfig(config = {}) {
  const settings = await db.get('settings', 'company_settings') || { id: 'company_settings' };
  const { url, anonKey, enabled, requireAuth, source, buildTime, ...safe } = config;

  settings.supabaseConfig = {
    ...(settings.supabaseConfig || {}),
    ...safe
  };

  // تنظيف أي مفاتيح قديمة كانت مخزّنة محلياً في الإصدارات السابقة
  delete settings.supabaseConfig.url;
  delete settings.supabaseConfig.anonKey;
  delete settings.supabaseConfig.enabled;

  await db.put('settings', settings);
  return settings.supabaseConfig;
}

/**
 * Waits for the Supabase CDN library to finish loading (it is loaded async by the browser).
 * انتظار تحميل مكتبة Supabase من الـ CDN بدلاً من الفشل الفوري.
 */
export function waitForSupabaseLib(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      resolve(true);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        clearInterval(timer);
        resolve(true);
      } else if (Date.now() - started > timeoutMs || !navigator.onLine) {
        clearInterval(timer);
        resolve(false);
      }
    }, 120);
  });
}

/**
 * Detailed cloud status used by the UI (login gate + settings badge).
 */
export function getCloudStatus() {
  const { url, anonKey } = getEnvConfig();
  if (!url || !anonKey) {
    return {
      state: 'missing-keys',
      ok: false,
      title: 'لم يتم حقن مفاتيح الاتصال السحابي',
      detail: 'يتم حقن المفاتيح تلقائياً من أسرار GitHub عند النشر. يرجى إعادة تشغيل عملية النشر (Actions).'
    };
  }
  if (!navigator.onLine) {
    return {
      state: 'offline',
      ok: false,
      title: 'لا يوجد اتصال بالإنترنت',
      detail: 'تسجيل الدخول يتطلب الاتصال بالإنترنت. تحقق من الشبكة ثم أعد المحاولة.'
    };
  }
  if (!supabaseClient) {
    return {
      state: 'connecting',
      ok: false,
      title: 'جارٍ تجهيز الاتصال السحابي...',
      detail: 'يتم الآن تحميل خدمة Supabase.'
    };
  }
  return {
    state: 'ready',
    ok: true,
    title: 'الاتصال بقاعدة البيانات السحابية جاهز',
    detail: hostOf(url)
  };
}

export function hostOf(url) {
  try {
    return new URL(url).host;
  } catch (e) {
    return url || '';
  }
}

let initPromise = null;

export async function initSupabaseClient(force = false) {
  if (initPromise && !force) return initPromise;

  initPromise = (async () => {
    const { url, anonKey } = getEnvConfig();

    if (!url || !anonKey) {
      console.warn('[Supabase] No keys injected from GitHub Secrets - cloud features disabled.');
      supabaseClient = null;
      return null;
    }

    const libReady = await waitForSupabaseLib();
    if (!libReady) {
      console.warn('[Supabase] SDK not available (offline or CDN blocked).');
      supabaseClient = null;
      return null;
    }

    try {
      supabaseClient = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'ah-cntract-auth'
        }
      });
      console.log('[Supabase] Client initialized ->', hostOf(url));
      return supabaseClient;
    } catch (err) {
      console.error('[Supabase] Failed to create client:', err);
      supabaseClient = null;
      return null;
    }
  })();

  return initPromise;
}

export async function ensureSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  return initSupabaseClient(true);
}

export function getSupabase() {
  return supabaseClient;
}

export function isSupabaseConnected() {
  return !!supabaseClient;
}

/**
 * Verifies the injected cloud keys actually reach the Supabase project.
 * فحص الاتصال باستخدام المفاتيح المحقونة من أسرار GitHub (بدون أي إدخال يدوي).
 */
export async function testSupabaseConnection() {
  const { url, anonKey } = getEnvConfig();
  if (!url || !anonKey) {
    throw new Error('لم يتم حقن مفاتيح Supabase من أسرار GitHub. أعد تشغيل عملية النشر (Actions) بعد إضافة SUPABASE_URL و SUPABASE_ANON_KEY.');
  }
  if (!navigator.onLine) {
    throw new Error('لا يوجد اتصال بالإنترنت حالياً.');
  }

  const client = await ensureSupabaseClient();
  if (!client) {
    throw new Error('تعذر تحميل مكتبة Supabase. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.');
  }

  try {
    // نداء REST خفيف للتحقق من صحة الـ URL والمفتاح العام
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey }
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error('المفتاح العام (Anon Key) مرفوض من المشروع. تأكد من قيمة السر SUPABASE_ANON_KEY.');
    }
    if (res.status >= 500) {
      throw new Error(`خادم Supabase أرجع خطأ (${res.status}).`);
    }
    return {
      success: true,
      message: `تم الاتصال بقاعدة بيانات Supabase بنجاح 🟢 (${hostOf(url)})`
    };
  } catch (err) {
    if (String(err.message || '').includes('Failed to fetch')) {
      throw new Error(`تعذر الوصول إلى ${hostOf(url)}. تحقق من صحة السر SUPABASE_URL ومن اتصال الإنترنت.`);
    }
    throw err;
  }
}

/**
 * Supabase Secure Auth: Sign In with Email & Password
 */
export function cloudUnavailableMessage() {
  const status = getCloudStatus();
  if (status.state === 'missing-keys') {
    return 'الاتصال السحابي غير مُهيّأ في هذه النسخة المنشورة. يرجى إعادة تشغيل عملية النشر من GitHub Actions ليتم حقن المفاتيح تلقائياً.';
  }
  if (status.state === 'offline') {
    return 'لا يوجد اتصال بالإنترنت. تسجيل الدخول يتطلب الاتصال بقاعدة البيانات السحابية.';
  }
  return 'تعذر الاتصال بخدمة Supabase حالياً. يرجى المحاولة مرة أخرى بعد قليل.';
}

function persistSession(user) {
  const record = JSON.stringify({
    email: user.email,
    id: user.id,
    type: 'supabase',
    loginTime: new Date().toISOString()
  });
  sessionStorage.setItem('ah_user_session', record);
  localStorage.setItem('ah_user_session', record);
}

export async function supabaseSignIn(email, password) {
  const client = await ensureSupabaseClient();
  if (!client) {
    throw new Error(cloudUnavailableMessage());
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password: password
  });

  if (error) {
    throw new Error(translateSupabaseAuthError(error));
  }

  persistSession(data.user);

  await logAudit('تسجيل دخول سحابي', 'الأمان والمستخدمين', data.user.id, `تسجيل دخول ناجح للمستخدم عبر Supabase (${cleanEmail})`, cleanEmail);
  return data;
}

/**
 * Supabase Secure Auth: Sign Up New Operator Account
 */
export async function supabaseSignUp(email, password, metadata = {}) {
  const client = await ensureSupabaseClient();
  if (!client) {
    throw new Error(cloudUnavailableMessage());
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password: password,
    options: {
      data: {
        company: 'شركة أبو حذيفة للصرافة والتحويلات',
        ...metadata
      }
    }
  });

  if (error) {
    throw new Error(translateSupabaseAuthError(error));
  }

  if (data.session && data.user) {
    persistSession(data.user);
  }

  await logAudit('إنشاء حساب سحابي', 'الأمان والمستخدمين', data.user?.id || 'NEW', `إنشاء حساب سحابي جديد (${cleanEmail})`);
  return data;
}

/**
 * Supabase Secure Auth: Sign Out
 */
export async function supabaseSignOut() {
  const client = getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Signout warning:', e);
    }
  }
  sessionStorage.removeItem('ah_user_session');
  localStorage.removeItem('ah_user_session');
  localStorage.removeItem('ah_local_auth_session');
  await logAudit('تسجيل خروج', 'الأمان والمستخدمين', 'AUTH', 'تم تسجيل الخروج من الجلسة');
  return true;
}

/**
 * Resolves the current authenticated user.
 * التحقق الحقيقي يتم دائماً من جلسة Supabase؛ الجلسة المحفوظة محلياً
 * تُستخدم فقط كوضع تصفح مؤقت أثناء انقطاع الإنترنت.
 */
export async function getSupabaseCurrentUser() {
  const client = await ensureSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client.auth.getSession();
      if (!error && data?.session?.user) {
        persistSession(data.session.user);
        return data.session.user;
      }
      // لا توجد جلسة سحابية صالحة -> تنظيف أي بقايا جلسة محلية قديمة
      if (navigator.onLine) {
        sessionStorage.removeItem('ah_user_session');
        localStorage.removeItem('ah_user_session');
        localStorage.removeItem('ah_local_auth_session');
        return null;
      }
    } catch (e) {
      console.warn('[Supabase] getSession failed:', e);
    }
  }

  // وضع عدم الاتصال: السماح بمتابعة العمل محلياً إذا كان هناك جلسة سابقة
  if (!navigator.onLine) {
    const sess = sessionStorage.getItem('ah_user_session') || localStorage.getItem('ah_user_session');
    if (sess) {
      try {
        const parsed = JSON.parse(sess);
        return { ...parsed, offline: true };
      } catch (e) {}
    }
  }

  return null;
}

/**
 * Cloud Sync Engine: Push Local IndexedDB Data to Supabase
 */
export async function syncLocalToSupabase() {
  const client = await ensureSupabaseClient();
  if (!client) {
    throw new Error(cloudUnavailableMessage());
  }

  const syncTables = [
    'settings',
    'branches',
    'contract_clauses',
    'contract_templates',
    'employees',
    'contracts',
    'custodies',
    'vehicles',
    'vouchers',
    'salary_records'
  ];
  let totalSynced = 0;

  for (const tableName of syncTables) {
    const localRows = await db.getAll(tableName);
    if (localRows.length > 0) {
      try {
        const { error } = await client.from(tableName).upsert(localRows);
        if (!error) {
          totalSynced += localRows.length;
        } else {
          console.warn(`[Supabase Sync] Table ${tableName} returned warning:`, error.message);
        }
      } catch (e) {
        console.warn(`[Supabase Sync] Skipped table ${tableName}:`, e);
      }
    }
  }

  // Update sync timestamp in settings
  const config = await getSupabaseConfig();
  config.lastSyncDate = new Date().toISOString();
  await saveSupabaseConfig(config);

  await logAudit('مزامنة سحابية', 'النسخ الاحتياطي', 'ALL', `تمت المزامنة ورفع البيانات إلى Supabase بنجاح (${totalSynced} سجل)`);
  return { success: true, count: totalSynced };
}

/**
 * Cloud Sync Engine: Pull Remote Data from Supabase into IndexedDB
 */
export async function syncSupabaseToLocal() {
  const client = await ensureSupabaseClient();
  if (!client) {
    throw new Error(cloudUnavailableMessage());
  }

  // ملاحظة: جدول settings مستثنى من السحب لتفادي الكتابة فوق هوية الشركة المحلية
  const syncTables = [
    'branches',
    'contract_clauses',
    'contract_templates',
    'employees',
    'contracts',
    'custodies',
    'vehicles',
    'vouchers',
    'salary_records'
  ];
  let totalImported = 0;
  const failedTables = [];

  for (const tableName of syncTables) {
    try {
      const { data, error } = await client.from(tableName).select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        await db.bulkAdd(tableName, data);
        totalImported += data.length;
      }
    } catch (e) {
      failedTables.push(tableName);
      console.warn(`[Supabase Pull] Skipped table ${tableName}:`, e);
    }
  }

  const config = await getSupabaseConfig();
  config.lastSyncDate = new Date().toISOString();
  await saveSupabaseConfig(config);

  await logAudit('استيراد سحابي', 'النسخ الاحتياطي', 'ALL', `تم استيراد ${totalImported} سجل من قاعدة بيانات Supabase`);
  return { success: true, count: totalImported, failedTables };
}
