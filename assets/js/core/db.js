/**
 * Abu Hudhayfah Exchange & Transfers - Core IndexedDB Database Engine
 * High-performance, offline-first client-side relational storage.
 */

import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_BRANCHES,
  INITIAL_DEFAULT_CLAUSES,
  INITIAL_TEMPLATES,
  INITIAL_EMPLOYEES,
  INITIAL_CUSTODIES,
  INITIAL_VEHICLES,
  INITIAL_CONTRACTS,
  INITIAL_VOUCHERS,
  INITIAL_AUDIT_LOGS
} from '../data/initial-data.js';

const DB_NAME = 'AbuHudhayfah_HR_DB';
const DB_VERSION = 1;

export const TABLE_NAMES = [
  'employees',
  'contracts',
  'contract_templates',
  'contract_clauses',
  'contract_revisions',
  'custodies',
  'custody_transactions',
  'vehicles',
  'documents',
  'salary_records',
  'branches',
  'settings',
  'audit_logs',
  'vouchers'
];

class AppDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores with primary keys and indexes
        if (!db.objectStoreNames.contains('employees')) {
          const store = db.createObjectStore('employees', { keyPath: 'id' });
          store.createIndex('code', 'code', { unique: false });
          store.createIndex('nationalId', 'nationalId', { unique: false });
          store.createIndex('branchId', 'branchId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('contracts')) {
          const store = db.createObjectStore('contracts', { keyPath: 'id' });
          store.createIndex('contractNumber', 'contractNumber', { unique: true });
          store.createIndex('employeeId', 'employeeId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('endDate', 'endDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('contract_templates')) {
          const store = db.createObjectStore('contract_templates', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('contract_clauses')) {
          const store = db.createObjectStore('contract_clauses', { keyPath: 'id' });
          store.createIndex('order', 'order', { unique: false });
        }

        if (!db.objectStoreNames.contains('contract_revisions')) {
          const store = db.createObjectStore('contract_revisions', { keyPath: 'id' });
          store.createIndex('contractId', 'contractId', { unique: false });
          store.createIndex('version', 'version', { unique: false });
        }

        if (!db.objectStoreNames.contains('custodies')) {
          const store = db.createObjectStore('custodies', { keyPath: 'id' });
          store.createIndex('code', 'code', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('employeeId', 'employeeId', { unique: false });
          store.createIndex('branchId', 'branchId', { unique: false });
        }

        if (!db.objectStoreNames.contains('custody_transactions')) {
          const store = db.createObjectStore('custody_transactions', { keyPath: 'id' });
          store.createIndex('custodyId', 'custodyId', { unique: false });
          store.createIndex('employeeId', 'employeeId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('vehicles')) {
          const store = db.createObjectStore('vehicles', { keyPath: 'id' });
          store.createIndex('plateNumber', 'plateNumber', { unique: false });
          store.createIndex('assignedEmployeeId', 'assignedEmployeeId', { unique: false });
          store.createIndex('branchId', 'branchId', { unique: false });
        }

        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('relatedType', 'relatedType', { unique: false });
          store.createIndex('relatedId', 'relatedId', { unique: false });
        }

        if (!db.objectStoreNames.contains('salary_records')) {
          const store = db.createObjectStore('salary_records', { keyPath: 'id' });
          store.createIndex('employeeId', 'employeeId', { unique: false });
          store.createIndex('month', 'month', { unique: false });
        }

        if (!db.objectStoreNames.contains('branches')) {
          db.createObjectStore('branches', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('audit_logs')) {
          const store = db.createObjectStore('audit_logs', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('module', 'module', { unique: false });
        }

        if (!db.objectStoreNames.contains('vouchers')) {
          const store = db.createObjectStore('vouchers', { keyPath: 'id' });
          store.createIndex('voucherNumber', 'voucherNumber', { unique: true });
          store.createIndex('employeeId', 'employeeId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        this.isReady = true;
        await this.ensureInitialSeed();
        resolve(this);
      };

      request.onerror = (event) => {
        console.error('IndexedDB opening error:', event.target.error);
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  async ensureInitialSeed() {
    const settingsCount = await this.count('settings');
    if (settingsCount === 0) {
      console.log('Seeding initial clean system configuration for Abu Hudhayfah Exchange...');
      await this.put('settings', INITIAL_COMPANY_SETTINGS);
      await this.bulkAdd('branches', INITIAL_BRANCHES);
      await this.bulkAdd('contract_clauses', INITIAL_DEFAULT_CLAUSES);
      await this.bulkAdd('contract_templates', INITIAL_TEMPLATES);
      await this.bulkAdd('employees', INITIAL_EMPLOYEES);
      await this.bulkAdd('custodies', INITIAL_CUSTODIES);
      await this.bulkAdd('vehicles', INITIAL_VEHICLES);
      await this.bulkAdd('contracts', INITIAL_CONTRACTS);
      await this.bulkAdd('vouchers', INITIAL_VOUCHERS);
      await this.bulkAdd('audit_logs', INITIAL_AUDIT_LOGS);
      console.log('Initial clean configuration seeded successfully.');
    }
  }

  // Generic collection operations
  async getAll(tableName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readonly');
      const store = tx.objectStore(tableName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async get(tableName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readonly');
      const store = tx.objectStore(tableName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async add(tableName, item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readwrite');
      const store = tx.objectStore(tableName);
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(tableName, item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readwrite');
      const store = tx.objectStore(tableName);
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(tableName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readwrite');
      const store = tx.objectStore(tableName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(tableName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readwrite');
      const store = tx.objectStore(tableName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async count(tableName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readonly');
      const store = tx.objectStore(tableName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async bulkAdd(tableName, items) {
    if (!items || items.length === 0) return true;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(tableName, 'readwrite');
      const store = tx.objectStore(tableName);

      items.forEach((item) => store.put(item));

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async find(tableName, predicate) {
    const all = await this.getAll(tableName);
    return all.filter(predicate);
  }

  async findOne(tableName, predicate) {
    const all = await this.getAll(tableName);
    return all.find(predicate) || null;
  }

  // Export full DB snapshot
  async exportSnapshot() {
    const snapshot = {
      meta: {
        system: 'أبو حذيفة للصرافة والتحويلات - نظام إدارة عقود الموظفين والعهد والمستندات',
        version: '1.0.1',
        exportedAt: new Date().toISOString(),
        dbVersion: DB_VERSION
      },
      data: {}
    };

    for (const table of TABLE_NAMES) {
      snapshot.data[table] = await this.getAll(table);
    }

    return snapshot;
  }

  // Restore DB from snapshot (single atomic transaction)
  async importSnapshot(snapshot) {
    if (!snapshot || !snapshot.data) {
      throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف');
    }

    return new Promise((resolve, reject) => {
      const storesInSnapshot = TABLE_NAMES.filter(table => Array.isArray(snapshot.data[table]));
      const allStores = [...new Set([...storesInSnapshot, 'settings'])];
      allStores.forEach(table => {
        if (!this.db.objectStoreNames.contains(table)) {
          throw new Error(`جدول غير معروف في النسخة الاحتياطية: ${table}`);
        }
      });

      const tx = this.db.transaction(allStores, 'readwrite');
      const txError = [];

      allStores.forEach(table => {
        const store = tx.objectStore(table);

        const clearRequest = store.clear();
        clearRequest.onerror = (event) => txError.push(event.target.error);

        const items = Array.isArray(snapshot.data[table]) ? snapshot.data[table] : [];
        items.forEach(item => {
          const putRequest = store.put(item);
          putRequest.onerror = (event) => {
            if (item && item.id) {
              console.warn(`Failed to import ${table} record ${item.id}:`, event.target.error);
            }
            txError.push(event.target.error);
          };
        });
      });

      tx.oncomplete = () => {
        resolve(true);
      };
      tx.onerror = () => {
        reject(tx.error || new Error('فشل استعادة النسخة الاحتياطية بسبب خطأ في قاعدة البيانات'));
      };
      tx.onabort = () => {
        reject(new Error('تم إلغاء استعادة النسخة الاحتياطية تلقائياً. البيانات الأصلية لم تتأثر.'));
      };
    }).then(async () => {
      // Update last backup date in settings only after the atomic swap succeeded
      const settings = await this.get('settings', 'company_settings') || INITIAL_COMPANY_SETTINGS;
      settings.lastBackupDate = new Date().toISOString();
      await this.put('settings', settings);
      return true;
    });
  }

  // Wipe All Records (Clean State)
  async clearAllData() {
    const keepSettings = await this.get('settings', 'company_settings') || INITIAL_COMPANY_SETTINGS;
    keepSettings.isDemoDataLoaded = false;
    for (const table of TABLE_NAMES) {
      if (table !== 'settings' && table !== 'branches' && table !== 'contract_clauses' && table !== 'contract_templates') {
        await this.clear(table);
      }
    }
    await this.put('settings', keepSettings);
    return true;
  }
}

export const db = new AppDatabase();
