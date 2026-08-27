/**
 * Abu Hudhayfah Exchange & Transfers - System Constants
 * Core data dictionaries and enumeration values.
 */

export const CURRENCIES = {
  YER: { code: 'YER', name: 'الريال اليمني', symbol: 'ر.ي' },
  SAR: { code: 'SAR', name: 'الريال السعودي', symbol: 'ر.س' }
};

export const CONTRACT_TYPES = [
  'عقد محدد المدة',
  'عقد غير محدد المدة',
  'عقد دوام كامل',
  'عقد إداري',
  'عقد موظف صراف',
  'عقد موظف فرع',
  'عقد مخصص'
];

export const CONTRACT_STATUSES = {
  DRAFT: { key: 'draft', label: 'مسودة', color: 'slate', icon: 'fa-file-lines' },
  REVIEW: { key: 'review', label: 'قيد المراجعة', color: 'amber', icon: 'fa-clock' },
  APPROVED: { key: 'approved', label: 'معتمد', color: 'emerald', icon: 'fa-check-circle' },
  EXPIRED: { key: 'expired', label: 'منتهي', color: 'rose', icon: 'fa-calendar-xmark' },
  CANCELLED: { key: 'cancelled', label: 'ملغى', color: 'red', icon: 'fa-ban' }
};

export const EMPLOYEE_STATUSES = {
  ACTIVE: { key: 'active', label: 'نشط', color: 'emerald' },
  ON_LEAVE: { key: 'on_leave', label: 'في إجازة', color: 'blue' },
  SUSPENDED: { key: 'suspended', label: 'موقوف', color: 'amber' },
  TERMINATED: { key: 'terminated', label: 'منتهي الخدمة', color: 'slate' }
};

export const EMPLOYMENT_TYPES = [
  'دوام كامل',
  'دوام جزئي',
  'عقد مؤقت',
  'فترة تجربة',
  'عقد موسمي'
];

export const CUSTODY_TYPES = [
  'كمبيوتر',
  'لابتوب',
  'هاتف',
  'جهاز صراف',
  'طابعة',
  'شاشة',
  'جهاز بصمة',
  'معدات مكتبية',
  'مفاتيح',
  'سيارة',
  'دراجة',
  'معدات أخرى'
];

export const CUSTODY_STATUSES = {
  AVAILABLE: { key: 'available', label: 'متاحة', color: 'emerald', icon: 'fa-box' },
  DELIVERED: { key: 'delivered', label: 'مسلمة', color: 'blue', icon: 'fa-user-check' },
  RETURNED: { key: 'returned', label: 'مرتجعة', color: 'cyan', icon: 'fa-rotate-left' },
  DAMAGED: { key: 'damaged', label: 'متضررة', color: 'amber', icon: 'fa-triangle-exclamation' },
  LOST: { key: 'lost', label: 'مفقودة', color: 'rose', icon: 'fa-circle-xmark' },
  MAINTENANCE: { key: 'maintenance', label: 'تحت الصيانة', color: 'purple', icon: 'fa-wrench' },
  ARCHIVED: { key: 'archived', label: 'مؤرشفة', color: 'slate', icon: 'fa-box-archive' }
};

export const VEHICLE_CONDITIONS = [
  'ممتاز (حالة الوكالة)',
  'جيد جداً (لا توجد أضرار)',
  'جيد (استخدام طبيعي)',
  'مقبول (يحتاج صيانة طفيفة)',
  'متضرر (أعطال أو صدمات)'
];

export const FUEL_LEVELS = [
  'خالٍ (E)',
  'ربع (1/4)',
  'نصف (1/2)',
  'ثلاثة أرباع (3/4)',
  'ممتلئ (Full)'
];

export const DYNAMIC_VARIABLES = [
  { tag: '{{company_name}}', label: 'اسم الشركة', sample: 'شركة أبو حذيفة للصرافة والتحويلات' },
  { tag: '{{employee_name}}', label: 'اسم الموظف الرباعي', sample: 'محمد عبدالله علي الأهدل' },
  { tag: '{{employee_id}}', label: 'الرقم الوظيفي', sample: 'EMP-1001' },
  { tag: '{{national_id}}', label: 'رقم الهوية / الجواز', sample: '108492048' },
  { tag: '{{job_title}}', label: 'المسمى الوظيفي', sample: 'أمين صندوق وصراف' },
  { tag: '{{department}}', label: 'القسم / الإدارة', sample: 'إدارة العمليات المصرفية' },
  { tag: '{{branch}}', label: 'الفرع', sample: 'المركز الرئيسي - صنعاء' },
  { tag: '{{workplace}}', label: 'مكان العمل', sample: 'مبنى الإدارة العامة' },
  { tag: '{{start_date}}', label: 'تاريخ بداية العقد', sample: '2026-01-01' },
  { tag: '{{end_date}}', label: 'تاريخ نهاية العقد', sample: '2026-12-31' },
  { tag: '{{contract_duration}}', label: 'مدة العقد', sample: 'سنة واحدة' },
  { tag: '{{salary}}', label: 'الراتب الأساسي', sample: '350,000' },
  { tag: '{{allowances}}', label: 'البدلات', sample: '50,000' },
  { tag: '{{total_salary}}', label: 'إجمالي الراتب', sample: '400,000' },
  { tag: '{{salary_currency}}', label: 'عملة الراتب', sample: 'ريال يمني' },
  { tag: '{{probation_period}}', label: 'فترة التجربة', sample: '3 أشهر' },
  { tag: '{{working_hours}}', label: 'ساعات العمل اليومية', sample: '8 ساعات' },
  { tag: '{{working_days}}', label: 'أيام العمل الأسبوعية', sample: 'من السبت إلى الخميس' },
  { tag: '{{notice_period}}', label: 'فترة الإشعار', sample: '30 يوماً' }
];

export const AUDIT_ACTIONS = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  ARCHIVE: 'أرشفة',
  CANCEL: 'إلغاء',
  APPROVE: 'اعتماد',
  REVISION: 'إصدار نسخة معدلة',
  HANDOVER: 'تسليم عهدة',
  RETURN: 'إرجاع عهدة',
  DAMAGE_REPORT: 'تسجيل تلف عهدة',
  LOSS_REPORT: 'تسجيل فقد عهدة',
  INSPECTION: 'فحص مركبة',
  PDF_EXPORT: 'تصدير مستند PDF',
  PRINT: 'طباعة مستند',
  BACKUP_EXPORT: 'تصدير نسخة احتياطية',
  BACKUP_RESTORE: 'استعادة نسخة احتياطية',
  SETTINGS_UPDATE: 'تحديث الإعدادات'
};
