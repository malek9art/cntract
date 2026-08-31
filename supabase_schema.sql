-- =========================================================================
-- شركة أبو حذيفة للصرافة والتحويلات - سكريبت إنشاء جداول قاعدة بيانات Supabase
-- قم بنسخ هذا الكود ولصقه في SQL Editor داخل لوحة تحكم Supabase واضغط Run
-- =========================================================================

-- 1. جدول الموظفين (Employees)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    code TEXT,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    phone TEXT,
    address TEXT,
    nationality TEXT DEFAULT 'يمني',
    "jobTitle" TEXT,
    department TEXT,
    "branchId" TEXT,
    "branchName" TEXT,
    "hireDate" DATE,
    "employmentType" TEXT DEFAULT 'دوام كامل',
    status TEXT DEFAULT 'active',
    "endOfServiceDate" DATE,
    "baseSalary" NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    "netSalary" NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'YER',
    notes TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. جدول عقود العمل (Contracts)
CREATE TABLE IF NOT EXISTS public.contracts (
    id TEXT PRIMARY KEY,
    "contractNumber" TEXT UNIQUE NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT NOT NULL,
    "templateId" TEXT,
    "templateName" TEXT,
    "contractType" TEXT,
    status TEXT DEFAULT 'approved',
    version TEXT DEFAULT '1.0',
    "revisionCount" INTEGER DEFAULT 1,
    "issueDate" DATE,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    duration TEXT,
    "jobTitle" TEXT,
    department TEXT,
    "branchId" TEXT,
    "branchName" TEXT,
    workplace TEXT,
    "baseSalary" NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    "netSalary" NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'YER',
    "probationPeriod" TEXT,
    "workingHours" TEXT,
    "workingDays" TEXT,
    "noticePeriod" TEXT,
    notes TEXT,
    clauses JSONB DEFAULT '[]'::jsonb,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. جدول سجل العهد والأجهزة المركزي (Custodies)
CREATE TABLE IF NOT EXISTS public.custodies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    "serialNumber" TEXT,
    color TEXT,
    "estimatedValue" NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'YER',
    "branchId" TEXT,
    "branchName" TEXT,
    status TEXT DEFAULT 'available',
    "employeeId" TEXT,
    "employeeName" TEXT,
    "handoverDate" DATE,
    "purchaseDate" DATE,
    condition TEXT DEFAULT 'ممتاز',
    notes TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. جدول أسطول السيارات والمركبات (Vehicles)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    type TEXT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT,
    "plateNumber" TEXT NOT NULL,
    "chassisNumber" TEXT,
    "engineNumber" TEXT,
    color TEXT,
    odometer NUMERIC DEFAULT 0,
    "branchId" TEXT,
    "branchName" TEXT,
    status TEXT DEFAULT 'available',
    "assignedEmployeeId" TEXT,
    "assignedEmployeeName" TEXT,
    "handoverDate" DATE,
    "bodyCondition" TEXT,
    "tireCondition" TEXT,
    "fuelLevel" TEXT,
    "previousDamages" TEXT,
    "insuranceExpiry" DATE,
    "registrationExpiry" DATE,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. جدول محاضر الاستلام والإرجاع (Vouchers)
CREATE TABLE IF NOT EXISTS public.vouchers (
    id TEXT PRIMARY KEY,
    "voucherNumber" TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'handover' or 'return'
    date DATE NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "branchId" TEXT,
    "branchName" TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    declaration TEXT,
    "companyRepName" TEXT,
    "receivedByName" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. جدول شبكة الفروع (Branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone TEXT,
    "isMain" BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. جدول إعدادات الشركة وهوية الطرف الأول والشعار (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    "companyName" TEXT,
    "companyNameEn" TEXT,
    "firstPartyName" TEXT,
    "firstPartyRepName" TEXT,
    "firstPartyRepRole" TEXT,
    "commercialRegister" TEXT,
    "taxNumber" TEXT,
    "centralBankLicense" TEXT,
    headquarters TEXT,
    phone TEXT,
    "phoneSecondary" TEXT,
    email TEXT,
    "logoUrl" TEXT,
    "stampUrl" TEXT,
    "defaultProbationPeriod" TEXT,
    "defaultWorkingHours" TEXT,
    "defaultWorkingDays" TEXT,
    "defaultNoticePeriod" TEXT,
    "legalDisclaimer" TEXT,
    "requireAuthOnStart" BOOLEAN DEFAULT true,
    "supabaseConfig" JSONB DEFAULT '{}'::jsonb,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. جدول قوالب العقود (Contract Templates)
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    "clauseIds" JSONB DEFAULT '[]'::jsonb,
    "defaultProbation" TEXT,
    "defaultHours" TEXT,
    "defaultDays" TEXT,
    "defaultNotice" TEXT,
    "isDefault" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true
);

-- 9. جدول بنود العقود الـ 22 (Contract Clauses)
CREATE TABLE IF NOT EXISTS public.contract_clauses (
    id TEXT PRIMARY KEY,
    "order" INTEGER,
    "numberText" TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    "isMandatory" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true
);

-- 10. جدول مسيرات الرواتب (Salary Records)
CREATE TABLE IF NOT EXISTS public.salary_records (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "branchName" TEXT,
    "baseSalary" NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    "netSalary" NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'YER',
    status TEXT DEFAULT 'paid',
    "paymentDate" DATE,
    "paymentMethod" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- تفعيل سياسات الأمان للقراءة والكتابة (Enable RLS & Allow public access with anon key)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on custodies" ON public.custodies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on vouchers" ON public.vouchers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on contract_templates" ON public.contract_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on contract_clauses" ON public.contract_clauses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on salary_records" ON public.salary_records FOR ALL USING (true) WITH CHECK (true);
