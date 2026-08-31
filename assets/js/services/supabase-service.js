/**
 * Abu Hudhayfah Exchange & Transfers - Supabase Cloud Database & Auth Integration Service
 * Provides optional, configurable cloud synchronization and secure user authentication.
 */

import { db, TABLE_NAMES } from '../core/db.js';
import { logAudit } from '../core/audit.js';

let supabaseClient = null;

export async function getSupabaseConfig() {
  const settings = await db.get('settings', 'company_settings');
  const stored = settings?.supabaseConfig || {};

  // Check if injected via GitHub Repository Secrets in window.ENV
  const envUrl = window.ENV?.SUPABASE_URL || '';
  const envKey = window.ENV?.SUPABASE_ANON_KEY || '';

  const url = stored.url || envUrl;
  const anonKey = stored.anonKey || envKey;
  const enabled = stored.enabled !== undefined ? stored.enabled : (!!envUrl && !!envKey);

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
  if (config.enabled && config.url && config.anonKey) {
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
    const testClient = window.supabase.createClient(url, anonKey);
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
  const client = getSupabase();
  if (!client) {
    throw new Error('خدمة Supabase غير مفعّلة في إعدادات النظام. يمكنك تفعيلها من شاشة الإعدادات.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) {
    throw error;
  }

  // Save session record
  sessionStorage.setItem('ah_user_session', JSON.stringify({
    email: data.user.email,
    id: data.user.id,
    type: 'supabase',
    loginTime: new Date().toISOString()
  }));

  await logAudit('تسجيل دخول سحابي', 'الأمان والمستخدمين', data.user.id, `تسجيل دخول ناجح للمستخدم عبر Supabase (${email})`, email);
  return data;
}

/**
 * Supabase Secure Auth: Sign Up New Operator Account
 */
export async function supabaseSignUp(email, password, metadata = {}) {
  const client = getSupabase();
  if (!client) {
    throw new Error('خدمة Supabase غير مفعّلة في إعدادات النظام.');
  }

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        company: 'شركة أبو حذيفة للصرافة والتحويلات',
        ...metadata
      }
    }
  });

  if (error) {
    throw error;
  }

  await logAudit('إنشاء حساب سحابي', 'الأمان والمستخدمين', data.user?.id || 'NEW', `إنشاء مستخدم سحابي جديد (${email})`);
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
      const { data } = await client.auth.getUser();
      if (data?.user) return data.user;
    } catch (e) {}
  }
  
  // Check local session
  const sess = sessionStorage.getItem('ah_user_session') || localStorage.getItem('ah_local_auth_session');
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
