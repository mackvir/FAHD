# منصة الإحصاء الزجري — محكمة الاستئناف بآسفي
## Judicial Penal Statistics Platform — Court of Appeal of Safi

---

### معلومات الملكية والتطوير / Ownership & Development
- **المطور الوحيد / Développeur Exclusif :** **عبد المغيث شليح (Abdelmoghit CHLIH)**
- **البريد الإلكتروني / Email :** [AbdelmoghitCHLIH@gmail.com](mailto:AbdelmoghitCHLIH@gmail.com)
- **حقوق الملكية الفكرية / Intellectual Property :** جميع الحقوق محفوظة © عبد المغيث شليح (Abdelmoghit CHLIH).
- **الترخيص / Licence :** ترخيص مغلق وحصري (Proprietary & Confidential). يُحظر تماماً تعديل هذا الرمز، نسخه، تداوله أو نسبه لأي طرف آخر دون موافقة كتابية صريحة من المطور.

---

### نظرة عامة على المنصة
منصة رقمية متقدمة مخصصة لتحليل وتصور الإحصاءات الزجرية لمحكمة الاستئناف بآسفي، ومعالجة مؤشرات الأداء والنجاعة القضائية (Clearance Rate & Disposition Time)، والتحليل التنبؤي للنشاط القضائي.

---

### التشغيل المحلي (Local Development)

1. **تثبيت الحزم البرمجية :**
   ```bash
   npm install
   ```

2. **تهيئة المتغيرات البيئية :**
   قم بضبط متغيرات الاتصال بقاعدة بيانات Supabase في ملف `.env` :
   ```env
   SUPABASE_URL=https://xxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=xxxxxxxx
   PORT=3000
   NODE_ENV=development
   ```

3. **تشغيل المنصة :**
   ```bash
   npm run dev
   ```
   المنصة تعمل على الرابط المحلي: `http://localhost:3000`
