/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * API Express — adaptée pour Vercel Serverless + Supabase PostgreSQL
 * Remplace server.ts (file-based DB) sans modifier le frontend React.
 */

import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Supabase client (service role — accès total, côté serveur uniquement)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DBJudicialMovement {
  id: string;
  chamber: string;
  case_type: string;
  code: string;
  backlog: number;
  registered: number;
  in_progress: number;
  judged: number;
  remaining: number;
  cr: number | null;
  dt: number | null;
  sheet_name: string;
  year: number;
  period_type: 'annual' | 'monthly' | 'cumulative';
  month: number | null;
  period_label: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DEFAULT_CASE_TYPES: Record<string, { label: string; code: string }> = {
  '2602': { label: 'جنحي استئنافي عادي', code: '2602' },
  '2635': { label: 'الجنح المستأنفة عنف ضد النساء سراح', code: '2635' },
  '2637': { label: 'الجنح المستأنفة عنف ضد الأطفال سراح', code: '2637' },
  '2707': { label: 'غرفة المشورة قضايا جنح مستأنفة عادي رشداء', code: '2707' },
  '2605': { label: 'حوادث السير استئنافي تلبسي', code: '2605' },
  '2606': { label: 'حوادث السير عادي', code: '2606' },
  '2702': { label: 'غرفة المشورة قضايا سير مستأنفة', code: '2702' },
  '2523': { label: 'دمج العقوبات', code: '2523' },
  '2524': { label: 'رد الاعتبار', code: '2524' },
  '2525': { label: 'استئناف أوامر قاضي التحقيق رشداء', code: '2525' },
  '2526': { label: 'استئناف أوامر تحقيق (المحاكم الابتدائية)', code: '2526' },
  '2527': { label: 'استئناف أوامر تحقيق أحداث', code: '2527' },
  '2601': { label: 'جنحي استئنافي تلبسي', code: '2601' },
  '2709': { label: 'غرفة المشورة قضايا جنح مستأنفة تلبسي', code: '2709' },
  '2603': { label: 'جنحات استئنافية للأحداث تلبسي', code: '2603' },
  '2604': { label: 'جنحات استئنافية للأحداث عادي', code: '2604' },
  '2608': { label: 'جنب أحداث حوادث السير', code: '2608' },
  '2609': { label: 'الجنايات الابتدائية رشداء سراح', code: '2609' },
  '2610': { label: 'الجنايات الابتدائية رشداء تلبسي', code: '2610' },
  '2639': { label: 'الجنايات الابتدائية عنف ضد النساء سراح', code: '2639' },
  '2640': { label: 'الجنايات الابتدائية عنف ضد النساء تلبسي', code: '2640' },
  '2611': { label: 'الجنايات الاستئنافية رشداء سراح', code: '2611' },
  '2612': { label: 'الجنايات الاستئنافية رشداء تلبسي', code: '2612' },
};

function getDaysInPeriod(year: number, periodType: string, month: number | null): number {
  if (periodType === 'annual') return 365;
  const m = month || 10;
  const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (periodType === 'monthly') return daysInMonths[m - 1] || 30;
  let total = 0;
  for (let i = 0; i < Math.min(m, 12); i++) total += daysInMonths[i];
  return total;
}

// ---------------------------------------------------------------------------
// App Express
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '10mb' }));

// ── 1. AUTH ─────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('active', true)
    .limit(1);

  const user = users?.[0];
  if (user && (user.password === password || (!user.password && user.username === password))) {
    res.json({
      success: true,
      token: `mock-token-${user.id}`,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, roleArabic: user.role_arabic },
    });
  } else {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

// ── 2. USERS ─────────────────────────────────────────────────────────────────
app.get('/api/users', async (_req: Request, res: Response) => {
  const { data } = await supabase.from('users').select('*').order('id');
  res.json(data || []);
});

app.post('/api/users/change-password', async (req: Request, res: Response) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword)
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' });

  const { data: users } = await supabase.from('users').select('*').eq('id', userId).limit(1);
  const user = users?.[0];
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if ((user.password || user.username) !== currentPassword)
    return res.status(403).json({ error: 'كلمة المرور الحالية غير صحيحة' });

  await supabase.from('users').update({ password: newPassword }).eq('id', userId);
  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
});

