/**
 * Abu Hudhayfah Exchange & Transfers - Enhanced Document & PDF Rendering Engine
 * Isolated Print Driver with exact CSS embedding, A4 RTL precision, customizable First Party Name, and 100% offline support.
 */

import { formatDate, formatCurrency, tafqeetArabic } from '../utils/formatters.js';
import { escapeHtml } from '../utils/helpers.js';
import { substituteContractVariables } from './template-service.js';
import { logAudit } from '../core/audit.js';
import { showToast } from '../ui/toast.js';

export function renderDocumentHeader(settings, title, docNumber = '', docDate = '') {
  const companyName = settings?.firstPartyName || settings?.companyName || 'شركة أبو حذيفة للصرافة والتحويلات';
  const companyNameEn = settings?.companyNameEn || 'Abu Hudhayfah Exchange & Transfers Co.';
  const cr = settings?.commercialRegister || '108492048';
  const license = settings?.centralBankLicense || 'ترخيص البنك المركزي رقم 442/ص';
  const logo = settings?.logoUrl || 'assets/images/logo.svg';

  return `
    <div class="print-doc-header">
      <div class="doc-header-right">
        <h2 class="doc-company-ar">${escapeHtml(companyName)}</h2>
        <div class="doc-company-sub">ش.م.ي مقفلة • ترخيص مصرفي</div>
        <div class="doc-company-meta">
          <span>س.ت: <strong>${escapeHtml(cr)}</strong></span>
          <span>•</span>
          <span>${escapeHtml(license)}</span>
        </div>
      </div>

      <div class="doc-header-center">
        <img src="${escapeHtml(logo)}" alt="شعار شركة أبو حذيفة" class="doc-header-logo" onerror="this.src='assets/images/logo.svg'" />
      </div>

      <div class="doc-header-left">
        <h3 class="doc-company-en">${escapeHtml(companyNameEn)}</h3>
        <div class="doc-badge-meta">
          ${docNumber ? `<div><strong>رقم المستند:</strong> <span class="ltr-text font-mono">${escapeHtml(docNumber)}</span></div>` : ''}
          ${docDate ? `<div><strong>التاريخ:</strong> <span>${formatDate(docDate)}</span></div>` : ''}
        </div>
      </div>
    </div>
    <div class="doc-header-divider"></div>
    <div class="doc-title-bar">
      <h1>${escapeHtml(title)}</h1>
    </div>
  `;
}

