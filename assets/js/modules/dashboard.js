/**
 * Abu Hudhayfah Exchange & Transfers - Dashboard Module
 */

import { db } from '../core/db.js';
import { formatCurrency, formatDate, getDaysRemaining, getRelativeTimeArabic } from '../utils/formatters.js';
import { previewAndPrintDocument, buildContractDocumentHtml } from '../services/pdf-service.js';
import { showToast } from '../ui/toast.js';

export async function initDashboard() {
  await renderDashboardMetrics();
  await renderExpiringContractsAlerts(30);
  await renderRecentContracts();
  await renderRecentActivities();
  setupDashboardEvents();
}

export async function renderDashboardMetrics() {
  const employees = await db.getAll('employees');
  const contracts = await db.getAll('contracts');
  const custodies = await db.getAll('custodies');
  const vehicles = await db.getAll('vehicles');

  // Employee stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;

  // Contract stats
  const now = new Date();
  let activeContracts = 0;
  let expiringSoon30 = 0;
  let expiredContracts = 0;

  contracts.forEach(c => {
    if (c.status === 'approved') {
      activeContracts++;
      if (c.endDate) {
        const days = getDaysRemaining(c.endDate);
        if (days !== null && days >= 0 && days <= 30) {
          expiringSoon30++;
        } else if (days !== null && days < 0) {
          expiredContracts++;
        }
      }
    } else if (c.status === 'expired') {
      expiredContracts++;
    }
  });

  // Custody stats
  const totalCustodies = custodies.length;
  const deliveredCustodies = custodies.filter(c => c.status === 'delivered').length;
  const returnedCustodies = custodies.filter(c => c.status === 'returned').length;
  const damagedCustodies = custodies.filter(c => c.status === 'damaged').length;
  const lostCustodies = custodies.filter(c => c.status === 'lost').length;

  // Vehicles stats
  const deliveredVehicles = vehicles.filter(v => v.status === 'delivered').length;

  // Salary calculations (Strict separation between YER and SAR)
  let totalSalaryYER = 0;
  let totalSalarySAR = 0;

  employees.filter(e => e.status === 'active').forEach(emp => {
    const net = Number(emp.netSalary || (Number(emp.baseSalary || 0) + Number(emp.allowances || 0) - Number(emp.deductions || 0)));
    if (emp.currency === 'SAR') {
      totalSalarySAR += net;
    } else {
      totalSalaryYER += net;
    }
  });

  // Update DOM elements
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('metric-total-employees', totalEmployees);
  setTxt('metric-active-employees', activeEmployees);
  setTxt('metric-active-contracts', activeContracts);
  setTxt('metric-expiring-contracts', expiringSoon30);
  setTxt('metric-expired-contracts', expiredContracts);

  setTxt('metric-total-custodies', totalCustodies);
  setTxt('metric-delivered-custodies', deliveredCustodies);
  setTxt('metric-returned-custodies', returnedCustodies);
  setTxt('metric-damaged-custodies', damagedCustodies);
  setTxt('metric-lost-custodies', lostCustodies);

  setTxt('metric-delivered-vehicles', deliveredVehicles);

  setTxt('metric-total-salaries-yer', formatCurrency(totalSalaryYER, 'YER'));
  setTxt('metric-total-salaries-sar', formatCurrency(totalSalarySAR, 'SAR'));

  // Notification badge on topbar
  const notifBadge = document.getElementById('topbar-alert-count');
  if (notifBadge) {
    if (expiringSoon30 > 0) {
      notifBadge.textContent = expiringSoon30;
      notifBadge.style.display = 'inline-flex';
    } else {
      notifBadge.style.display = 'none';
    }
  }
}

