/**
 * Abu Hudhayfah Exchange & Transfers - Template Variable Substitution Engine
 */

import { formatDate, formatCurrency } from '../utils/formatters.js';

export function substituteContractVariables(text, contract, employee, settings) {
  if (!text) return '';

  const companyName = settings?.companyName || 'شركة أبو حذيفة للصرافة والتحويلات';
  const employeeName = employee?.fullName || contract?.employeeName || '—';
  const employeeId = employee?.code || contract?.employeeId || '—';
  const nationalId = employee?.nationalId || '—';
  const jobTitle = contract?.jobTitle || employee?.jobTitle || '—';
  const department = contract?.department || employee?.department || '—';
  const branch = contract?.branchName || employee?.branchName || '—';
  const workplace = contract?.workplace || branch || 'مقر الشركة';
  const startDate = formatDate(contract?.startDate);
  const endDate = contract?.endDate ? formatDate(contract?.endDate) : 'حسب ما يقره الطرفان';
  const duration = contract?.duration || (contract?.endDate ? 'سنة واحدة قابلة للتجديد' : 'غير محدد المدة');

  const currencyCode = contract?.currency || employee?.currency || 'YER';
  const currencyName = currencyCode === 'SAR' ? 'ريال سعودي' : 'ريال يمني';
  const salaryVal = contract?.baseSalary !== undefined ? formatCurrency(contract.baseSalary, currencyCode) : '—';
  const allowancesVal = contract?.allowances !== undefined ? formatCurrency(contract.allowances, currencyCode) : '0';
  const totalSalaryVal = (Number(contract?.baseSalary || 0) + Number(contract?.allowances || 0));
  const totalSalaryStr = formatCurrency(totalSalaryVal, currencyCode);

  const probationPeriod = contract?.probationPeriod || settings?.defaultProbationPeriod || '3 أشهر';
  const workingHours = contract?.workingHours || settings?.defaultWorkingHours || '8 ساعات يومياً';
  const workingDays = contract?.workingDays || settings?.defaultWorkingDays || 'من السبت إلى الخميس';
  const noticePeriod = contract?.noticePeriod || settings?.defaultNoticePeriod || '30 يوماً';

  const map = {
    '{{company_name}}': companyName,
    '{{employee_name}}': employeeName,
    '{{employee_id}}': employeeId,
    '{{national_id}}': nationalId,
    '{{job_title}}': jobTitle,
    '{{department}}': department,
    '{{branch}}': branch,
    '{{workplace}}': workplace,
    '{{start_date}}': startDate,
    '{{end_date}}': endDate,
    '{{contract_duration}}': duration,
    '{{salary}}': salaryVal,
    '{{allowances}}': allowancesVal,
    '{{total_salary}}': totalSalaryStr,
    '{{salary_currency}}': currencyName,
    '{{probation_period}}': probationPeriod,
    '{{working_hours}}': workingHours,
    '{{working_days}}': workingDays,
    '{{notice_period}}': noticePeriod
  };

  let rendered = text;
  for (const [key, value] of Object.entries(map)) {
    rendered = rendered.split(key).join(value);
  }

  return rendered;
}

export function extractPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(/{{[a-zA-Z0-9_]+}}/g);
  return matches ? [...new Set(matches)] : [];
}