app.post('/api/users/:id/reset-password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId, newPassword } = req.body;
  if (!operatorId || !newPassword)
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' });

  const { data: ops } = await supabase.from('users').select('*').eq('id', operatorId).eq('active', true).limit(1);
  const operator = ops?.[0];
  if (!operator || !['SuperAdmin', 'Admin'].includes(operator.role))
    return res.status(403).json({ error: 'غير مسموح لك بتعديل كلمات المرور' });

  const { data: targets } = await supabase.from('users').select('*').eq('id', id).limit(1);
  const target = targets?.[0];
  if (!target) return res.status(404).json({ error: 'المستخدم المستهدف غير موجود' });
  if (target.role === 'SuperAdmin')
    return res.status(403).json({ error: 'غير مسموح بتعديل كلمة مرور المسؤول الأعلى' });

  await supabase.from('users').update({ password: newPassword }).eq('id', id);
  res.json({ success: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح' });
});

app.post('/api/users', async (req: Request, res: Response) => {
  const { username, name, role } = req.body;
  if (!username || !name || !role) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });

  const roleArabicMap: Record<string, string> = {
    SuperAdmin: 'المسؤول الأعلى', Admin: 'المدير', Manager: 'المسير', Visitor: 'الزائر',
  };
  const newUser = {
    id: `user-${Date.now()}`,
    username, name, role,
    role_arabic: roleArabicMap[role] || 'الزائر',
    active: true,
    password: username,
  };
  const { error } = await supabase.from('users').insert(newUser);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, user: newUser });
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, active } = req.body;
  const roleArabicMap: Record<string, string> = {
    SuperAdmin: 'المسؤول الأعلى', Admin: 'المدير', Manager: 'المسير', Visitor: 'الزائر',
  };
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (active !== undefined) updates.active = active;
  if (role !== undefined) { updates.role = role; updates.role_arabic = roleArabicMap[role] || 'الزائر'; }

  const { data } = await supabase.from('users').update(updates).eq('id', id).select().single();
  if (!data) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json({ success: true, user: data });
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// ── 3. UPLOAD EXCEL ──────────────────────────────────────────────────────────
app.post('/api/upload', async (req: Request, res: Response) => {
  const { filename, base64Data, uploadedBy } = req.body;
  if (!base64Data) return res.status(400).json({ error: 'ملف البيانات فارغ أو غير صالح' });

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const parsedMovements: DBJudicialMovement[] = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const items = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }) as Record<string, any>[];
      const cleanName = sheetName.trim();

      // Detect year
      let sheetYear = 2025;
      const year4Match = cleanName.match(/\b(202\d|201\d)\b/);
      if (year4Match) { sheetYear = parseInt(year4Match[1], 10); }
      else {
        const year2Match = cleanName.match(/[\-\/](2[3-9]|1[8-9])\b/);
        if (year2Match) sheetYear = 2000 + parseInt(year2Match[1], 10);
        else if (/^(2[3-9]|1[8-9])$/.test(cleanName)) sheetYear = 2000 + parseInt(cleanName, 10);
      }

      // Detect period type
      const isAnnual = /^20\d{2}$/.test(cleanName) || cleanName.includes('سنوي') || cleanName.includes('annual');
      const isCumulative = cleanName.startsWith('1-') || cleanName.includes('تراكمي') || cleanName.includes('cumul');
      let periodType: 'annual' | 'monthly' | 'cumulative' = 'monthly';
      let month: number | null = null;
      let periodLabel = sheetName;
      const monthNames = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

      if (isAnnual) {
        periodType = 'annual'; periodLabel = `سنوي ${sheetYear}`;
      } else if (isCumulative) {
        periodType = 'cumulative';
        const mm = cleanName.match(/-\s*(\d+)/) || cleanName.match(/\b(\d+)\b/);
        if (mm) { const p = parseInt(mm[1], 10); if (p >= 1 && p <= 12) month = p; }
        if (!month) month = 10;
        periodLabel = `تراكمي (${month} أشهر) ${sheetYear}`;
      } else {
        const parts = cleanName.split(/[\-\/]/);
        const firstNum = parts[0] ? parseInt(parts[0].trim(), 10) : NaN;
        if (!isNaN(firstNum) && firstNum >= 1 && firstNum <= 12) { month = firstNum; }
        else {
          const nm = cleanName.match(/\b(\d{1,2})\b/);
          if (nm) { const v = parseInt(nm[1], 10); if (v >= 1 && v <= 12) month = v; }
        }
        if (month) periodLabel = `${monthNames[month - 1]} ${sheetYear}`;
        else { month = 10; periodLabel = `شهري ${sheetYear}`; }
      }

      // Column detection
      let chamberIdx = 'B', typeIdx = 'C', codeIdx = 'D', backlogIdx = 'E',
          registeredIdx = 'F', progIdx = 'G', judgedIdx = 'H', remainingIdx = 'I';

      for (let r = 0; r < Math.min(items.length, 15); r++) {
        const row = items[r];
        Object.keys(row).forEach(k => {
          const v = String(row[k] || '').trim();
          if (v.includes('الهيئات') || v.includes('الهيآت')) chamberIdx = k;
          if (v.includes('نوعية القضايا') || v.includes('نوع القضية')) typeIdx = k;
          if (v.includes('الرمز')) codeIdx = k;
          if (v.includes('المخلف') || v.includes('مخلف')) backlogIdx = k;
          if (v.includes('المسجل') || v.includes('مسجل')) registeredIdx = k;
          if (v.includes('الرائج')) progIdx = k;
          if (v.includes('المحكوم') || v.includes('محكوم')) judgedIdx = k;
          if (v.includes('الباقي') || v.includes('المتبقي')) remainingIdx = k;
        });
      }

      items.forEach((row, rowIndex) => {
        const codeVal = String(row[codeIdx] || '').trim();
        const chamberName = String(row[chamberIdx] || '').trim();
        const caseTypeName = String(row[typeIdx] || '').trim();
        const isNumericCode = /^\d+$/.test(codeVal);
        const hasNumbers = !isNaN(parseInt(row[backlogIdx], 10)) || !isNaN(parseInt(row[registeredIdx], 10));
        const isHeaderRow = chamberName.includes('الهيئات') || chamberName.includes('الهيآت') || chamberName.includes('الرمز');
        const isTotalRow = chamberName.includes('المجموع') || caseTypeName.includes('المجموع');

        if ((isNumericCode || hasNumbers) && chamberName && !isHeaderRow && !isTotalRow) {
          const bl = parseInt(row[backlogIdx], 10) || 0;
          const reg = parseInt(row[registeredIdx], 10) || 0;
          const prog = parseInt(row[progIdx], 10) || (bl + reg);
          const judged = parseInt(row[judgedIdx], 10) || 0;
          const rem = parseInt(row[remainingIdx], 10) || Math.max(0, prog - judged);
          const cr = reg > 0 ? Math.round((judged / reg) * 100) : (judged === 0 && rem === 0 ? 100 : 0);
          const periodDays = getDaysInPeriod(sheetYear, periodType, month);
          const dt = judged > 0 ? Math.round((periodDays / judged) * rem) : null;

          let finalCode = codeVal;
          if (!isNumericCode) {
            const found = Object.keys(DEFAULT_CASE_TYPES).find(k => DEFAULT_CASE_TYPES[k].label === caseTypeName);
            finalCode = found || `999${rowIndex}`;
          }

          parsedMovements.push({
            id: `imported-${sheetName}-${rowIndex}-${finalCode}`,
            chamber: chamberName,
            case_type: caseTypeName || DEFAULT_CASE_TYPES[finalCode]?.label || 'قضية زجرية',
            code: finalCode,
            backlog: bl, registered: reg, in_progress: prog, judged, remaining: rem,
            cr, dt, sheet_name: sheetName, year: sheetYear, period_type: periodType, month, period_label: periodLabel,
          });
        }
      });
    });

    if (parsedMovements.length === 0)
      return res.status(400).json({ error: 'لم يتم العثور على أي بيانات قضائية صالحة في الملف المرفق.' });

    // Clear existing movements & insert new
    await supabase.from('movements').delete().neq('id', '');
    await supabase.from('movements').insert(parsedMovements);

    // Update import log
    await supabase.from('imports').update({ active: false }).neq('id', '');
    const logId = `import-${Date.now()}`;
    await supabase.from('imports').insert({
      id: logId, filename, uploaded_at: new Date().toISOString(),
      uploaded_by: uploadedBy || 'المسؤول', record_count: parsedMovements.length, active: true,
    });

    res.json({ success: true, count: parsedMovements.length });
  } catch (error: any) {
    res.status(500).json({ error: `حدث خطأ أثناء معالجة ملف الإكسل: ${error.message}` });
  }
});

