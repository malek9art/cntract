/**
 * Abu Hudhayfah Exchange & Transfers - Comprehensive Analytical Reports Engine
 */

import { db } from '../core/db.js';
import { formatCurrency, formatDate, getDaysRemaining } from '../utils/formatters.js';
import { previewAndPrintDocument, renderDocumentHeader, renderDocumentFooter, renderSignatureBlock } from '../services/pdf-service.js';
import { showToast } from '../ui/toast.js';

let currentSelectedReport = 'active_contracts';

export async function initReports() {
  await renderReportView(currentSelectedReport);
  setupReportEvents();
}

export async function renderReportView(reportKey) {
  currentSelectedReport = reportKey;
  const container = document.getElementById('report-dynamic-content');
  const titleEl = document.getElementById('report-current-title');
  if (!container) return;

  const employees = await db.getAll('employees');
  const contracts = await db.getAll('contracts');
  const custodies = await db.getAll('custodies');
  const vehicles = await db.getAll('vehicles');
  const transactions = await db.getAll('custody_transactions');
  const branches = await db.getAll('branches');

  switch (reportKey) {
    case 'active_contracts':
      titleEl.innerHTML = `<i class="fa-solid fa-file-circle-check text-emerald"></i> تقرير عقود العمل النشطة والمعتمدة`;
      renderActiveContractsReport(container, contracts, employees);
      break;

    case 'expiring_contracts':
      titleEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber"></i> تقرير العقود القريبة من الانتهاء (30 / 60 / 90 يوماً)`;
      renderExpiringContractsReport(container, contracts, employees);
      break;

    case 'expired_contracts':
      titleEl.innerHTML = `<i class="fa-solid fa-calendar-xmark text-rose"></i> تقرير العقود المنتهية وغير المجددة`;
      renderExpiredContractsReport(container, contracts, employees);
      break;

    case 'custodies_by_employee':
      titleEl.innerHTML = `<i class="fa-solid fa-users text-primary"></i> تقرير العهد والأجهزة المسلمة حسب الموظف`;
      renderCustodiesByEmployeeReport(container, custodies, employees);
      break;

    case 'custodies_by_branch':
      titleEl.innerHTML = `<i class="fa-solid fa-building text-cyan"></i> تقرير العهد والأصول الموزعة حسب الفروع`;
      renderCustodiesByBranchReport(container, custodies, branches);
      break;

    case 'custodies_damaged_lost':
      titleEl.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose"></i> تقرير العهد المتضررة والمفقودة`;
      renderDamagedLostCustodiesReport(container, custodies);
      break;

    case 'delivered_vehicles':
      titleEl.innerHTML = `<i class="fa-solid fa-car text-blue"></i> تقرير أسطول السيارات والمركبات المسلمة`;
      renderDeliveredVehiclesReport(container, vehicles, employees);
      break;

    case 'salaries_by_currency':
      titleEl.innerHTML = `<i class="fa-solid fa-coins text-accent"></i> تقرير إجمالي الرواتب والكتلة المالية حسب العملة (YER & SAR)`;
      renderSalariesByCurrencyReport(container, employees);
      break;

    case 'custody_transactions_log':
      titleEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-indigo"></i> تقرير سجل حركة العهد والعمليات التشغيلية`;
      renderCustodyMovementReport(container, transactions);
      break;

    default:
      renderActiveContractsReport(container, contracts, employees);
  }
}

