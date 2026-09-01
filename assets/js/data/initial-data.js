/**
 * Abu Hudhayfah Exchange & Transfers - Initial Seed Data (Clean Production Setup)
 * Contains customizable company settings, branches, 22 default clauses, and templates.
 * All dummy records (employees, contracts, custodies, vehicles, vouchers) are removed as requested.
 */

export const INITIAL_COMPANY_SETTINGS = {
  id: 'company_settings',
  companyName: 'شركة أبو حذيفة للصرافة والتحويلات',
  companyNameEn: 'Abu Hudhayfah Exchange & Transfers Co.',
  firstPartyName: 'شركة أبو حذيفة للصرافة والتحويلات',
  firstPartyRepName: 'أبو حذيفة (المدير العام)',
  firstPartyRepRole: 'المدير العام التنفيذي',
  commercialRegister: '108492048',
  taxNumber: '402918237',
  licenseNumber: 'C-2018-9942',
  centralBankLicense: 'ترخيص البنك المركزي رقم 442/ص',
  headquarters: 'اليمن - صنعاء - شارع الزبيري',
  phone: '+967 1 234567',
  phoneSecondary: '+967 777 123 456',
  email: 'hr@abuhudhayfah-exchange.com',
  website: 'www.abuhudhayfah-exchange.com',
  logoUrl: 'assets/images/logo.svg',
  stampUrl: 'assets/images/stamp.svg',
  legalDisclaimer: 'تنبيه قانوني هام: جميع بنود ونماذج العقود الواردة في هذا النظام هي نماذج استرشادية وإدارية قابلة للتعديل الكامل من قبل إدارة الشركة، ولا تُعتبر استشارة قانونية نهائية. مراجعة العقود وتكييفها القانوني يخضع لموافقة المستشار القانوني وإدارة الموارد البشرية المعتمدة بالشركة.',
  defaultProbationPeriod: '3 أشهر',
  defaultWorkingHours: '8 ساعات يومياً',
  defaultWorkingDays: 'من السبت إلى الخميس (6 أيام)',
  defaultNoticePeriod: '30 يوماً',
  currencyDefault: 'YER',
  lastBackupDate: null,
  isDemoDataLoaded: false,
  supabaseConfig: {
    enabled: false,
    url: '',
    anonKey: '',
    autoSync: false,
    lastSyncDate: null
  },
  createdAt: '2026-01-01T08:00:00.000Z'
};

export const INITIAL_BRANCHES = [
  { id: 'BR-01', code: 'HQ-SANAA', name: 'المركز الرئيسي - صنعاء', city: 'صنعاء', address: 'شارع الزبيري - برج الصرافة', phone: '+967 1 234567', isMain: true, active: true },
  { id: 'BR-02', code: 'BR-ADEN', name: 'فرع عدن - المعلا', city: 'عدن', address: 'الشارع الرئيسي - بجانب البريد', phone: '+967 2 245678', isMain: false, active: true },
  { id: 'BR-03', code: 'BR-TAIZ', name: 'فرع تعز - شارع جمال', city: 'تعز', address: 'شارع جمال عبدالناصر - مجمع الصرافين', phone: '+967 4 256789', isMain: false, active: true },
  { id: 'BR-04', code: 'BR-MUKALLA', name: 'فرع المكلا - خور المكلا', city: 'المكلا', address: 'كورنيش المحضار - بجانب بنك اليمن الدولي', phone: '+967 5 312345', isMain: false, active: true },
  { id: 'BR-05', code: 'BR-MARIB', name: 'فرع مأرب - الشارع العام', city: 'مأرب', address: 'الشارع العام - مقابل المجمع الحكومي', phone: '+967 6 423456', isMain: false, active: true },
  { id: 'BR-06', code: 'BR-HODIEDAH', name: 'فرع الحديدة - شارع الميناء', city: 'الحديدة', address: 'شارع الميناء - تقاطع صنعاء', phone: '+967 3 214567', isMain: false, active: true }
];