// ── 4. MOVEMENTS & IMPORTS ───────────────────────────────────────────────────
app.get('/api/movements', async (_req: Request, res: Response) => {
  const { data } = await supabase.from('movements').select('*');
  // Remap snake_case → camelCase pour compatibilité frontend
  const mapped = (data || []).map((m: any) => ({
    id: m.id, chamber: m.chamber, caseType: m.case_type, code: m.code,
    backlog: m.backlog, registered: m.registered, inProgress: m.in_progress,
    judged: m.judged, remaining: m.remaining, cr: m.cr, dt: m.dt,
    sheetName: m.sheet_name, year: m.year, periodType: m.period_type,
    month: m.month, periodLabel: m.period_label,
  }));
  res.json(mapped);
});

app.get('/api/imports', async (_req: Request, res: Response) => {
  const { data } = await supabase.from('imports').select('*').order('uploaded_at', { ascending: false });
  const mapped = (data || []).map((i: any) => ({
    id: i.id, filename: i.filename, uploadedAt: i.uploaded_at,
    uploadedBy: i.uploaded_by, recordCount: i.record_count, active: i.active,
  }));
  res.json(mapped);
});

// ── 5. FORECAST ──────────────────────────────────────────────────────────────
app.get('/api/ai/forecast-data', async (_req: Request, res: Response) => {
  const { data: movs } = await supabase
    .from('movements')
    .select('*')
    .eq('period_type', 'monthly')
    .eq('year', 2025);

  const listByMonth: Record<number, { registered: number; judged: number; remaining: number }> = {};
  for (let m = 1; m <= 12; m++) listByMonth[m] = { registered: 0, judged: 0, remaining: 0 };

  (movs || []).forEach((m: any) => {
    if (m.month) {
      listByMonth[m.month].registered += m.registered;
      listByMonth[m.month].judged += m.judged;
      listByMonth[m.month].remaining += m.remaining;
    }
  });

  const monthNames = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const chartData = Object.keys(listByMonth).map(key => {
    const m = parseInt(key, 10);
    return {
      month: m, monthName: monthNames[m - 1],
      registered: listByMonth[m].registered,
      judged: listByMonth[m].judged,
      backlog: listByMonth[m].remaining,
      predicted: false,
    };
  }).filter(item => item.registered > 0 || item.month <= 10);

  const normMonths = chartData.filter(d => d.month !== 8 && d.registered > 0);
  let rSumX = 0, rSumY = 0, rSumXY = 0, rSumXSq = 0;
  const n = normMonths.length;
  normMonths.forEach(d => { rSumX += d.month; rSumY += d.registered; rSumXY += d.month * d.registered; rSumXSq += d.month * d.month; });
  const slope = n > 1 ? (n * rSumXY - rSumX * rSumY) / (n * rSumXSq - rSumX * rSumX) : 5;
  const intercept = n > 1 ? (rSumY - slope * rSumX) / n : 1000;
  const avgJudged = Math.round(normMonths.reduce((acc, d) => acc + d.judged, 0) / Math.max(n, 1));
  const lastBacklog = chartData[chartData.length - 1]?.backlog || 0;

  const predictions = [11, 12, 1].map((m, idx) => {
    const vIdx = m === 1 ? 13 : m;
    const predReg = Math.max(300, Math.round(slope * vIdx + intercept));
    const predRemaining = Math.max(100, Math.round(lastBacklog + (predReg - avgJudged) * (idx + 1)));
    return {
      month: m,
      monthName: m === 1 ? 'يناير 2026' : monthNames[m - 1],
      registered: predReg, judged: avgJudged, backlog: predRemaining, predicted: true,
    };
  });

  res.json({ history: chartData, forecast: predictions, paceExplanation: 'تم حساب التوقعات باستخدام نموذج الانحدار الخطي.' });
});

