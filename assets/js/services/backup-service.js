/**
 * Abu Hudhayfah Exchange & Transfers - Backup & Restore Service
 */

import { db, TABLE_NAMES } from '../core/db.js';
import { downloadBlob, readFileAsText } from '../utils/helpers.js';
import { logAudit } from '../core/audit.js';

export async function exportDatabaseBackup() {
  const snapshot = await db.exportSnapshot();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `AbuHudhayfah_HR_Backup_${dateStr}.json`;
  const jsonContent = JSON.stringify(snapshot, null, 2);

  downloadBlob(jsonContent, filename, 'application/json');

  await logAudit('تصدير نسخة احتياطية', 'النسخ الاحتياطي', 'ALL', `تم تصدير نسخة احتياطية كاملة للملف (${filename})`);

  // Update last backup date in settings
  const settings = await db.get('settings', 'company_settings');
  if (settings) {
    settings.lastBackupDate = new Date().toISOString();
    await db.put('settings', settings);
  }

  return { success: true, filename, count: Object.keys(snapshot.data).length };
}

export async function importDatabaseBackup(file) {
  if (!file) {
    throw new Error('يرجى اختيار ملف نسخة احتياطية أولاً.');
  }

  if (!file.name.endsWith('.json')) {
    throw new Error('نوع الملف غير صحيح. يجب اختيار ملف بتنسيق JSON.');
  }

  const fileText = await readFileAsText(file);
  let parsed;
  try {
    parsed = JSON.parse(fileText);
  } catch (err) {
    throw new Error('الملف تالف أو ليس بتنسيق JSON صحيح.');
  }

  // Structure integrity validation
  if (!parsed || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('هيكل ملف النسخة الاحتياطية غير متطابق مع متطلبات النظام.');
  }

  // Validate at least essential tables exist
  const essentialTables = ['employees', 'contracts', 'custodies', 'settings'];
  const hasEssentials = essentialTables.some(t => Array.isArray(parsed.data[t]));
  if (!hasEssentials) {
    throw new Error('ملف النسخة الاحتياطية لا يحتوي على بيانات النظام الأساسية.');
  }

  // Perform import
  await db.importSnapshot(parsed);

  await logAudit('استعادة نسخة احتياطية', 'النسخ الاحتياطي', 'ALL', `تم استعادة النسخة الاحتياطية من الملف (${file.name}) بنجاح.`);

  return {
    success: true,
    meta: parsed.meta || {},
    tablesRestored: Object.keys(parsed.data).length
  };
}