export const INITIAL_DEFAULT_CLAUSES = [
  {
    id: 'CLS-01',
    order: 1,
    numberText: 'البند الأول',
    title: 'التمهيد',
    content: 'يقر الطرفان بأن هذا التمهيد جزء لا يتجزأ من هذا العقد ومكملاً لأحكامه وبنوده كافة، ويُقر الطرف الثاني (الموظف) بأهليته المعتبرة شرعاً وقانوناً للتعاقد والالتزام.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-02',
    order: 2,
    numberText: 'البند الثاني',
    title: 'طبيعة العمل والمسمى الوظيفي',
    content: 'يلتزم الموظف (الطرف الثاني) بأداء المهام والمسؤوليات المرتبطة بمسمّاه الوظيفي ({{job_title}})، وتنفيذ التعليمات الإدارية والمهنية الصادرة من الإدارة ضمن حدود العمل، والمحافظة على أعلى مستويات الأداء المهني والانضباط المطلوب لقطاع الصرافة والتحويلات.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-03',
    order: 3,
    numberText: 'البند الثالث',
    title: 'مكان العمل وتغيير الموقع',
    content: 'يلتزم الموظف بأداء عمله في ({{branch}}) أو الموقع المحدد من الشركة، ويجوز للشركة تكليفه بالعمل في موقع أو فرع آخر وفق متطلبات العمل ومصلحة الشركة وبما لا يتعارض مع الأنظمة والسياسات المعمول بها.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-04',
    order: 4,
    numberText: 'البند الرابع',
    title: 'مدة العقد وسريانه',
    content: 'تحدد مدة هذا العقد بـ ({{contract_duration}})، تبدأ من تاريخ {{start_date}} وتنتهي في {{end_date}}، ويبين تاريخ بدايته ونهايته وآلية التجديد أو الانتهاء وفق الأحكام والسياسات المعتمدة لدى الشركة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-05',
    order: 5,
    numberText: 'البند الخامس',
    title: 'فترة التجربة والتقييم',
    content: 'يخضع الموظف لفترة تجربة مدتها ({{probation_period}})، تبدأ من تاريخ مباشرة العمل، ويتم خلالها تقييم الأداء والانضباط والملاءمة الوظيفية، ويحق للشركة إنهاء العقد خلال هذه الفترة دون مكافأة أو إشعار مسبق وفق اللوائح.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-06',
    order: 6,
    numberText: 'البند السادس',
    title: 'ساعات وأيام العمل',
    content: 'يلتزم الموظف بساعات العمل المحددة بـ ({{working_hours}}) وأيام العمل المقررة بـ ({{working_days}})، مع الالتزام التام بتسجيل الحضور والانصراف عبر الأنظمة المعتمدة (جهاز البصمة)، وأي تعديل يكون وفق متطلبات العمل والتعليمات الرسمية الصادرة من الإدارة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-07',
    order: 7,
    numberText: 'البند السابع',
    title: 'الأجر والبدلات والمخصصات المالية',
    content: 'يستحق الموظف راتباً أساسياً قدره ({{salary}} {{salary_currency}})، بالإضافة إلى البدلات والمزايا المقررة إن وجدت، وتحدد العملة بوضوح بـ ({{salary_currency}}) دون إجراء أي تحويل تلقائي بين العملات، ويُصرف الراتب في نهاية كل شهر ميلادي وفق الإجراءات المعتمدة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-08',
    order: 8,
    numberText: 'البند الثامن',
    title: 'واجبات الموظف والانضباط',
    content: 'يلتزم الموظف بأداء عمله بأمانة تامة ودقة متناهية، والمحافظة على مصالح الشركة وأموالها، وحسن معاملة العملاء واحترام الزملاء، والالتزام بالسياسات والإجراءات واللوائح والتعليمات الداخلية.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-09',
    order: 9,
    numberText: 'البند التاسع',
    title: 'السرية المهنية والمصرفية',
    content: 'يلتزم الموظف بالمحافظة التامة على سرية جميع المعلومات والبيانات التي يطلع عليها بحكم عمله، بما في ذلك بيانات العملاء والحسابات والحوالات الصادرة والواردة والأرصدة والمعلومات المالية والتجارية والإدارية والبرمجية، ويظل هذا الالتزام قائماً حتى بعد انتهاء العلاقة الوظيفية.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-10',
    order: 10,
    numberText: 'البند العاشر',
    title: 'حماية بيانات العملاء والأمن السيبراني',
    content: 'يحظر على الموظف حظراً باتاً نسخ أو تصوير أو إرسال أو مشاركة أو استخراج أو استخدام بيانات العملاء أو الحوالات أو المستندات أو السجلات خارج نطاق العمل المصرح به رسمياً، ويلتزم باتباع أعلى معايير أمن المعلومات المعتمدة بالشركة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-11',
    order: 11,
    numberText: 'البند الحادي عشر',
    title: 'العهد وممتلكات الشركة',
    content: 'يقر الموظف بمسؤوليته المباشرة والأمانة الكاملة عن العهد والممتلكات والأجهزة والمعدات والأدوات والسيارات المسلمة إليه بموجب محاضر استلام رسمية، ويلتزم بالمحافظة عليها وصيانتها واستخدامها حصرياً لأغراض العمل وإعادتها فور الطلب أو عند انتهاء خدمته.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-12',
    order: 12,
    numberText: 'البند الثاني عشر',
    title: 'استخدام الأنظمة المصرفية والأجهزة',
    content: 'تُستخدم أجهزة وشبكات وأنظمة الشركة المصرفية لأغراض العمل المصرح بها فقط، ويحظر العبث بإعداداتها أو محاولة تجاوز الصلاحيات أو مشاركة كلمات المرور والرموز السرية أو تمكين أي شخص غير مصرح له من استخدامها تحت أي ظرف.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-13',
    order: 13,
    numberText: 'البند الثالث عشر',
    title: 'المسؤولية القانونية والمالية عن العهد',
    content: 'تُسجل حالة العهدة وتفاصيلها الفنية بدقة عند التسليم، وأي فقد أو تلف أو نقص ناتج عن إهمال أو سوء استخدام يتم توثيقه بمحضر رسمي، وتتم معالجة المسؤولية والتعويض المالي وفق الأنظمة والسياسات والإجراءات المعتمدة لدى الشركة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-14',
    order: 14,
    numberText: 'البند الرابع عشر',
    title: 'المركبات والسيارات المسلمة',
    content: 'عند تسليم مركبة أو سيارة للموظف يلتزم بالمحافظة عليها وقيادتها بأمان واستخدامها وفق أغراض العمل المعتمدة، والاحتفاظ بوثائقها ومعداتها، وإبلاغ الإدارة فوراً عن أي حادث مروري أو عطل ميكانيكي أو مخالفة، مع الالتزام بتعبئة محضر الفحص الدوري.',
    isMandatory: false,
    isActive: true
  },
  {
    id: 'CLS-15',
    order: 15,
    numberText: 'البند الخامس عشر',
    title: 'الإجازات السنوية والرسمية',
    content: 'تُمنح الإجازات السنوية والرسمية والمرضية والاضطرارية وفق قانون العمل واللوائح والسياسات الداخلية المعمول بها لدى الشركة، ولا يجوز التمتع بالإجازة إلا بعد تقديم الطلب والحصول على الموافقة الإدارية الخطية المسبقة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-16',
    order: 16,
    numberText: 'البند السادس عشر',
    title: 'تعارض المصالح وحظر المنافسة',
    content: 'يلتزم الموظف بالإفصاح الفوري عن أي حالة قد تؤدي إلى تعارض بين مصلحته الشخصية ومصلحة الشركة، ويحظر عليه مزاولة أي عمل تجاري مماثل أو العمل لدى أي جهة منافسة سواء بأجر أو بدون أجر طوال فترة عمله بالشركة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-17',
    order: 17,
    numberText: 'البند السابع عشر',
    title: 'التعامل مع النقد والحوالات المالية',
    content: 'يلتزم الموظف المكلف بالتعامل مع النقدية والصناديق والحوالات باتباع أدق إجراءات العد، الكشف عن العملات المزيفة، المطابقة اليومية للأرصدة، والتسليم والاستلام وفق المستندات الرسمية، ويتحمل كامل المسؤولية عن أي عجز مالي ناتج عن مخالفته للإجراءات التشغيلية.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-18',
    order: 18,
    numberText: 'البند الثامن عشر',
    title: 'الالتزام بالسياسات ومكافحة غسل الأموال',
    content: 'يقر الموظف باطلاعه التام على سياسات وإجراءات الشركة ذات الصلة بعمله، لاسيما تعليمات الامتثال ومكافحة غسل الأموال وتمويل الإرهاب، ويلتزم بالإبلاغ الفوري عن أي عمليات مشبوهة وفق القنوات المعتمدة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-19',
    order: 19,
    numberText: 'البند التاسع عشر',
    title: 'المخالفات والجزاءات التأديبية',
    content: 'تخضع المخالفات المهنية والإدارية والمالية للائحة الجزاءات والسياسات التأديبية المعمول بها بالشركة وبما يتماشى مع الأنظمة القانونية، مع توثيق كافة التحقيقات والقرارات الإدارية في ملف الموظف.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-20',
    order: 20,
    numberText: 'البند العشرون',
    title: 'إنهاء العلاقة الوظيفية والإشعار',
    content: 'تنتهي العلاقة الوظيفية بانقضاء مدة العقد، أو بالاستقالة بعد تقديم إشعار مسبق مدته ({{notice_period}})، أو بقرار إنهاء مسبب من الشركة، مع استكمال كافة إجراءات تسليم العهد والمستندات والتسويات المالية وبراءة الذمة.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-21',
    order: 21,
    numberText: 'البند الحادي والعشرون',
    title: 'تسليم العهد وإبراء الذمة عند انتهاء العمل',
    content: 'يلتزم الموظف بإعادة جميع العهد والممتلكات والمستندات والأجهزة والسيارات والمفاتيح والبطاقات المصرفية وأي مواد تخص الشركة بموجب محضر إرجاع رسمي معتمد قبل استلام أي مستحقات مالية أو شهادة خبرة أو إتمام المخالصة النهائية.',
    isMandatory: true,
    isActive: true
  },
  {
    id: 'CLS-22',
    order: 22,
    numberText: 'البند الثاني والعشرون',
    title: 'الإقرار والمصادقة والاختصاص',
    content: 'يقر الطرفان بأنهما قرأ هذا العقد وفهما بنوده ومحتواه ومرفقاته فهماً نافياً للجهالة، ووافقا على جميع أحكامه والتزما بها، وتعتبر المحاكم المختصة في مقر المركز الرئيسي هي المرجع القضائي في حال نشوء أي نزاع يتعذر حله ودياً.',
    isMandatory: true,
    isActive: true
  }
];