// ── 6. RECOMMENDATIONS ───────────────────────────────────────────────────────
app.get('/api/ai/recommendations', async (_req: Request, res: Response) => {
  const { data: movs } = await supabase.from('movements').select('*').eq('period_type', 'monthly').eq('month', 10);
  const chamberStats: Record<string, { cr: number; dt: number; registered: number; judged: number }> = {};

  (movs || []).forEach((m: any) => {
    if (!chamberStats[m.chamber]) chamberStats[m.chamber] = { cr: 0, dt: 0, registered: 0, judged: 0 };
    chamberStats[m.chamber].registered += m.registered;
    chamberStats[m.chamber].judged += m.judged;
    if (m.cr) chamberStats[m.chamber].cr = m.cr;
    if (m.dt) chamberStats[m.chamber].dt = m.dt;
  });

  const recommendations = Object.keys(chamberStats).map((chamber, idx) => {
    const s = chamberStats[chamber];
    let note = '', action = '', category: string;
    if (s.cr > 95 && s.dt < 40) { category = 'ممتاز'; note = 'أداء ممتاز يتطابق مع المعايير الذهبية.'; action = 'تعزيز المكتسبات المعرفية.'; }
    else if (s.cr > 75) { category = 'جيد'; note = 'أداء جيد ومؤشرات مستقرة.'; action = 'عقد جلسات حوارية مع النيابة العامة.'; }
    else if (s.cr > 50) { category = 'مقبول'; note = 'تراكم نسبي ملحوظ.'; action = 'اعتماد خطة رقمنة تواصلية.'; }
    else { category = 'حرج'; note = 'مؤشر تصفية حرج.'; action = 'تخصيص جلسات استثنائية فورية.'; }
    return { id: `rec-${idx}`, chamber, cr: s.cr || 50, dt: s.dt || 90, category, note, action };
  });

  res.json(recommendations);
});

