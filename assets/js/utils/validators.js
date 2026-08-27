/**
 * Abu Hudhayfah Exchange & Transfers - Input Validation Service
 */

import { db } from '../core/db.js';

export async function validateContract(data, isEdit = false, currentId = null) {
  const errors = [];

  if (!data.employeeId) {
    errors.push('يجب اختيار الموظف المتعاقد معه.');
  }

  if (!data.contractNumber || !data.contractNumber.trim()) {
    errors.push('رقم العقد مطلوب.');
  } else {
    // Check duplicate contract number
    const existing = await db.findOne('contracts', c => c.contractNumber.trim() === data.contractNumber.trim() && (!isEdit || c.id !== currentId));
    if (existing) {
      errors.push(`رقم العقد (${data.contractNumber}) مسجل مسبقاً لموظف آخر.`);
    }
  }

  if (!data.startDate) {
    errors.push('تاريخ بداية العقد مطلوب.');
  }

  if (data.contractType !== 'عقد غير محدد المدة' && !data.endDate) {
    errors.push('تاريخ نهاية العقد مطلوب للعقود محددة المدة.');
  }

  if (data.startDate && data.endDate) {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      errors.push('تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية.');
    }
  }

  if (data.baseSalary === undefined || data.baseSalary === null || Number(data.baseSalary) < 0) {
    errors.push('الراتب الأساسي يجب ألا يكون فارغاً أو سالباً.');
  }

  if (!data.currency || !['YER', 'SAR'].includes(data.currency)) {
    errors.push('يجب تحديد عملة الراتب (ريال يمني أو ريال سعودي).');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function validateEmployee(data, isEdit = false, currentId = null) {
  const errors = [];

  if (!data.fullName || data.fullName.trim().split(' ').length < 3) {
    errors.push('الاسم الرباعي الكامل للموظف مطلوب (3 أسماء على الأقل).');
  }

  if (!data.nationalId || !data.nationalId.trim()) {
    errors.push('رقم الهوية أو الجواز مطلوب.');
  } else {
    const existing = await db.findOne('employees', e => e.nationalId.trim() === data.nationalId.trim() && (!isEdit || e.id !== currentId));
    if (existing) {
      errors.push(`رقم الهوية (${data.nationalId}) مسجل مسبقاً لموظف آخر.`);
    }
  }

  if (!data.phone || !data.phone.trim()) {
    errors.push('رقم هاتف الموظف مطلوب.');
  }

  if (!data.jobTitle || !data.jobTitle.trim()) {
    errors.push('المسمى الوظيفي مطلوب.');
  }

  if (!data.branchId) {
    errors.push('يجب تحديد الفرع التابع له الموظف.');
  }

  if (data.baseSalary !== undefined && Number(data.baseSalary) < 0) {
    errors.push('الراتب الأساسي لا يمكن أن يكون سالباً.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function validateCustodyHandover(custodyId, employeeId) {
  const errors = [];

  if (!custodyId) errors.push('يجب تحديد العهدة المطلوب تسليمها.');
  if (!employeeId) errors.push('يجب تحديد الموظف المستلم.');

  if (custodyId) {
    const custody = await db.get('custodies', custodyId);
    if (!custody) {
      errors.push('العهدة المحددة غير موجودة في النظام.');
    } else if (custody.status === 'delivered') {
      errors.push(`العهدة (${custody.name}) مسلّمة بالفعل للموظف (${custody.employeeName || 'آخر'}) ولا يمكن تسليمها لموظف آخر في نفس الوقت.`);
    } else if (custody.status === 'lost') {
      errors.push(`العهدة مسجلة كـ "مفقودة" ولا يمكن تسليمها.`);
    } else if (custody.status === 'damaged') {
      errors.push(`العهدة مسجلة كـ "متضررة" وتحتاج إلى صيانة.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function validateCustodyReturn(custodyId) {
  const errors = [];
  if (!custodyId) {
    errors.push('يجب تحديد العهدة المراد إرجاعها.');
    return { isValid: false, errors };
  }

  const custody = await db.get('custodies', custodyId);
  if (!custody) {
    errors.push('العهدة المحددة غير موجودة.');
  } else if (custody.status !== 'delivered') {
    errors.push('العهدة المحددة ليست في حالة "مسلمة" حالياً ولا يمكن إرجاعها.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
