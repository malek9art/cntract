# تفعيل النشر الآلي مع حقن أسرار GitHub

> ⚠️ **لماذا هذا الملف هنا وليس في `.github/workflows/`؟**
> صلاحيات الوصول المستخدمة في هذه الجلسة لا تسمح بدفع ملفات `workflow` إلى GitHub.
> لذلك تم وضع نسخة جاهزة من الـ workflow هنا، وعليك نقلها بنفسك (خطوة واحدة).

## الطريقة الأولى: من سطر الأوامر

```bash
mkdir -p .github/workflows
cp deploy/github-pages-workflow.yml .github/workflows/deploy-pages.yml
git add .github/workflows/deploy-pages.yml
git commit -m "ci: add GitHub Pages deploy workflow with Supabase secret injection"
git push
```

## الطريقة الثانية: من واجهة GitHub

1. افتح المستودع على GitHub ← **Add file** ← **Create new file**.
2. اكتب في خانة الاسم: `.github/workflows/deploy-pages.yml`
3. الصق محتوى الملف `deploy/github-pages-workflow.yml` بالكامل.
4. **Commit new file**.

---

## بعد إضافة الـ workflow — خطوتان إلزاميتان

### 1) أسرار المستودع
**Settings ← Secrets and variables ← Actions ← New repository secret**

| الاسم | القيمة |
|---|---|
| `SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | مفتاح `anon` `public` من Project Settings ← API |

### 2) مصدر النشر
**Settings ← Pages ← Build and deployment ← Source = `GitHub Actions`**

> حالياً المستودع مضبوط على `Deploy from a branch`، وهذا الوضع ينشر ملف `env.js`
> الفارغ بدون حقن المفاتيح — وهو السبب الجذري لفشل تسجيل الدخول.

بعدها شغّل النشر من: **Actions ← Build & Deploy to GitHub Pages ← Run workflow**.