export const INITIAL_TEMPLATES = [
  {
    id: 'TPL-TELLER',
    name: 'عقد موظف صراف وأمين صندوق',
    type: 'عقد موظف صراف',
    description: 'مخصص لموظفي شبابيك الصرف، أمناء الصناديق، ومسؤولي استلام وتسليم النقد والحوالات المالية.',
    clauseIds: ['CLS-01', 'CLS-02', 'CLS-03', 'CLS-04', 'CLS-05', 'CLS-06', 'CLS-07', 'CLS-08', 'CLS-09', 'CLS-10', 'CLS-11', 'CLS-12', 'CLS-13', 'CLS-15', 'CLS-16', 'CLS-17', 'CLS-18', 'CLS-19', 'CLS-20', 'CLS-21', 'CLS-22'],
    defaultProbation: '3 أشهر',
    defaultHours: '8 ساعات يومياً',
    defaultDays: 'من السبت إلى الخميس',
    defaultNotice: '30 يوماً',
    isDefault: true,
    isActive: true
  },
  {
    id: 'TPL-BRANCH-EMP',
    name: 'عقد موظف فرع وتحويلات',
    type: 'عقد موظف فرع',
    description: 'مخصص لموظفي خدمة العملاء، موظفي إرسال واستقبال الحوالات، والعمليات الميدانية بالفروع.',
    clauseIds: ['CLS-01', 'CLS-02', 'CLS-03', 'CLS-04', 'CLS-05', 'CLS-06', 'CLS-07', 'CLS-08', 'CLS-09', 'CLS-10', 'CLS-11', 'CLS-12', 'CLS-13', 'CLS-15', 'CLS-16', 'CLS-17', 'CLS-18', 'CLS-19', 'CLS-20', 'CLS-21', 'CLS-22'],
    defaultProbation: '3 أشهر',
    defaultHours: '8 ساعات يومياً',
    defaultDays: 'من السبت إلى الخميس',
    defaultNotice: '30 يوماً',
    isDefault: false,
    isActive: true
  },
  {
    id: 'TPL-ADMIN',
    name: 'عقد موظف إداري وإشرافي',
    type: 'عقد إداري',
    description: 'مخصص لمدراء الإدارات، المحاسبين، مسؤولي تقنية المعلومات، ومدراء الفروع والعمليات.',
    clauseIds: ['CLS-01', 'CLS-02', 'CLS-03', 'CLS-04', 'CLS-05', 'CLS-06', 'CLS-07', 'CLS-08', 'CLS-09', 'CLS-10', 'CLS-11', 'CLS-12', 'CLS-13', 'CLS-14', 'CLS-15', 'CLS-16', 'CLS-18', 'CLS-19', 'CLS-20', 'CLS-21', 'CLS-22'],
    defaultProbation: '3 أشهر',
    defaultHours: '8 ساعات يومياً',
    defaultDays: 'من السبت إلى الخميس',
    defaultNotice: '60 يوماً',
    isDefault: false,
    isActive: true
  },
  {
    id: 'TPL-FIXED',
    name: 'عقد عمل محدد المدة (عام)',
    type: 'عقد محدد المدة',
    description: 'قالب عام للوظائف الفنية والمهنية والتشغيلية المحددة بفترة تعاقد سنوية أو موسمية.',
    clauseIds: ['CLS-01', 'CLS-02', 'CLS-03', 'CLS-04', 'CLS-05', 'CLS-06', 'CLS-07', 'CLS-08', 'CLS-09', 'CLS-10', 'CLS-11', 'CLS-12', 'CLS-13', 'CLS-15', 'CLS-16', 'CLS-18', 'CLS-19', 'CLS-20', 'CLS-21', 'CLS-22'],
    defaultProbation: '3 أشهر',
    defaultHours: '8 ساعات يومياً',
    defaultDays: 'من السبت إلى الخميس',
    defaultNotice: '30 يوماً',
    isDefault: false,
    isActive: true
  },
  {
    id: 'TPL-CUSTOM',
    name: 'عقد مخصص / بنود شاملة',
    type: 'عقد مخصص',
    description: 'قالب شامل يحتوي على كافة بنود ومواد العمل بما في ذلك عهد المركبات والأجهزة الخاصة.',
    clauseIds: ['CLS-01', 'CLS-02', 'CLS-03', 'CLS-04', 'CLS-05', 'CLS-06', 'CLS-07', 'CLS-08', 'CLS-09', 'CLS-10', 'CLS-11', 'CLS-12', 'CLS-13', 'CLS-14', 'CLS-15', 'CLS-16', 'CLS-17', 'CLS-18', 'CLS-19', 'CLS-20', 'CLS-21', 'CLS-22'],
    defaultProbation: '3 أشهر',
    defaultHours: '8 ساعات يومياً',
    defaultDays: 'من السبت إلى الخميس',
    defaultNotice: '30 يوماً',
    isDefault: false,
    isActive: true
  }
];