export async function renderExpiringContractsAlerts(daysThreshold = 30) {
  const container = document.getElementById('dashboard-expiring-contracts-list');
  if (!container) return;

  const contracts = await db.getAll('contracts');
  const employees = await db.getAll('employees');
  const empMap = new Map(employees.map(e => [e.id, e]));

  const expiring = contracts.filter(c => {
    if (c.status !== 'approved' || !c.endDate) return false;
    const days = getDaysRemaining(c.endDate);
    return days !== null && days >= 0 && days <= daysThreshold;
  }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  if (expiring.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card text-center py-6">
        <i class="fa-solid fa-circle-check text-emerald text-3xl mb-2"></i>
        <p class="text-muted">لا توجد عقود تنتهي خلال ${daysThreshold} يوماً.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = expiring.map(contract => {
    const emp = empMap.get(contract.employeeId);
    const daysLeft = getDaysRemaining(contract.endDate);
    const badgeClass = daysLeft <= 10 ? 'badge-rose' : daysLeft <= 30 ? 'badge-amber' : 'badge-blue';

    return `
      <div class="alert-contract-row">
        <div class="contract-alert-info">
          <div class="font-bold text-slate-800">${contract.employeeName}</div>
          <div class="text-xs text-muted">رقم العقد: <span class="font-mono">${contract.contractNumber}</span> • ${contract.jobTitle || emp?.jobTitle || 'موظف'}</div>
        </div>
        <div class="contract-alert-branch text-xs text-slate-600">
          <i class="fa-solid fa-building text-xs"></i> ${contract.branchName || 'المركز الرئيسي'}
        </div>
        <div class="contract-alert-date">
          <div class="text-xs text-muted">تاريخ النهاية: ${formatDate(contract.endDate)}</div>
          <span class="badge ${badgeClass} text-xs mt-1">متبقي ${daysLeft} يوم</span>
        </div>
        <div class="contract-alert-actions">
          <button class="btn btn-sm btn-outline" data-action="view-contract-pdf" data-id="${contract.id}" title="معاينة وطباعة العقد">
            <i class="fa-solid fa-print"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export async function renderRecentContracts() {
  const tableBody = document.getElementById('dashboard-recent-contracts-body');
  if (!tableBody) return;

  const contracts = await db.getAll('contracts');
  const sorted = contracts.sort((a, b) => new Date(b.createdAt || b.issueDate) - new Date(a.createdAt || a.issueDate)).slice(0, 5);

  if (sorted.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">لا توجد عقود مسجلة بعد.</td></tr>`;
    return;
  }

  tableBody.innerHTML = sorted.map(c => {
    const statusMap = {
      approved: { label: 'معتمد', class: 'badge-emerald' },
      draft: { label: 'مسودة', class: 'badge-slate' },
      review: { label: 'قيد المراجعة', class: 'badge-amber' },
      expired: { label: 'منتهي', class: 'badge-rose' },
      cancelled: { label: 'ملغى', class: 'badge-red' }
    };
    const st = statusMap[c.status] || { label: c.status, class: 'badge-slate' };

    return `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${c.contractNumber}</td>
        <td><strong>${c.employeeName}</strong></td>
        <td>${c.jobTitle || '—'}</td>
        <td>${formatDate(c.startDate)}</td>
        <td><span class="badge ${st.class}">${st.label}</span></td>
        <td class="text-end table-actions">
          <button class="btn btn-sm btn-icon btn-ghost" data-action="view-contract-pdf" data-id="${c.id}" title="طباعة العقد">
            <i class="fa-solid fa-print"></i>
          </button>
          <button class="btn btn-sm btn-icon btn-ghost" data-action="edit-contract" data-id="${c.id}" title="تعديل العقد">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export async function renderRecentActivities() {
  const container = document.getElementById('dashboard-recent-activities-list');
  if (!container) return;

  const logs = await db.getAll('audit_logs');
  const sorted = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

  if (sorted.length === 0) {
    container.innerHTML = `<div class="text-center py-4 text-muted">لا توجد عمليات مسجلة حديثاً.</div>`;
    return;
  }

  container.innerHTML = sorted.map(log => `
    <div class="activity-timeline-item">
      <div class="activity-icon-bullet">
        <i class="fa-solid fa-circle-dot"></i>
      </div>
      <div class="activity-content">
        <div class="activity-title">
          <span class="activity-action-tag">${log.action}</span>
          <span class="activity-module">${log.module}</span>
        </div>
        <p class="activity-desc">${log.description}</p>
        <div class="activity-time">${getRelativeTimeArabic(log.timestamp)} • بواسطة: ${log.user}</div>
      </div>
    </div>
  `).join('');
}

function setupDashboardEvents() {
  // Days tabs for expiring contracts
  const tabBtns = document.querySelectorAll('.expiring-days-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const days = parseInt(btn.dataset.days, 10) || 30;
      renderExpiringContractsAlerts(days);
    });
  });

  // Action delegation for recent contracts table
  document.addEventListener('click', async (e) => {
    const printBtn = e.target.closest('[data-action="view-contract-pdf"]');
    if (printBtn) {
      const contractId = printBtn.dataset.id;
      const contract = await db.get('contracts', contractId);
      if (contract) {
        const employee = await db.get('employees', contract.employeeId);
        const settings = await db.get('settings', 'company_settings');
        const html = buildContractDocumentHtml(contract, employee, settings);
        await previewAndPrintDocument(`عقد عمل - ${contract.employeeName}`, html, `عقد_${contract.contractNumber}.pdf`, { module: 'العقود', recordId: contract.id });
      }
    }
  });
}
