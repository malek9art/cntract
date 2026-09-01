-- =========================================================================
-- شركة أبو حذيفة للصرافة والتحويلات
-- تقوية سياسات الأمان (RLS Hardening) - اختياري لكن موصى به بشدة
-- =========================================================================
--
-- ⚠️ المشكلة الأمنية في السياسات الحالية:
--    السياسات المنشأة في supabase_schema.sql تستخدم:  USING (true)
--    وهذا يعني أن أي شخص يملك المفتاح العام (Anon Key) — وهو مفتاح
--    ظاهر داخل الصفحة في المتصفح بحكم طبيعته — يستطيع قراءة وتعديل
--    وحذف كل بيانات الموظفين والعقود والرواتب بدون تسجيل دخول إطلاقاً.
--
-- ✅ الحل: قصر الوصول على المستخدمين المسجلين دخولهم فقط (authenticated)
--    بحيث يصبح المفتاح العام عديم الفائدة بدون جلسة مصادقة صحيحة.
--
-- طريقة التشغيل: Supabase Dashboard > SQL Editor > الصق المحتوى > Run
-- =========================================================================

DO $$
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY[
        'settings',
        'branches',
        'contract_clauses',
        'contract_templates',
        'employees',
        'contracts',
        'custodies',
        'vehicles',
        'vouchers',
        'salary_records',
        'documents',
        'audit_logs',
        'contract_revisions',
        'custody_transactions',
        'profiles'
    ];
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

            -- إزالة السياسات المفتوحة القديمة التي تسمح للمفتاح العام بكل شيء
            EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %s" ON public.%I;', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated all on %s" ON public.%I;', t, t);

            -- السماح فقط للمستخدمين الذين سجّلوا الدخول عبر Supabase Auth
            EXECUTE format(
                'CREATE POLICY "Allow authenticated all on %s" ON public.%I
                 FOR ALL TO authenticated
                 USING (true) WITH CHECK (true);', t, t);

            RAISE NOTICE 'RLS hardened for table: %', t;
        END IF;
    END LOOP;
END $$;

-- =========================================================================
-- التحقق من النتيجة: يجب ألا يظهر أي دور anon في العمود roles
-- =========================================================================
SELECT
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
