# خطوة واحدة متبقية لتشغيل النظام

## ✅ ما تم إنجازه

| العنصر | الحالة |
|---|---|
| مصدر النشر = GitHub Actions | ✅ |
| `supabase_rls_hardening.sql` | ✅ |
| أسرار `SUPABASE_URL` / `SUPABASE_ANON_KEY` | ✅ |
| دمج إصلاحات تسجيل الدخول في `main` (PR #2 و #3) | ✅ |
| الموقع منشور بالكود الجديد | ✅ |

## ❌ ما تبقّى

ملف `.github/workflows/static.yml` الحالي هو **قالب GitHub الافتراضي**: يرفع ملفات
المستودع كما هي دون تنفيذ أي خطوة بناء. النتيجة أن `env.js` يُنشر **فارغاً**، فلا تصل
المفاتيح إلى المتصفح ويبقى تسجيل الدخول متعذراً.

> لا أستطيع تعديل هذا الملف بنفسي: أذونات هذه الجلسة تمنع تعديل ملفات `workflow`
> (يرفضها GitHub برسالة `refusing to allow a GitHub App to update workflow ... without workflows permission`).

---

# الخطوة المتبقية (٣ دقائق، بالمتصفح فقط)

## 1) استبدل محتوى `static.yml`

1. افتح: `https://github.com/malek9art/cntract/blob/main/.github/workflows/static.yml`
2. اضغط أيقونة **القلم ✏️** (Edit this file).
3. حدّد كل المحتوى واحذفه (**Ctrl+A** ثم **Delete**).
4. افتح `deploy/static.yml` من نفس المستودع، وانسخ محتواه **كاملاً**، والصقه مكانه.
5. **Commit changes**.

## 2) احذف الـ workflow المكرر

ملف `jekyll-gh-pages.yml` ينشر الموقع بالتوازي ويتنافس على نفس مجموعة النشر
(`concurrency: pages`)، وهو مخصص أصلاً لمواقع Jekyll ولا علاقة له بمشروعك:

1. افتح: `https://github.com/malek9art/cntract/blob/main/.github/workflows/jekyll-gh-pages.yml`
2. القائمة **⋯** ← **Delete file** ← **Commit changes**.

---

# التحقق من النجاح

بعد الـ Commit سيبدأ النشر تلقائياً. افتح تبويب **Actions** ← آخر تشغيل لـ
*Deploy static content to Pages*:

- ✅ يجب أن تظهر خطوة **`Generate env.js from repository secrets`**
  وتطبع المضيف (مثل `abcdefgh.supabase.co`) مع المفتاح مُقنَّعاً `********`.
- ❌ فشل عند **`Verify required repository secrets`** ⇽ سرّ ناقص أو فارغ أو
  `SUPABASE_URL` لا يبدأ بـ `https://`.
- ❌ فشل عند **`Sanity check`** ⇽ لم يُحقن شيء في `env.js`.

ثم افتح: `https://malek9art.github.io/cntract/`

| شريط الحالة في شاشة الدخول | المعنى |
|---|---|
| 🟢 «الاتصال بقاعدة البيانات السحابية جاهز» | كل شيء تمام — سجّل الدخول |
| 🔴 «الخدمة السحابية غير مُهيّأة في هذه النسخة» | المفاتيح لم تُحقن — راجع سجل Actions |
| 🟡 «لا يوجد اتصال بالإنترنت» | مشكلة شبكة لدى الجهاز |

> عند أول فتح بعد النشر اعمل تحديثاً قسرياً مرة واحدة (**Ctrl+Shift+R**) للتخلص من
> النسخة المخزّنة القديمة. بعدها يتولى النظام تحديث نفسه تلقائياً عند كل نشر.

للتأكيد النهائي من داخل النظام:
**الإعدادات ← ربط قاعدة بيانات Supabase ← فحص الاتصال بقاعدة البيانات السحابية**.

---

## إن لم يظهر لك المستخدم أو فشل الدخول

- **«البريد الإلكتروني أو كلمة المرور غير صحيحة»** ⇽ أنشئ المستخدم من
  Supabase ← Authentication ← Users ← **Add user** مع تفعيل *Auto Confirm User*.
- **«لم يتم تأكيد البريد الإلكتروني»** ⇽ عطّل *Confirm email* من
  Authentication ← Providers ← Email.
- **رابط إعادة تعيين كلمة المرور لا يعمل** ⇽ أضف
  `https://malek9art.github.io/cntract/` في
  Authentication ← URL Configuration ← **Site URL** و **Redirect URLs**.