export function renderDocumentFooter(settings, docNumber = '') {
  const hq = settings?.headquarters || 'صنعاء - شارع الزبيري';
  const phone = settings?.phone || '+967 1 234567';
  const email = settings?.email || 'hr@abuhudhayfah-exchange.com';
  const companyName = settings?.firstPartyName || settings?.companyName || 'شركة أبو حذيفة للصرافة والتحويلات';

  return `
    <div class="print-doc-footer">
      <div class="doc-footer-divider"></div>
      <div class="doc-footer-content">
        <div class="footer-col-right">
          <span>المقر الرئيسي: ${escapeHtml(hq)}</span>
          <span>•</span>
          <span>هاتف: ${escapeHtml(phone)}</span>
        </div>
        <div class="footer-col-center">
          <span class="doc-watermark-tag">مستند رسمي معتمد • ${escapeHtml(companyName)}</span>
        </div>
        <div class="footer-col-left">
          <span>${escapeHtml(email)}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderSignatureBlock(employeeName, companyRep = null, includeStamp = true, settings = null) {
  const stampUrl = settings?.stampUrl || 'assets/images/stamp.svg';
  const companyName = settings?.firstPartyName || settings?.companyName || 'شركة أبو حذيفة للصرافة والتحويلات';
  const repName = settings?.firstPartyRepName || companyRep || 'أبو حذيفة (المدير العام)';
  const repRole = settings?.firstPartyRepRole || 'المدير العام التنفيذي';

  return `
    <div class="doc-signatures-section">
      <div class="sig-col sig-first-party">
        <div class="sig-title">الطرف الأول (صاحب العمل)</div>
        <div class="sig-role">عن: <strong>${escapeHtml(companyName)}</strong></div>
        <div class="sig-rep-name">الاسم: <strong>${escapeHtml(repName)}</strong> (${escapeHtml(repRole)})</div>
        <div class="sig-line">التوقيع: .......................................</div>
        <div class="sig-date">التاريخ: ..... / ..... / 2026 م</div>
        ${includeStamp ? `<div class="sig-stamp-container"><img src="${escapeHtml(stampUrl)}" alt="ختم الشركة" class="official-stamp-img" onerror="this.src='assets/images/stamp.svg'" /></div>` : ''}
      </div>

      <div class="sig-col sig-second-party">
        <div class="sig-title">الطرف الثاني (الموظف)</div>
        <div class="sig-role">المقر بما فيه ومستلم نسخة العقد الأصلية</div>
        <div class="sig-rep-name">الاسم: <strong>${escapeHtml(employeeName) || '...........................................'}</strong></div>
        <div class="sig-line">التوقيع: .......................................</div>
        <div class="sig-line">البصمة: .......................................</div>
        <div class="sig-date">التاريخ: ..... / ..... / 2026 م</div>
      </div>
    </div>
  `;
}

/**
 * Generate Complete Employment Contract HTML Document
 */
export function buildContractDocumentHtml(contract, employee, settings) {
  const headerHtml = renderDocumentHeader(settings, contract.templateName || 'عقد عمل وظيفي', contract.contractNumber, contract.issueDate);
  const footerHtml = renderDocumentFooter(settings, contract.contractNumber);

  const baseSalaryFormatted = formatCurrency(contract.baseSalary, contract.currency);
  const allowancesFormatted = formatCurrency(contract.allowances || 0, contract.currency);
  const netSalaryFormatted = formatCurrency(contract.netSalary || (Number(contract.baseSalary) + Number(contract.allowances || 0) - Number(contract.deductions || 0)), contract.currency);
  const salaryTafqeet = tafqeetArabic(contract.netSalary || contract.baseSalary, contract.currency);

  const firstPartyName = settings?.firstPartyName || settings?.companyName || 'شركة أبو حذيفة للصرافة والتحويلات';
  const firstPartyRep = settings?.firstPartyRepName || 'المدير العام التنفيذي';
  const firstPartyRole = settings?.firstPartyRepRole || 'المفوض بالتوقيع والاعتماد';

  const clausesList = contract.clauses || [];
  const renderedClauses = clausesList
    .filter(c => c.isActive !== false)
    .map((clause, idx) => {
      const substituted = substituteContractVariables(clause.content, contract, employee, settings);
      return `
        <div class="contract-clause-item">
          <h4 class="clause-title">${clause.numberText ? escapeHtml(clause.numberText) + ': ' : ''}${escapeHtml(clause.title)}</h4>
          <p class="clause-text">${escapeHtml(substituted)}</p>
        </div>
      `;
    })
    .join('');

  return `
    <div class="printable-a4-document contract-document">
      ${headerHtml}

      <div class="doc-intro-box">
        <p class="intro-p mb-2" style="font-size: 9pt; line-height: 1.6;">
          بعون الله وتوفيقه، تم إبرام هذا العقد في يوم <strong>${formatDate(contract.issueDate)}</strong> بين كلٍ من:
        </p>

        <div class="parties-grid">
          <div class="party-box party-first">
            <div class="party-badge">الطرف الأول (صاحب العمل)</div>
            <div class="party-row"><strong>الاسم:</strong> <span class="text-primary font-bold">${escapeHtml(firstPartyName)}</span></div>
            <div class="party-row"><strong>السجل التجاري:</strong> ${escapeHtml(settings?.commercialRegister) || '108492048'}</div>
            <div class="party-row"><strong>الترخيص المصرفي:</strong> ${escapeHtml(settings?.centralBankLicense) || 'ترخيص البنك المركزي 442/ص'}</div>
            <div class="party-row"><strong>العنوان:</strong> ${escapeHtml(settings?.headquarters) || 'اليمن - صنعاء - شارع الزبيري'}</div>
            <div class="party-row"><strong>الممثل المفوض:</strong> <strong>${escapeHtml(firstPartyRep)}</strong> (${escapeHtml(firstPartyRole)})</div>
          </div>

          <div class="party-box party-second">
            <div class="party-badge">الطرف الثاني (الموظف)</div>
            <div class="party-row"><strong>الاسم الرباعي:</strong> ${escapeHtml(employee?.fullName || contract.employeeName)}</div>
            <div class="party-row"><strong>رقم الهوية:</strong> <span class="font-mono font-bold">${escapeHtml(employee?.nationalId) || '—'}</span></div>
            <div class="party-row"><strong>الجنسية:</strong> ${escapeHtml(employee?.nationality) || 'يمني'}</div>
            <div class="party-row"><strong>رقم الهاتف:</strong> <span class="font-mono">${escapeHtml(employee?.phone) || '—'}</span></div>
            <div class="party-row"><strong>العنوان:</strong> ${escapeHtml(employee?.address) || '—'}</div>
          </div>
        </div>
      </div>

      <div class="doc-section-card financial-overview-card">
        <h3 class="section-card-title"><i class="fa-solid fa-coins"></i> ملخص البيانات الوظيفية والمالية المعتمدة</h3>
        <table class="doc-data-table">
          <thead>
            <tr>
              <th>المسمى الوظيفي</th>
              <th>الفرع / مكان العمل</th>
              <th>تاريخ البداية</th>
              <th>تاريخ النهاية</th>
              <th>الراتب الأساسي</th>
              <th>البدلات</th>
              <th>صافي الراتب المستحق</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${escapeHtml(contract.jobTitle || employee?.jobTitle) || '—'}</strong></td>
              <td>${escapeHtml(contract.branchName || employee?.branchName) || '—'}</td>
              <td>${formatDate(contract.startDate)}</td>
              <td>${contract.endDate ? formatDate(contract.endDate) : 'غير محدد'}</td>
              <td>${baseSalaryFormatted}</td>
              <td>${allowancesFormatted}</td>
              <td class="highlight-net"><strong style="color: #0A1E3F;">${netSalaryFormatted}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="tafqeet-note">
          <strong>الراتب الصافي كتابةً:</strong> <span>${escapeHtml(salaryTafqeet)}</span>
        </div>
      </div>

      <div class="doc-clauses-wrapper">
        <h3 class="clauses-header-title"><i class="fa-solid fa-scale-balanced"></i> بنود وأحكام العقد</h3>
        ${renderedClauses}
      </div>

      ${renderSignatureBlock(employee?.fullName || contract.employeeName, firstPartyRep, true, settings)}

      ${footerHtml}
    </div>
  `;
}

/**
 * Generate Custody Handover Voucher (محضر استلام عهدة)
 */
export function buildCustodyHandoverVoucherHtml(voucher, employee, settings) {
  const headerHtml = renderDocumentHeader(settings, 'محضر استلام عهدة وظيفية', voucher.voucherNumber, voucher.date);
  const footerHtml = renderDocumentFooter(settings, voucher.voucherNumber);

  const itemsRows = (voucher.items || []).map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(item.brand) || '—'} ${escapeHtml(item.model) || ''}</td>
      <td class="ltr-text font-mono">${escapeHtml(item.serialNumber || item.code) || '—'}</td>
      <td><span class="badge badge-emerald">${escapeHtml(item.condition) || 'ممتاز وسليم'}</span></td>
      <td>${escapeHtml(item.notes) || 'لا توجد'}</td>
    </tr>
  `).join('');

  return `
    <div class="printable-a4-document voucher-document">
      ${headerHtml}

      <div class="voucher-info-box">
        <table class="voucher-meta-table">
          <tr>
            <td><strong>اسم الموظف المستلم:</strong> ${escapeHtml(employee?.fullName || voucher.employeeName)}</td>
            <td><strong>الرقم الوظيفي:</strong> <span class="font-mono font-bold">${escapeHtml(employee?.code || voucher.employeeId) || '—'}</span></td>
          </tr>
          <tr>
            <td><strong>المسمى الوظيفي:</strong> ${escapeHtml(voucher.jobTitle || employee?.jobTitle) || '—'}</td>
            <td><strong>الفرع / الإدارة:</strong> ${escapeHtml(voucher.branchName || employee?.branchName) || '—'}</td>
          </tr>
          <tr>
            <td><strong>رقم الهوية:</strong> <span class="font-mono">${escapeHtml(employee?.nationalId) || '—'}</span></td>
            <td><strong>تاريخ التسليم:</strong> ${formatDate(voucher.date)}</td>
          </tr>
        </table>
      </div>

      <div class="voucher-items-section">
        <h3 class="section-card-title"><i class="fa-solid fa-boxes-stacked"></i> بيان العهد والأجهزة المسلمة</h3>
        <table class="doc-data-table">
          <thead>
            <tr>
              <th width="40">#</th>
              <th>بيان العهدة / الجهاز</th>
              <th>الماركة والموديل</th>
              <th>الرقم التسلسلي (S/N)</th>
              <th>الحالة الفنية عند التسليم</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <div class="voucher-declaration-box">
        <h4 class="declaration-title"><i class="fa-solid fa-shield-halved"></i> إقرار وتعهد الموظف المستلم</h4>
        <p class="declaration-text">
          ${escapeHtml(voucher.declaration) || 'أقر أنا الموظف الموقع أدناه بأنني قد استلمت العهد والأجهزة والمعدات الموضحة في هذا المحضر بحالة فنية ممتازة وسليمة وكاملة الملحقات، وأتعهد بالمحافظة التامة عليها واستخدامها حصرياً في أغراض مهام العمل بالشركة، وإعادتها فور طلب الإدارة أو عند انتهاء خدمتي بحالتها المستلمة، وأتحمل كامل المسؤولية الإدارية والمالية عن أي فقدان أو تلف ناتج عن الإهمال أو سوء الاستخدام.'}
        </p>
      </div>

      ${renderSignatureBlock(employee?.fullName || voucher.employeeName, voucher.companyRepName || 'أمين المستودع المركزي', true, settings)}

      ${footerHtml}
    </div>
  `;
}

