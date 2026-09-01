/**
 * Abu Hudhayfah Exchange & Transfers - Audit Log Service
 * Tracks all administrative, financial, and operational actions for accountability.
 */

import { db } from './db.js';

export async function logAudit(action, module, recordId, description, user = 'مدير النظام') {
  try {
    const logEntry = {
      id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      action,
      module,
      recordId: recordId || 'N/A',
      description,
      user,
      timestamp: new Date().toISOString()
    };

    await db.add('audit_logs', logEntry);
    return logEntry;
  } catch (error) {
    console.warn('Failed to write audit log:', error);
    return null;
  }
}

export async function getRecentAuditLogs(limit = 50) {
  const logs = await db.getAll('audit_logs');
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}
