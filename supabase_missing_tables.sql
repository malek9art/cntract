-- =========================================================================
-- شركة أبو حذيفة للصرافة والتحويلات - ترقية قواعد بيانات Supabase المفقودة
-- Phase 1: إنشاء الجداول الأربعة التي كان النظام يستخدمها محلياً فقط
-- =========================================================================
-- هذه الأربعة جداول مطلوبة للمزامنة السحابية الشاملة:
--   documents           → المستندات المرفوعة
--   audit_logs          → سجل العمليات والتدقيق
--   contract_revisions  → إصدارات العقود المؤرشفة
--   custody_transactions→ حركة العهد (تسليم / إرجاع / تلف)
--
-- الطريقة: Supabase Dashboard > SQL Editor > الصق المحتوى > Run
-- آمن لإعادة التشغيل (IF NOT EXISTS) ولن يمس أي بيانات موجودة.
-- =========================================================================

-- 1. جدول المستندات والمرفقات
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "relatedName" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" TEXT,
    "dataUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. جدول سجل التدقيق
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT,
    module TEXT,
    "recordId" TEXT,
    description TEXT,
    "user" TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. جدول إصدارات العقود
CREATE TABLE IF NOT EXISTS public.contract_revisions (
    id TEXT PRIMARY KEY,
    "contractId" TEXT,
    "contractNumber" TEXT,
    version TEXT,
    snapshot JSONB DEFAULT '{}'::jsonb,
    reason TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. جدول حركة العهد
CREATE TABLE IF NOT EXISTS public.custody_transactions (
    id TEXT PRIMARY KEY,
    "custodyId" TEXT,
    "custodyName" TEXT,
    "employeeId" TEXT,
    "employeeName" TEXT,
    type TEXT,
    date DATE,
    "voucherId" TEXT,
    "voucherNumber" TEXT,
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- تفعيل RLS لهذه الجداول فقط للمستخدمين المسجلين (authenticated)
-- لا يتم إنشاء أي سياسة anon إطلاقاً.
-- =========================================================================
DO $$
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY[
        'documents',
        'audit_logs',
        'contract_revisions',
        'custody_transactions'
    ];
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

            EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %s" ON public.%I;', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated all on %s" ON public.%I;', t, t);

            EXECUTE format(
                'CREATE POLICY "Allow authenticated all on %s" ON public.%I
                 FOR ALL TO authenticated
                 USING (true) WITH CHECK (true);', t, t);

            RAISE NOTICE 'RLS hardened for table: %', t;
        END IF;
    END LOOP;
END $$;
