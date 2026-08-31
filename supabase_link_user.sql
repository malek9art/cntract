-- =========================================================================
-- شركة أبو حذيفة للصرافة والتحويلات - سكريبت ربط وترقية المستخدم في Supabase (مصحح)
-- UID المستهدف: ffa2488c-57f0-46bf-8e83-5f166299119b
-- البريد الإلكتروني: abuhdyfh@gmail.com
-- =========================================================================

-- 1. تأكيد البريد الإلكتروني وترقية صلاحيات المستخدم إلى مدير عام في auth.users
-- ملاحظة: confirmed_at هو عمود يتم توليده تلقائياً من email_confirmed_at
UPDATE auth.users
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"], "role": "admin", "is_super_admin": true}'::jsonb,
    raw_user_meta_data = raw_user_meta_data || '{"full_name": "أبو حذيفة (المدير العام)", "role": "admin", "company": "شركة أبو حذيفة للصرافة والتحويلات"}'::jsonb
WHERE id = 'ffa2488c-57f0-46bf-8e83-5f166299119b'
   OR email = 'abuhdyfh@gmail.com';

-- 2. إنشاء جدول ملفات المستخدمين والصلاحيات (Profiles) وربطه بالـ UID
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT 'أبو حذيفة (المدير العام)',
    role TEXT NOT NULL DEFAULT 'admin',
    company TEXT NOT NULL DEFAULT 'شركة أبو حذيفة للصرافة والتحويلات',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. إدراج أو تحديث ملف المستخدم الخاص بالـ UID المحدد
INSERT INTO public.profiles (id, email, "fullName", role, company, "isActive")
VALUES (
    'ffa2488c-57f0-46bf-8e83-5f166299119b',
    'abuhdyfh@gmail.com',
    'أبو حذيفة (المدير العام)',
    'admin',
    'شركة أبو حذيفة للصرافة والتحويلات',
    true
)
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    "fullName" = EXCLUDED."fullName",
    role = EXCLUDED.role,
    company = EXCLUDED.company,
    "isActive" = true,
    "updatedAt" = now();

-- 4. ربط الـ UID في جدول إعدادات الشركة كمالك ومسؤول معتمد
INSERT INTO public.settings (id, "companyName", "firstPartyName", "firstPartyRepName", "firstPartyRepRole", "requireAuthOnStart", "updatedAt")
VALUES (
    'company_settings',
    'شركة أبو حذيفة للصرافة والتحويلات',
    'شركة أبو حذيفة للصرافة والتحويلات',
    'أبو حذيفة (المدير العام)',
    'المدير العام التنفيذي',
    true,
    now()
)
ON CONFLICT (id) DO UPDATE
SET 
    "firstPartyRepName" = 'أبو حذيفة (المدير العام)',
    "updatedAt" = now();

-- 5. تفعيل سياسات الأمان الكاملة لجدول Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access on profiles" ON public.profiles;
CREATE POLICY "Allow authenticated full access on profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read profiles" ON public.profiles;
CREATE POLICY "Allow anon read profiles" 
ON public.profiles FOR SELECT 
TO anon 
USING (true);
