# خطوتان لتشغيل النظام ✅

## الوضع الحالي (تم فحصه عبر GitHub API)

| العنصر | الحالة |
|---|---|
| مصدر النشر = GitHub Actions | ✅ تم |
| `supabase_rls_hardening.sql` | ✅ تم |
| أسرار `SUPABASE_URL` / `SUPABASE_ANON_KEY` | ✅ مضافة |
| **إصلاحات الكود مدمجة في `main`** | ❌ **لا** — ما زالت في فرع الـ PR فقط |
| **workflow يحقن الأسرار في `env.js`** | ❌ **لا** — الملفان الموجودان قالبان افتراضيان لا يحقنان شيئاً |

لذلك الموقع المنشور حالياً يعمل بالكود القديم وبملف `env.js` **فارغ**، وتسجيل الدخول ما زال يفشل.

---

## ما الذي حدث بالضبط؟

الأسطر الثلاثة التالية كانت **أوامر تُنفَّذ في الطرفية (Terminal)**، وليست محتوى ملف:

```bash
mkdir -p .github/workflows
cp deploy/github-pages-workflow.yml .github/workflows/deploy-pages.yml
git add .github/workflows/deploy-pages.yml && git commit -m "ci: deploy workflow" && git push
```

تم لصقها داخل الملف `deploy/github-pages-workflow.yml`، فاستُبدل محتوى الـ workflow
الحقيقي بها. لذلك تخلّينا عن هذا المسار تماماً — **الطريقة الجديدة أبسط ولا تحتاج طرفية إطلاقاً.**

---

# الخطوة 1 — ادمج الـ Pull Request

كل إصلاحات تسجيل الدخول موجودة في فرع `arena/01a05a74-cntract` ولم تصل إلى `main` بعد.

1. افتح تبويب **Pull requests** في المستودع.
2. افتح الـ PR بعنوان *«إصلاح تسجيل الدخول والربط السحابي عبر أسرار GitHub»*.
3. اضغط **Merge pull request** ← **Confirm merge**.

---

# الخطوة 2 — استبدل محتوى `static.yml`

> تحتاج ذلك لأن أذونات هذه الجلسة لا تسمح لي بتعديل ملفات `workflow` بنفسي.

1. افتح في المتصفح:
   `https://github.com/malek9art/cntract/blob/main/.github/workflows/static.yml`
2. اضغط أيقونة **القلم ✏️ (Edit this file)**.
3. **احذف كل المحتوى** (Ctrl+A ثم Delete).
4. افتح الملف `deploy/static.yml` من هذا المستودع، وانسخ محتواه **كاملاً**، والصقه مكانه.
5. اضغط **Commit changes**.

## ثم احذف الـ workflow المكرر

يوجد ملف ثانٍ ينشر الموقع في نفس الوقت ويتعارض مع الأول (لاحظ أن أحد التشغيلات
ظهر بحالة `cancelled` بسبب ذلك)، وهو مخصص لمواقع Jekyll ولا علاقة له بمشروعك:

1. افتح `https://github.com/malek9art/cntract/blob/main/.github/workflows/jekyll-gh-pages.yml`
2. القائمة **⋯** ← **Delete file** ← **Commit changes**.

(اختياري: احذف أيضاً `deploy/github-pages-workflow.yml` فمحتواه الآن مجرد أوامر ملصقة بالخطأ.)

---

# الخطوة 3 — تحقق من النجاح

بعد الـ merge سيبدأ النشر تلقائياً. راقبه من تبويب **Actions**:

- ✅ ستجد في سجل التشغيل خطوة `Generate env.js from repository secrets`
  تطبع المضيف مثل `abcdefgh.supabase.co` والمفتاح مُقنَّعاً `********`.
- ❌ إذا فشل عند `Verify required repository secrets` فالسبب سرّ ناقص أو فارغ.

ثم افتح الموقع: `https://malek9art.github.io/cntract/`

| ما تراه | المعنى |
|---|---|
| شريط **أخضر**: «الاتصال بقاعدة البيانات السحابية جاهز» | ✅ كل شيء تمام — سجّل الدخول |
| شريط **أحمر**: «الخدمة السحابية غير مُهيّأة» | لم تُحقن المفاتيح — راجع سجل Actions |
| شريط **أصفر** | لا يوجد اتصال إنترنت |

> إن ظهرت لك الشاشة القديمة، اعمل تحديثاً قسرياً مرة واحدة (Ctrl+Shift+R).
> بعدها يتولى النظام تحديث نفسه تلقائياً عند كل نشر جديد.

للتأكد النهائي: **الإعدادات ← ربط قاعدة بيانات Supabase ← فحص الاتصال بقاعدة البيانات السحابية**.