// Clean Production Initial State: 0 dummy employees, contracts, custodies, vehicles, or vouchers
export const INITIAL_EMPLOYEES = [];
export const INITIAL_CUSTODIES = [];
export const INITIAL_VEHICLES = [];
export const INITIAL_CONTRACTS = [];
export const INITIAL_VOUCHERS = [];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'LOG-INIT-001',
    action: 'تهيئة النظام',
    module: 'النظام',
    recordId: 'SYS-INIT',
    description: 'تمت تهيئة وتشغيل نظام عقود الموظفين والعهد لشركة أبو حذيفة للصرافة والتحويلات بقاعدة بيانات نظيفة وجاهزة للعمل.',
    user: 'مدير النظام (أبو حذيفة)',
    timestamp: new Date().toISOString()
  }
];

// Optional Sample Records for Testing / Demo Purposes (Only loaded on explicit user request in Settings)
export const DEMO_SAMPLE_DATA = {
  employees: [
    {
      id: 'EMP-1001',
      code: 'EMP-1001',
      fullName: 'محمد عبدالله علي الأهدل',
      nationalId: '108492048',
      phone: '+967 771 234 567',
      address: 'صنعاء - مذبح - حارة النور',
      nationality: 'يمني',
      jobTitle: 'أمين صندوق وصراف رئيسي',
      department: 'إدارة العمليات المصرفية',
      branchId: 'BR-01',
      branchName: 'المركز الرئيسي - صنعاء',
      hireDate: '2024-01-15',
      employmentType: 'دوام كامل',
      status: 'active',
      endOfServiceDate: null,
      baseSalary: 380000,
      allowances: 60000,
      deductions: 15000,
      netSalary: 425000,
      currency: 'YER',
      notes: 'موظف متميز في عد النقدية ومطابقة الصناديق.',
      photoUrl: null,
      createdAt: '2024-01-15T08:00:00.000Z',
      updatedAt: '2026-01-10T10:30:00.000Z'
    },
    {
      id: 'EMP-1002',
      code: 'EMP-1002',
      fullName: 'سامي عبدالكريم أحمد العريقي',
      nationalId: '209384756',
      phone: '+967 773 987 654',
      address: 'عدن - المعلا - الشارع الدائري',
      nationality: 'يمني',
      jobTitle: 'مسؤول تحويلات دولية',
      department: 'إدارة التحويلات الخارجية',
      branchId: 'BR-02',
      branchName: 'فرع عدن - المعلا',
      hireDate: '2024-06-01',
      employmentType: 'دوام كامل',
      status: 'active',
      endOfServiceDate: null,
      baseSalary: 2800,
      allowances: 600,
      deductions: 100,
      netSalary: 3300,
      currency: 'SAR',
      notes: 'راتب محدد بالريال السعودي.',
      photoUrl: null,
      createdAt: '2024-06-01T08:00:00.000Z',
      updatedAt: '2026-02-01T09:00:00.000Z'
    }
  ],
  custodies: [
    {
      id: 'CUST-2001',
      code: 'AST-PC-101',
      type: 'جهاز صراف',
      name: 'آلة عد وفرز النقد وكشف التزوير GLORY',
      brand: 'Glory Global',
      model: 'GFS-220 Dual Pocket',
      serialNumber: 'GLR-9948201',
      color: 'رمادي فاتح / أسود',
      estimatedValue: 1200000,
      currency: 'YER',
      branchId: 'BR-01',
      branchName: 'المركز الرئيسي - صنعاء',
      status: 'available',
      employeeId: null,
      employeeName: null,
      handoverDate: null,
      purchaseDate: '2025-11-20',
      condition: 'ممتاز وجديد',
      notes: 'آلة جاهزة للتسليم.',
      imageUrl: null,
      createdAt: '2025-11-20T08:00:00.000Z',
      updatedAt: '2025-11-20T08:00:00.000Z'
    }
  ],
  vehicles: [
    {
      id: 'VEH-3001',
      code: 'VEH-01-SANAA',
      type: 'سيارة دفع رباعي',
      brand: 'Toyota',
      model: 'Prado TX-L',
      year: '2024',
      plateNumber: '11/48920 ص',
      chassisNumber: 'JTEBX29J804819203',
      engineNumber: '1GR-FE883921',
      color: 'أبيض لؤلؤي',
      odometer: 24000,
      bodyCondition: 'ممتاز (حالة الوكالة)',
      tireCondition: 'ممتاز',
      fuelLevel: 'ممتلئ (Full)',
      previousDamages: 'خالية من الصدمات',
      branchId: 'BR-01',
      branchName: 'المركز الرئيسي - صنعاء',
      status: 'available',
      assignedEmployeeId: null,
      assignedEmployeeName: null,
      handoverDate: null,
      insuranceExpiry: '2027-01-09',
      registrationExpiry: '2027-05-15',
      notes: 'مركبة جاهزة في كراج الشركة.',
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-01-10T08:00:00.000Z'
    }
  ]
};
