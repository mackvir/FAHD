# دليل النشر على Vercel + Supabase

## المتطلبات
- حساب [Vercel](https://vercel.com) (مجاني)
- حساب [Supabase](https://supabase.com) (مجاني)
- Git مثبّت على جهازك

---

## الخطوة 1 — إعداد Supabase

1. سجّل دخولك على [supabase.com](https://supabase.com) → **New Project**
2. اختر اسماً للمشروع وكلمة مرور قاعدة البيانات
3. انتظر حتى ينتهي الإنشاء (~2 دقيقة)
4. انتقل إلى **SQL Editor** → **New Query**
5. انسخ محتوى ملف `supabase-schema.sql` والصقه → **Run**
6. انتقل إلى **Project Settings → API**:
   - انسخ **Project URL** → هذا هو `SUPABASE_URL`
   - انسخ **service_role** secret key → هذا هو `SUPABASE_SERVICE_ROLE_KEY`

---

## الخطوة 2 — رفع الكود على Git

```bash
# داخل مجلد المشروع منصة-الإحصاء-الزجري
git init
git add .
git commit -m "initial: judicial stats platform"

# أنشئ مستودعاً على GitHub/GitLab ثم:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## الخطوة 3 — ربط Vercel بالمستودع

1. سجّل دخولك على [vercel.com](https://vercel.com) → **Add New Project**
2. اختر مستودع Git الذي رفعت إليه الكود
3. في **Configure Project**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build` ← (موجود في vercel.json تلقائياً)
   - **Output Directory**: `dist`
4. انتقل إلى **Environment Variables** وأضف:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |

5. اضغط **Deploy** ✓

---

## الخطوة 4 — تشغيل محلي (للتطوير)

```bash
# نسخ متغيرات البيئة
cp .env.example .env
# عبّئ SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف .env

# تثبيت التبعيات
npm install

# تشغيل الخادم (Express + Supabase)
npm run dev
# في نافذة ثانية: يبدأ Vite تلقائياً على port 5173 مع proxy نحو :3000
```

---

## ملاحظات هامة

- **البيانات**: عند أول نشر، قاعدة البيانات تحتوي على المستخدمين الافتراضيين فقط (admin/admin). لاستيراد البيانات، سجّل دخولك كـ SuperAdmin وارفع ملف Excel.
- **مفتاح AI**: يُضبط من داخل واجهة التطبيق (إعدادات SuperAdmin) — لا حاجة لإضافته في Vercel.
- **النطاق**: بعد النشر، Vercel يمنحك رابطاً مثل `your-project.vercel.app`. يمكنك ربط نطاق مخصص من لوحة Vercel.