/**
 * Generate Custody Return Voucher (محضر إرجاع عهدة)
 */
export function buildCustodyReturnVoucherHtml(voucher, employee, settings) {
  const headerHtml = renderDocumentHeader(settings, 'محضر إرجاع عهدة ومخالصة أجهزة', voucher.voucherNumber, voucher.date);
  const footerHtml = renderDocumentFooter(settings, voucher.voucherNumber);

  const itemsRows = (voucher.items || []).map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td class="ltr-text font-mono">${escapeHtml(item.serialNumber) || '—'}</td>
      <td><span class="badge ${item.returnCondition === 'متضرر' ? 'badge-rose' : 'badge-emerald'}">${escapeHtml(item.returnCondition) || 'سليم ومكتمل'}</span></td>
      <td>${escapeHtml(item.damages) || 'لا توجد أضرار'}</td>
      <td>${escapeHtml(item.missingItems) || 'لا توجد نواقص'}</td>
    </tr>
  `).join('');

  return `
    <div class="printable-a4-document voucher-document">
      ${headerHtml}

      <div class="voucher-info-box">
        <table class="voucher-meta-table">
          <tr>
            <td><strong>اسم الموظف المرجع:</strong> ${escapeHtml(employee?.fullName || voucher.employeeName)}</td>
            <td><strong>الرقم الوظيفي:</strong> <span class="font-mono font-bold">${escapeHtml(employee?.code || voucher.employeeId) || '—'}</span></td>
          </tr>
          <tr>
            <td><strong>المسمى الوظيفي:</strong> ${escapeHtml(voucher.jobTitle || employee?.jobTitle) || '—'}</td>
            <td><strong>الفرع:</strong> ${escapeHtml(voucher.branchName || employee?.branchName) || '—'}</td>
          </tr>
          <tr>
            <td><strong>تاريخ الإرجاع:</strong> ${formatDate(voucher.date)}</td>
            <td><strong>حالة التسوية:</strong> <span class="badge badge-emerald">تم الفحص والاستلام</span></td>
          </tr>
        </table>
      </div>

      <div class="voucher-items-section">
        <h3 class="section-card-title"><i class="fa-solid fa-rotate-left"></i> بيان العهد المعادة وحالتها الفنية</h3>
        <table class="doc-data-table">
          <thead>
            <tr>
              <th width="40">#</th>
              <th>بيان العهدة</th>
              <th>الرقم التسلسلي</th>
              <th>الحالة عند الإرجاع</th>
              <th>الأضرار المسجلة</th>
              <th>النواقص إن وجدت</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <div class="voucher-declaration-box clearance-box">
        <h4 class="declaration-title"><i class="fa-solid fa-circle-check"></i> شهادة براءة الذمة للعهدة المذكورة</h4>
        <p class="declaration-text">
          تشهد إدارة شركة أبو حذيفة للصرافة والتحويلات بأن الموظف المذكور أعلاه قد قام بإرجاع العهدة المبينة في هذا المحضر، وتم فحصها ومطابقتها فنياً، وبذلك تعتبر ذمته بريئة بخصوص هذه العهدة المحددة فقط من تاريخ تحرير هذا المحضر.
        </p>
      </div>

      ${renderSignatureBlock(employee?.fullName || voucher.employeeName, voucher.receivedByName || 'أمين المستودع المركزي', true, settings)}

      ${footerHtml}
    </div>
  `;
}

/**
 * Generate Vehicle Handover & Inspection Sheet (محضر تسليم وفحص مركبة)
 */
export function buildVehicleInspectionDocumentHtml(vehicle, inspection, employee, settings) {
  const headerHtml = renderDocumentHeader(settings, 'محضر فحص وتسليم مركبة', vehicle.code, inspection.date);
  const footerHtml = renderDocumentFooter(settings, vehicle.code);

  const itemsKeys = Object.keys(inspection.items || {});
  const checklistRows = itemsKeys.map((key, i) => {
    const item = inspection.items[key];
    return `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td><strong>${escapeHtml(key)}</strong></td>
        <td><span class="badge ${item.status === 'سليم' ? 'badge-emerald' : 'badge-amber'}">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.note) || '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="printable-a4-document vehicle-document">
      ${headerHtml}

      <div class="vehicle-specs-card mb-4">
        <h3 class="section-card-title"><i class="fa-solid fa-car"></i> بيانات المركبة</h3>
        <table class="doc-data-table">
          <tbody>
            <tr>
              <td><strong>الماركة والموديل:</strong> ${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} (${escapeHtml(vehicle.year)})</td>
              <td><strong>رقم اللوحة:</strong> <span class="badge-plate">${escapeHtml(vehicle.plateNumber)}</span></td>
            </tr>
            <tr>
              <td><strong>رقم الشاصي:</strong> <span class="font-mono">${escapeHtml(vehicle.chassisNumber)}</span></td>
              <td><strong>رقم المحرك:</strong> <span class="font-mono">${escapeHtml(vehicle.engineNumber) || '—'}</span></td>
            </tr>
            <tr>
              <td><strong>اللون:</strong> ${escapeHtml(vehicle.color)}</td>
              <td><strong>الفرع التابع له:</strong> ${escapeHtml(vehicle.branchName)}</td>
            </tr>
            <tr>
              <td><strong>قراءة العداد الحالية:</strong> ${vehicle.odometer.toLocaleString()} كم</td>
              <td><strong>مستوى الوقود:</strong> ${escapeHtml(vehicle.fuelLevel)}</td>
            </tr>
            <tr>
              <td><strong>الموظف المستلم:</strong> ${escapeHtml(employee?.fullName || vehicle.assignedEmployeeName) || '—'}</td>
              <td><strong>تاريخ التسليم:</strong> ${formatDate(vehicle.handoverDate || inspection.date)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="inspection-results-section mb-4">
        <h3 class="section-card-title"><i class="fa-solid fa-clipboard-check"></i> نتائج الفحص الفني للمركبة</h3>
        <table class="doc-data-table">
          <thead>
            <tr>
              <th width="40">#</th>
              <th>عنصر الفحص</th>
              <th width="150">الحالة</th>
              <th>ملاحظات الفاحص</th>
            </tr>
          </thead>
          <tbody>
            ${checklistRows || '<tr><td colspan="4" class="text-center">تم الفحص الشامل والمركبة بحالة جيدة جداً</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="voucher-declaration-box">
        <h4 class="declaration-title"><i class="fa-solid fa-shield-halved"></i> إقرار وتعهد مستلم المركبة</h4>
        <p class="declaration-text">
          أقر أنا الموظف المستلم للمركبة بأنني قد عاينت السيارة الموضحة أعلاه وفحصت محتوياتها ووثائقها (الاستمارة والتأمين) ومعداتها وأوافق على نتائج الفحص، وأتعهد بالمحافظة عليها وقيادتها بأمان طبقاً للأنظمة المرورية ولوائح الشركة واستخدامها لأغراض العمل، وإبلاغ الإدارة فوراً بأي طارئ.
        </p>
      </div>

      ${renderSignatureBlock(employee?.fullName || vehicle.assignedEmployeeName, 'مسؤول الحركة والخدمات', true, settings)}

      ${footerHtml}
    </div>
  `;
}

/**
 * Isolated High-Fidelity Print Driver
 */
export function executeIsolatedPrint(htmlContent, title = 'مستند رسمي') {
  let printFrame = document.getElementById('isolated-print-frame');
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'isolated-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '-9999px';
    printFrame.style.bottom = '-9999px';
    printFrame.style.width = '0px';
    printFrame.style.height = '0px';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
      <link rel="stylesheet" href="assets/css/main.css">
      <link rel="stylesheet" href="assets/css/components.css">
      <link rel="stylesheet" href="assets/css/print.css" media="all">
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
        body { margin: 0; padding: 0; background: #fff !important; font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif !important; }
        .printable-a4-document { width: 100% !important; max-width: 100% !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);
  frameDoc.close();

  setTimeout(() => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
  }, 350);
}

/**
 * Launch Print & PDF Preview Modal
 */
export async function previewAndPrintDocument(title, htmlContent, filename = 'document.pdf', auditMeta = null) {
  const modalEl = document.getElementById('pdf-preview-modal');
  const bodyEl = document.getElementById('pdf-preview-body');
  const titleEl = document.getElementById('pdf-preview-title');
  const printBtn = document.getElementById('btn-print-active-doc');
  const downloadBtn = document.getElementById('btn-download-active-pdf');

  if (!modalEl || !bodyEl) {
    console.error('PDF preview modal elements not found in DOM');
    return;
  }

  titleEl.textContent = title;
  bodyEl.innerHTML = htmlContent;
  modalEl.classList.add('active');

  printBtn.onclick = async () => {
    if (auditMeta) {
      await logAudit('طباعة مستند', auditMeta.module || 'المستندات', auditMeta.recordId, `تمت طباعة (${title})`);
    }
    executeIsolatedPrint(htmlContent, title);
  };

  downloadBtn.onclick = async () => {
    if (auditMeta) {
      await logAudit('تصدير مستند PDF', auditMeta.module || 'المستندات', auditMeta.recordId, `تم تصدير ملف PDF بعنوان (${title})`);
    }

    if (window.html2pdf) {
      const opt = {
        margin: [10, 12, 12, 12],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      const element = bodyEl.querySelector('.printable-a4-document') || bodyEl;
      showToast('جاري إنشاء ملف PDF وتنزيله...');
      window.html2pdf().set(opt).from(element).save().then(() => {
        showToast('تم تحميل ملف PDF بنجاح.');
      }).catch(err => {
        console.warn('html2pdf error, fallback to print:', err);
        executeIsolatedPrint(htmlContent, title);
      });
    } else {
      showToast('يمكنك اختيار "حفظ بتنسيق PDF" من نافذة الطباعة.');
      executeIsolatedPrint(htmlContent, title);
    }
  };
}
