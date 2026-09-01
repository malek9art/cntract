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

export async function getSupabaseConfig() {
  const settings = await db.get('settings', 'company_settings');
  const stored = settings?.supabaseConfig || {};

  // Check if injected via GitHub Repository Secrets in window.ENV
  const envUrl = (window.ENV?.SUPABASE_URL || '').trim();
  const envKey = (window.ENV?.SUPABASE_ANON_KEY || '').trim();

  const url = (stored.url || envUrl || '').trim();
  const anonKey = (stored.anonKey || envKey || '').trim();
  const enabled = (stored.enabled !== false && !!url && !!anonKey) || (!!envUrl && !!envKey);

  return {
    enabled,
    url,
    anonKey,
    autoSync: stored.autoSync || false,
    lastSyncDate: stored.lastSyncDate || null,
    requireAuth: settings?.requireAuthOnStart ?? (window.ENV?.REQUIRE_AUTH_ON_START ?? true)
  };
}

export async function saveSupabaseConfig(config) {
  const settings = await db.get('settings', 'company_settings') || {};
  settings.supabaseConfig = {
    ...settings.supabaseConfig,
    ...config
  };
  if (config.requireAuth !== undefined) {
    settings.requireAuthOnStart = config.requireAuth;
  }
  await db.put('settings', settings);
  await initSupabaseClient();
  return settings.supabaseConfig;
}

export async function initSupabaseClient() {
  const config = await getSupabaseConfig();
  if (config.url && config.anonKey) {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.log('[Supabase] Client initialized successfully with:', config.url);
        return supabaseClient;
      } catch (err) {
        console.warn('[Supabase] Failed to create client:', err);
        supabaseClient = null;
      }
    } else {
      console.log('[Supabase] Supabase JS library not loaded or offline. Operating in local IndexedDB mode.');
      supabaseClient = null;
    }
  } else {
    supabaseClient = null;
  }
  return null;
}

export function getSupabase() {
  return supabaseClient;
}

export function isSupabaseConnected() {
  return !!supabaseClient;
}

/**
 * Test Supabase Connection with URL & Anon Key
 */
export async function testSupabaseConnection(url, anonKey) {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('مكتبة Supabase غير متوفرة أو أن الجهاز غير متصل بالإنترنت.');
  }

  try {
    const testClient = window.supabase.createClient(url.trim(), anonKey.trim());
    const { data, error } = await testClient.auth.getSession();
    if (error && error.status >= 500) {
      throw error;
    }
    return { success: true, message: 'تم الاتصال بقاعدة بيانات Supabase السحابية بنجاح! 🟢' };
  } catch (err) {
    throw new Error(`فشل الاتصال بـ Supabase: ${err.message || err}`);
  }
}

/**
 * Supabase Secure Auth: Sign In with Email & Password
 */
export async function supabaseSignIn(email, password) {
  let client = getSupabase();
  if (!client) {
    client = await initSupabaseClient();
  }

  if (!client) {
    throw new Error('خدمة Supabase غير مفعّلة أو لم يتم ضبط عنوان المشروع Project URL والمفتاح العام في الإعدادات.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password: password
  });

  if (error) {
    throw new Error(translateSupabaseAuthError(error));
  }

  // Save session record
  sessionStorage.setItem('ah_user_session', JSON.stringify({
    email: data.user.email,
    id: data.user.id,
    type: 'supabase',
    loginTime: new Date().toISOString()
  }));

  localStorage.setItem('ah_user_session', JSON.stringify({
    email: data.user.email,
    id: data.user.id,
    type: 'supabase',
    loginTime: new Date().toISOString()
  }));

  await logAudit('تسجيل دخول سحابي', 'الأمان والمستخدمين', data.user.id, `تسجيل دخول ناجح للمستخدم عبر Supabase (${cleanEmail})`, cleanEmail);
  return data;
}

/**
 * Supabase Secure Auth: Sign Up New Operator Account
 */
export async function supabaseSignUp(email, password, metadata = {}) {
  let client = getSupabase();
  if (!client) {
    client = await initSupabaseClient();
  }

  if (!client) {
    throw new Error('خدمة Supabase غير مهيأة. يرجى إدخال Project URL و Anon Key في الإعدادات أولاً.');
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

  if (data.session) {
    sessionStorage.setItem('ah_user_session', JSON.stringify({
      email: data.user.email,
      id: data.user.id,
      type: 'supabase',
      loginTime: new Date().toISOString()
    }));
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
 * Get Current Logged In User
 */
export async function getSupabaseCurrentUser() {
  const client = getSupabase();
  if (client) {
    try {
      const { data } = await client.auth.getSession();
      if (data?.session?.user) {
        return data.session.user;
      }
    } catch (e) {}
  }

  // Check local session
  const sess = sessionStorage.getItem('ah_user_session') || localStorage.getItem('ah_user_session') || localStorage.getItem('ah_local_auth_session');
  if (sess) {
    try {
      return JSON.parse(sess);
    } catch (e) {}
  }
  return null;
}

/**
 * Cloud Sync Engine: Push Local IndexedDB Data to Supabase
 */
export async function syncLocalToSupabase() {
  const client = getSupabase();
  if (!client) {
    throw new Error('يجب ربط وتفعيل Supabase أولاً لتشغيل المزامنة السحابية.');
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
  const client = getSupabase();
  if (!client) {
    throw new Error('خدمة Supabase غير متصلة.');
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
  let totalImported = 0;

  for (const tableName of syncTables) {
    try {
      const { data, error } = await client.from(tableName).select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        await db.bulkAdd(tableName, data);
        totalImported += data.length;
      }
    } catch (e) {
      console.warn(`[Supabase Pull] Skipped table ${tableName}:`, e);
    }
  }

  const config = await getSupabaseConfig();
  config.lastSyncDate = new Date().toISOString();
  await saveSupabaseConfig(config);

  await logAudit('استيراد سحابي', 'النسخ الاحتياطي', 'ALL', `تم استيراد ${totalImported} سجل من قاعدة بيانات Supabase`);
  return { success: true, count: totalImported };
}