// ── 7. AI CHAT ───────────────────────────────────────────────────────────────
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'مصفوفة رسائل غير صالحة' });

  const { data: settingsRows } = await supabase.from('settings').select('*').eq('id', 1).single();
  const settings = settingsRows as any;
  if (!settings?.ai_api_key) {
    return res.json({ reply: 'لم يتم تفعيل مفتاح الـ API للذكاء الاصطناعي بعد. يرجى تهيئة المفتاح في الإعدادات.' });
  }

  const { data: movs } = await supabase.from('movements').select('registered,judged');
  const totalRegistered = (movs || []).reduce((a: number, m: any) => a + (m.registered || 0), 0);
  const totalJudged = (movs || []).reduce((a: number, m: any) => a + (m.judged || 0), 0);

  const systemPrompt = `أنت الخبير القضائي والمساعد الذكي لمحكمة الاستئناف بآسفي المغربية.
تجيب دائماً باللغة العربية الفصحى الرسمية القضائية.
- إجمالي القضايا المسجلة: ${totalRegistered}
- إجمالي القضايا المحكومة: ${totalJudged}
${settings.ai_system_prompt ? '\nتوجيهات إضافية:\n' + settings.ai_system_prompt : ''}`;

  const lastMsg = messages[messages.length - 1];
  const userText = lastMsg?.text || lastMsg?.content || '';

  try {
    if (settings.ai_provider === 'gemini') {
      const aiClient = new GoogleGenAI({ apiKey: settings.ai_api_key });
      const chat = aiClient.chats.create({ model: settings.ai_model_name || 'gemini-1.5-flash', config: { systemInstruction: systemPrompt } });
      const response = await chat.sendMessage({ message: userText });
      return res.json({ reply: response.text });
    }

    // OpenAI-compatible
    const endpoint = settings.ai_endpoint || 'https://api.openai.com/v1/chat/completions';
    const formatted = [{ role: 'system', content: systemPrompt }];
    messages.slice(-6).forEach((m: any) => {
      const content = m.text || m.content;
      if (content) formatted.push({ role: m.sender === 'user' ? 'user' : 'assistant', content });
    });
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.ai_api_key}` },
      body: JSON.stringify({ model: settings.ai_model_name, messages: formatted, temperature: 0.7 }),
    });
    const data = await r.json();
    res.json({ reply: data.choices?.[0]?.message?.content || 'فشل التوليد.' });
  } catch (e: any) {
    res.status(500).json({ error: `خطأ في الذكاء الاصطناعي: ${e.message}` });
  }
});

// ── 8. DOWNLOAD TEMPLATE ─────────────────────────────────────────────────────
app.get('/api/download-template', async (_req: Request, res: Response) => {
  const { data: movs } = await supabase.from('movements').select('*');
  const wb = XLSX.utils.book_new();
  const sheetsData: Record<string, any[]> = {};
  (movs || []).forEach((m: any) => {
    if (!sheetsData[m.sheet_name]) sheetsData[m.sheet_name] = [];
    sheetsData[m.sheet_name].push({
      'الهيئات': m.chamber, 'نوعية القضايا': m.case_type, 'الرمز': m.code,
      'المخلف': m.backlog, 'المسجل': m.registered, 'الرائج': m.in_progress,
      'المحكوم': m.judged, 'الباقي': m.remaining, 'CR (%)': m.cr || 0, 'DT (يوم)': m.dt || 0,
    });
  });
  Object.keys(sheetsData).forEach(name => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetsData[name]), name));
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="CA_Stat_Safi.xlsx"');
  res.end(buffer);
});

// ── 9. SETTINGS ──────────────────────────────────────────────────────────────
app.get('/api/settings', async (_req: Request, res: Response) => {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  const s = data as any;
  if (!s) return res.status(500).json({ error: 'إعدادات غير موجودة' });

  const { data: movs } = await supabase.from('movements').select('registered,judged');
  res.json({
    institutionName: s.institution_name, periodEnd: s.period_end, logoUrl: s.logo_url,
    aiProvider: s.ai_provider, aiApiKey: s.ai_api_key, aiModelName: s.ai_model_name,
    aiEndpoint: s.ai_endpoint, aiSystemPrompt: s.ai_system_prompt,
    statsSummary: {
      registeredCount: (movs || []).reduce((a: number, m: any) => a + (m.registered || 0), 0),
      judgedCount: (movs || []).reduce((a: number, m: any) => a + (m.judged || 0), 0),
    },
  });
});

app.post('/api/settings', async (req: Request, res: Response) => {
  const { institutionName, periodEnd, aiProvider, aiApiKey, aiModelName, aiEndpoint, aiSystemPrompt } = req.body;
  const updates: Record<string, any> = {};
  if (institutionName !== undefined) updates.institution_name = institutionName;
  if (periodEnd !== undefined) updates.period_end = periodEnd;
  if (aiProvider !== undefined) updates.ai_provider = aiProvider;
  if (aiApiKey !== undefined) updates.ai_api_key = aiApiKey;
  if (aiModelName !== undefined) updates.ai_model_name = aiModelName;
  if (aiEndpoint !== undefined) updates.ai_endpoint = aiEndpoint;
  if (aiSystemPrompt !== undefined) updates.ai_system_prompt = aiSystemPrompt;
  await supabase.from('settings').update(updates).eq('id', 1);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Export pour Vercel Serverless
// ---------------------------------------------------------------------------
export default app;
