/**
 * Abu Hudhayfah Exchange & Transfers - Vehicle Inspection & Tracking Service
 */

export const VEHICLE_INSPECTION_ITEMS = [
  { key: 'body_front', label: 'الواجهة الأمامية والصدام الأمامي', category: 'الهيكل الخارجي' },
  { key: 'body_rear', label: 'الصدام الخلفي والشنطة', category: 'الهيكل الخارجي' },
  { key: 'body_right', label: 'الجانب الأيمن والأبواب', category: 'الهيكل الخارجي' },
  { key: 'body_left', label: 'الجانب الأيسر والأبواب', category: 'الهيكل الخارجي' },
  { key: 'glass_windshield', label: 'الزجاج الأمامي والخلفي والمرايا', category: 'الزجاج والمرايا' },
  { key: 'tires_main', label: 'الإطارات الأربعة وضغط الهواء', category: 'الإطارات والميكانيكا' },
  { key: 'tire_spare', label: 'الإطار الاحتياطي (الاستبنة) والرافعة والمفتاح', category: 'المعدات والطوارئ' },
  { key: 'interior_seats', label: 'المقاعد والفرش الداخلي والنظافة', category: 'المقصورة الداخلية' },
  { key: 'ac_system', label: 'نظام التكييف والتهوية والمسجل', category: 'المقصورة الداخلية' },
  { key: 'dashboard_lights', label: 'لوحة العدادات والإشارات والإنارة', category: 'الكهرباء والإنارة' },
  { key: 'docs_registration', label: 'استمارة السيارة سارية المفعول', category: 'الوثائق والتراخيص' },
  { key: 'docs_insurance', label: 'كارت التأمين ساري المفعول', category: 'الوثائق والتراخيص' },
  { key: 'keys_spare', label: 'المفتاح الرئيسي والمفتاح الاحتياطي', category: 'المفاتيح' }
];

export function createDefaultInspectionSheet(type = 'handover') {
  const sheet = {
    type, // 'handover' (تسليم) or 'return' (إرجاع)
    date: new Date().toISOString().split('T')[0],
    inspectorName: 'مسؤول الحركة والخدمات',
    items: {},
    fuelLevel: 'ممتلئ (Full)',
    odometer: 0,
    overallCondition: 'سليم وجاهز للتشغيل',
    damagesObserved: '',
    notes: ''
  };

  VEHICLE_INSPECTION_ITEMS.forEach(item => {
    sheet.items[item.key] = {
      status: 'سليم', // 'سليم', 'ملاحظة/خدش', 'متضرر', 'غير متوفر'
      note: ''
    };
  });

  return sheet;
}