function renderActiveContractsReport(container, contracts, employees) {
  const active = contracts.filter(c => c.status === 'approved');

  container.innerHTML = `
    <div class="report-summary-kpis grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="kpi-card bg-emerald-50 border border-emerald-200">
        <div class="text-xs text-muted">إجمالي العقود السارية المعتمدة</div>
        <div class="text-2xl font-black text-emerald-800">${active.length} عقد</div>
      </div>
      <div class="kpi-card bg-blue-50 border border-blue-200">
        <div class="text-xs text-muted">عقود بالريال اليمني</div>
        <div class="text-2xl font-black text-blue-800">${active.filter(c => c.currency !== 'SAR').length} عقد</div>
      </div>
      <div class="kpi-card bg-amber-50 border border-amber-200">
        <div class="text-xs text-muted">عقود بالريال السعودي</div>
        <div class="text-2xl font-black text-amber-800">${active.filter(c => c.currency === 'SAR').length} عقد</div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="data-table" id="active-report-table">
        <thead>
          <tr>
            <th>رقم العقد</th>
            <th>اسم الموظف</th>
            <th>المسمى الوظيفي</th>
            <th>الفرع</th>
            <th>تاريخ البداية</th>
            <th>تاريخ النهاية</th>
            <th>الراتب الصافي</th>
          </tr>
        </thead>
        <tbody>
          ${active.map(c => `
            <tr>
              <td class="font-mono font-bold text-primary">${c.contractNumber}</td>
              <td><strong>${c.employeeName}</strong></td>
              <td>${c.jobTitle || '—'}</td>
              <td>${c.branchName || '—'}</td>
              <td>${formatDate(c.startDate)}</td>
              <td>${c.endDate ? formatDate(c.endDate) : 'غير محدد'}</td>
              <td><strong>${formatCurrency(c.netSalary || c.baseSalary, c.currency)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderExpiringContractsReport(container, contracts, employees) {
  const expiring = contracts.filter(c => {
    if (c.status !== 'approved' || !c.endDate) return false;
    const days = getDaysRemaining(c.endDate);
    return days !== null && days >= 0 && days <= 90;
  }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  const exp30 = expiring.filter(c => getDaysRemaining(c.endDate) <= 30).length;
  const exp60 = expiring.filter(c => getDaysRemaining(c.endDate) > 30 && getDaysRemaining(c.endDate) <= 60).length;
  const exp90 = expiring.filter(c => getDaysRemaining(c.endDate) > 60 && getDaysRemaining(c.endDate) <= 90).length;

  container.innerHTML = `
    <div class="report-summary-kpis grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="kpi-card bg-rose-50 border border-rose-200">
        <div class="text-xs text-rose-800 font-bold">تنتهي خلال أقل من 30 يوماً</div>
        <div class="text-2xl font-black text-rose-700">${exp30} عقد (عاجل)</div>
      </div>
      <div class="kpi-card bg-amber-50 border border-amber-200">
        <div class="text-xs text-amber-800 font-bold">تنتهي خلال 31 إلى 60 يوماً</div>
        <div class="text-2xl font-black text-amber-700">${exp60} عقد</div>
      </div>
      <div class="kpi-card bg-blue-50 border border-blue-200">
        <div class="text-xs text-blue-800 font-bold">تنتهي خلال 61 إلى 90 يوماً</div>
        <div class="text-2xl font-black text-blue-700">${exp90} عقد</div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>رقم العقد</th>
            <th>اسم الموظف</th>
            <th>الفرع</th>
            <th>المسمى الوظيفي</th>
            <th>تاريخ النهاية</th>
            <th>المدة المتبقية</th>
            <th>الإجراء الموصى به</th>
          </tr>
        </thead>
        <tbody>
          ${expiring.map(c => {
            const days = getDaysRemaining(c.endDate);
            const badgeCls = days <= 30 ? 'badge-rose' : days <= 60 ? 'badge-amber' : 'badge-blue';
            return `
              <tr>
                <td class="font-mono font-bold">${c.contractNumber}</td>
                <td><strong>${c.employeeName}</strong></td>
                <td>${c.branchName}</td>
                <td>${c.jobTitle}</td>
                <td>${formatDate(c.endDate)}</td>
                <td><span class="badge ${badgeCls}">متبقي ${days} يوم</span></td>
                <td><span class="text-xs font-semibold ${days <= 30 ? 'text-rose' : 'text-amber'}">إعداد ملحق التجديد أو إنهاء العقد</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderExpiredContractsReport(container, contracts, employees) {
  const expired = contracts.filter(c => {
    if (c.status === 'expired') return true;
    if (c.status === 'approved' && c.endDate) {
      const days = getDaysRemaining(c.endDate);
      return days !== null && days < 0;
    }
    return false;
  });

  container.innerHTML = `
    <div class="report-summary-kpis mb-6">
      <div class="kpi-card bg-rose-50 border border-rose-200 max-w-sm">
        <div class="text-xs text-rose-800 font-bold">إجمالي العقود المنتهية التي تتطلب تسوية</div>
        <div class="text-2xl font-black text-rose-700">${expired.length} عقد</div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>رقم العقد</th>
            <th>الموظف</th>
            <th>الفرع</th>
            <th>تاريخ الانتهاء</th>
            <th>الأيام المنقضية</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${expired.map(c => {
            const days = Math.abs(getDaysRemaining(c.endDate) || 0);
            return `
              <tr>
                <td class="font-mono font-bold">${c.contractNumber}</td>
                <td><strong>${c.employeeName}</strong></td>
                <td>${c.branchName}</td>
                <td>${formatDate(c.endDate)}</td>
                <td><span class="badge badge-rose">منتهي منذ ${days} يوم</span></td>
                <td><span class="badge badge-slate">مطلوب تجديد أو مخالصة عهد</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCustodiesByEmployeeReport(container, custodies, employees) {
  const delivered = custodies.filter(c => c.status === 'delivered');

  container.innerHTML = `
    <div class="report-summary-kpis mb-6">
      <div class="kpi-card bg-cyan-50 border border-cyan-200 max-w-sm">
        <div class="text-xs text-cyan-800 font-bold">إجمالي العهد المسلمة حالياً للموظفين</div>
        <div class="text-2xl font-black text-cyan-800">${delivered.length} عهدة</div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>اسم الموظف</th>
            <th>كود العهدة</th>
            <th>اسم الجهاز / العهدة</th>
            <th>النوع</th>
            <th>الرقم التسلسلي</th>
            <th>تاريخ الاستلام</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${delivered.map(c => `
            <tr>
              <td><strong>${c.employeeName}</strong></td>
              <td class="font-mono font-bold text-primary">${c.code}</td>
              <td>${c.name}</td>
              <td><span class="badge badge-subtle-cyan">${c.type}</span></td>
              <td class="font-mono text-xs">${c.serialNumber || '—'}</td>
              <td>${formatDate(c.handoverDate)}</td>
              <td><span class="badge badge-emerald">${c.condition || 'سليم'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCustodiesByBranchReport(container, custodies, branches) {
  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>اسم الفرع</th>
            <th>إجمالي العهد</th>
            <th>العهد المسلمة</th>
            <th>العهد المتوفرة بالمستودع</th>
            <th>تحت الصيانة / متضررة</th>
          </tr>
        </thead>
        <tbody>
          ${branches.map(b => {
            const bCust = custodies.filter(c => c.branchId === b.id);
            const bDelivered = bCust.filter(c => c.status === 'delivered').length;
            const bAvailable = bCust.filter(c => c.status === 'available').length;
            const bIssue = bCust.filter(c => c.status === 'damaged' || c.status === 'maintenance' || c.status === 'lost').length;

            return `
              <tr>
                <td><strong><i class="fa-solid fa-building text-cyan ml-1"></i> ${b.name}</strong></td>
                <td><span class="badge badge-subtle-blue font-bold">${bCust.length}</span></td>
                <td><span class="badge badge-emerald">${bDelivered}</span></td>
                <td><span class="badge badge-slate">${bAvailable}</span></td>
                <td><span class="badge ${bIssue > 0 ? 'badge-rose' : 'badge-slate'}">${bIssue}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderDamagedLostCustodiesReport(container, custodies) {
  const issues = custodies.filter(c => c.status === 'damaged' || c.status === 'lost' || c.status === 'maintenance');

  container.innerHTML = `
    <div class="report-summary-kpis mb-6">
      <div class="kpi-card bg-rose-50 border border-rose-200 max-w-sm">
        <div class="text-xs text-rose-800 font-bold">إجمالي العهد المتضررة والمفقودة والصيانة</div>
        <div class="text-2xl font-black text-rose-700">${issues.length} عهدة</div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>كود العهدة</th>
            <th>اسم العهدة</th>
            <th>النوع</th>
            <th>الفرع</th>
            <th>الحالة المسجلة</th>
            <th>القيمة التقديرية</th>
            <th>ملاحظات الأضرار</th>
          </tr>
        </thead>
        <tbody>
          ${issues.length === 0 ? '<tr><td colspan="7" class="text-center py-6 text-emerald font-bold">لا توجد عهد مفقودة أو متضررة حالياً بحمد الله.</td></tr>' : issues.map(c => `
            <tr>
              <td class="font-mono font-bold">${c.code}</td>
              <td><strong>${c.name}</strong></td>
              <td>${c.type}</td>
              <td>${c.branchName}</td>
              <td><span class="badge ${c.status === 'lost' ? 'badge-red' : c.status === 'damaged' ? 'badge-rose' : 'badge-amber'}">${c.status === 'lost' ? 'مفقودة' : c.status === 'damaged' ? 'متضررة' : 'تحت الصيانة'}</span></td>
              <td>${formatCurrency(c.estimatedValue, c.currency || 'YER')}</td>
              <td class="text-xs text-slate-600">${c.notes || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderDeliveredVehiclesReport(container, vehicles, employees) {
  const delivered = vehicles.filter(v => v.status === 'delivered');

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>رقم اللوحة</th>
            <th>المركبة</th>
            <th>الموظف المستلم</th>
            <th>الفرع</th>
            <th>العداد</th>
            <th>الوقود</th>
            <th>حالة الهيكل</th>
          </tr>
        </thead>
        <tbody>
          ${delivered.map(v => `
            <tr>
              <td><span class="badge-plate">${v.plateNumber}</span></td>
              <td><strong>${v.brand} ${v.model} (${v.year})</strong></td>
              <td><strong>${v.assignedEmployeeName}</strong></td>
              <td>${v.branchName}</td>
              <td class="font-mono">${v.odometer.toLocaleString()} كم</td>
              <td>${v.fuelLevel}</td>
              <td><span class="badge badge-emerald">${v.bodyCondition}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSalariesByCurrencyReport(container, employees) {
  const active = employees.filter(e => e.status === 'active');
  const yerEmps = active.filter(e => e.currency !== 'SAR');
  const sarEmps = active.filter(e => e.currency === 'SAR');

  const totalNetYER = yerEmps.reduce((acc, e) => acc + Number(e.netSalary || e.baseSalary), 0);
  const totalNetSAR = sarEmps.reduce((acc, e) => acc + Number(e.netSalary || e.baseSalary), 0);

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="card p-4 border-2 border-primary/30">
        <h4 class="font-bold text-primary text-lg mb-2"><i class="fa-solid fa-coins"></i> مسير الرواتب بالريال اليمني (YER)</h4>
        <div class="text-3xl font-black text-slate-900 mb-2">${formatCurrency(totalNetYER, 'YER')}</div>
        <div class="text-sm text-muted">عدد الموظفين: <strong>${yerEmps.length} موظف</strong></div>
      </div>

      <div class="card p-4 border-2 border-amber-300">
        <h4 class="font-bold text-amber-700 text-lg mb-2"><i class="fa-solid fa-money-bill-transfer"></i> مسير الرواتب بالريال السعودي (SAR)</h4>
        <div class="text-3xl font-black text-slate-900 mb-2">${formatCurrency(totalNetSAR, 'SAR')}</div>
        <div class="text-sm text-muted">عدد الموظفين: <strong>${sarEmps.length} موظف</strong></div>
      </div>
    </div>
  `;
}

function renderCustodyMovementReport(container, transactions) {
  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>نوع الحركة</th>
            <th>العهدة</th>
            <th>الموظف</th>
            <th>رقم المحضر</th>
            <th>التفاصيل والملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)).map(tx => `
            <tr>
              <td>${formatDate(tx.date || tx.timestamp)}</td>
              <td><span class="badge ${tx.type === 'handover' ? 'badge-blue' : 'badge-emerald'}">${tx.type === 'handover' ? 'تسليم' : 'إرجاع'}</span></td>
              <td><strong>${tx.custodyName}</strong></td>
              <td>${tx.employeeName || '—'}</td>
              <td class="font-mono text-xs">${tx.voucherNumber || '—'}</td>
              <td class="text-xs">${tx.notes || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export async function printCurrentReport() {
  const container = document.getElementById('report-dynamic-content');
  const titleEl = document.getElementById('report-current-title');
  const settings = await db.get('settings', 'company_settings');

  const reportTitle = titleEl ? titleEl.textContent.trim() : 'تقرير إداري';
  const docNum = `REP-${new Date().toISOString().slice(0, 10)}`;

  const headerHtml = renderDocumentHeader(settings, reportTitle, docNum, new Date().toISOString().split('T')[0]);
  const footerHtml = renderDocumentFooter(settings, docNum);

  const html = `
    <div class="printable-a4-document report-document">
      ${headerHtml}
      <div class="report-body-content my-6">
        ${container.innerHTML}
      </div>
      ${renderSignatureBlock('معد التقرير الإداري', 'المدير العام التنفيذي', true)}
      ${footerHtml}
    </div>
  `;

  await previewAndPrintDocument(reportTitle, html, `${reportTitle}.pdf`, { module: 'التقارير', recordId: currentSelectedReport });
}

function setupReportEvents() {
  const reportSelect = document.getElementById('report-type-select');
  const printBtn = document.getElementById('btn-print-active-report');

  if (reportSelect) {
    reportSelect.addEventListener('change', (e) => {
      renderReportView(e.target.value);
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => printCurrentReport());
  }
}
