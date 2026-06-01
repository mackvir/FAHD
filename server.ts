/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'server_db.json');

// Initialize Gemini SDK with telemetry header (Statically none - configured in settings dynamically by SuperAdmin)
const ai = null;

// Increase body limit to handle large Base64 Excel files
app.use(express.json({ limit: '10mb' }));

// Helper types matching types.ts
interface DatabaseUser {
  id: string;
  username: string;
  name: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Visitor';
  roleArabic: string;
  active: boolean;
  password?: string;
}

interface DBJudicialMovement {
  id: string;
  chamber: string;
  caseType: string;
  code: string;
  backlog: number;
  registered: number;
  inProgress: number;
  judged: number;
  remaining: number;
  cr: number | null;
  dt: number | null;
  sheetName: string;
  year: number;
  periodType: 'annual' | 'monthly' | 'cumulative';
  month: number | null;
  periodLabel: string;
}

interface DBImportHistory {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  active: boolean;
}

interface AppDatabase {
  users: DatabaseUser[];
  imports: DBImportHistory[];
  movements: DBJudicialMovement[];
  settings: {
    institutionName: string;
    logoUrl: string | null;
    periodEnd: string;
    aiProvider?: string;
    aiApiKey?: string;
    aiModelName?: string;
    aiEndpoint?: string;
    aiSystemPrompt?: string;
  };
}

// Default Seed Data
const DEFAULT_CHAMBERS = [
  'الجنحي العادي المستأنف يوم الاثنين',
  'الجنحي حوادث السير المستأنف يوم الاثنين',
  'الجنحي حوادث السير المستأنف يوم الخميس',
  'الغرفة الجنحية يوم الاثنين',
  'الجنحي العادي وحوادث السير بعد النقض يوم الثلاثاء',
  'الجنح الاستئنافية معتقلين رشداء يوم الثلاثاء',
  'الجنح الاستئنافية للأحداث يوم الثلاثاء',
  'غرفة الجنايات الاستئنافية رشداء وعنف ضد الاطفال والنساء',
  'غرفة الجنايات الابتدائية رشداء وعنف ضد الاطفال والنساء'
];

const DEFAULT_CASE_TYPES: Record<string, { label: string; code: string }> = {
  '2602': { label: 'جنحي استئنافي عادي', code: '2602' },
  '2635': { label: 'الجنح المستأنفة عنف ضد النساء سراح', code: '2635' },
  '2637': { label: 'الجنح المستأنفة عنف ضد األطفال سراح', code: '2637' },
  '2707': { label: 'غرفة المشورة قضايا جنح مستأنفة عادي رشداء', code: '2707' },
  '2605': { label: 'حوادث السير استئنافي تلبسي', code: '2605' },
  '2606': { label: 'حوادث السير عادي', code: '2606' },
  '2702': { label: 'غرفة المشورة قضايا سير مستأنفة', code: '2702' },
  '2523': { label: 'دمج العقوبات', code: '2523' },
  '2524': { label: 'رد اإلعتبار', code: '2524' },
  '2525': { label: 'إستئناف أوامر قاضي التحقيق رشداء', code: '2525' },
  '2526': { label: 'إستئناف أوامر تحقيق (المحاكم الابتدائية)', code: '2526' },
  '2527': { label: 'إستئناف أوامر تحقيق أحداث', code: '2527' },
  '2601': { label: 'جنحي استئنافي تلبسي', code: '2601' },
  '2709': { label: 'غرفة المشورة قضايا جنح مستأنفة تلبسي', code: '2709' },
  '2603': { label: 'جنحات إستئنافية للأحداث تلبسي', code: '2603' },
  '2604': { label: 'جنحات إستئنافية للأحداث عادي', code: '2604' },
  '2608': { label: 'جنب أحداث حوادث السير', code: '2608' },
  '2609': { label: 'الجنايات الإبتدائية رشداء سراح', code: '2609' },
  '2610': { label: 'الجنايات الإبتدائية رشداء تلبسي', code: '2610' },
  '2639': { label: 'الجنايات الابتدائية عنف ضد النساء سراح', code: '2639' },
  '2640': { label: 'الجنايات الابتدائية عنف ضد النساء تلبسي', code: '2640' },
  '2611': { label: 'الجنايات الإستئنافية رشداء سراح', code: '2611' },
  '2612': { label: 'الجنايات الإستئنافية رشداء تلبسي', code: '2612' },
};

function getDaysInPeriod(year: number, periodType: 'annual' | 'monthly' | 'cumulative', month: number | null): number {
  if (periodType === 'annual') {
    return 365;
  }
  
  const m = month || 10; // default to Oct
  
  if (periodType === 'monthly') {
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonths[m - 1] || 30;
  }
  
  if (periodType === 'cumulative') {
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let totalDays = 0;
    for (let i = 0; i < Math.min(m, 12); i++) {
      totalDays += daysInMonths[i];
    }
    return totalDays; // e.g., 10 months YTD = 304 days
  }
  
  return 304; 
}

function generateSeedMovements(): DBJudicialMovement[] {
  const list: DBJudicialMovement[] = [];
  
  // 1. Year 2023 (Annual)
  // Total: 10410 registered, 9773 judged, backlog start=1230, final=1824, CR=84%, DT=68
  let runningBacklog = 1230;
  DEFAULT_CHAMBERS.forEach((chamber, index) => {
    // Generate detail cases
    const codes = index % 2 === 0 ? ['2602', '2605', '2611'] : ['2601', '2610', '2525'];
    codes.forEach(code => {
      const entry = DEFAULT_CASE_TYPES[code] || { label: 'قضية جنائية', code };
      const bl = Math.floor(runningBacklog / 18) + (index * 5);
      const reg = Math.floor(10410 / 27) + (index * 15);
      const prog = bl + reg;
      const jug = Math.floor(prog * 0.84);
      const rem = prog - jug;
      const cr = reg > 0 ? Math.round((jug / reg) * 100) : (jug === 0 && rem === 0 ? 100 : 0);
      const dt = jug > 0 ? Math.round((365 / jug) * rem) : 0;
      
      list.push({
        id: `seed-2023-${index}-${code}`,
        chamber,
        caseType: entry.label,
        code: entry.code,
        backlog: bl,
        registered: reg,
        inProgress: prog,
        judged: jug,
        remaining: rem,
        cr,
        dt,
        sheetName: '2023',
        year: 2023,
        periodType: 'annual',
        month: null,
        periodLabel: 'سنوي 2023'
      });
    });
  });

  // 2. Year 2024 (Annual)
  // Total: 10154 registered, 10850 judged, backlog start=1824, final=1128, CR=107%, DT=38
  DEFAULT_CHAMBERS.forEach((chamber, index) => {
    const codes = index % 2 === 0 ? ['2602', '2635', '2611'] : ['2601', '2640', '2525'];
    codes.forEach(code => {
      const entry = DEFAULT_CASE_TYPES[code] || { label: 'قضية جنائية', code };
      const bl = Math.floor(1824 / 27) + (index * 4);
      const reg = Math.floor(10154 / 27) + (index * 10);
      const prog = bl + reg;
      const jug = Math.floor(prog * 0.95); // High CR in 2024 to clear backlog
      const rem = Math.max(0, prog - jug);
      const cr = reg > 0 ? Math.round((jug / reg) * 100) : (jug === 0 && rem === 0 ? 100 : 0);
      const dt = jug > 0 ? Math.round((365 / jug) * rem) : 0;

      list.push({
        id: `seed-2024-${index}-${code}`,
        chamber,
        caseType: entry.label,
        code: entry.code,
        backlog: bl,
        registered: reg,
        inProgress: prog,
        judged: jug,
        remaining: rem,
        cr,
        dt,
        sheetName: '2024',
        year: 2024,
        periodType: 'annual',
        month: null,
        periodLabel: 'سنوي 2024'
      });
    });
  });

  // 3. Year 2025 Monthly Sheets (Months 1 to 10 - Jan through Oct)
  // Cumulative registered YTD: 10244, Judged: 8575, Backlog end of Oct: 2797
  // Let's generate monthly movements that build progressively
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر'
  ];

  for (let m = 1; m <= 10; m++) {
    const isAugust = m === 8; // August vacation - near-zero traffic
    const monthlyRegistered = isAugust ? 234 : Math.floor(10244 / 10) + (m * 20 - 100);
    const monthlyJudged = isAugust ? 200 : Math.floor(8575 / 10) + (m * 30 - 150);

    DEFAULT_CHAMBERS.forEach((chamber, index) => {
      // Misdemeanor appeal thursday only active starting from June (month 6)
      if (chamber.includes('الخميس') && m < 6) {
        return;
      }

      const codes = ['2602', '2601']; // Most common codes
      codes.forEach(code => {
        const entry = DEFAULT_CASE_TYPES[code];
        const bl = Math.floor(1128 / 9) + Math.floor(m * 12);
        const reg = isAugust ? Math.floor(15) : Math.floor(monthlyRegistered / 18) + (index * 2);
        const prog = bl + reg;
        const jug = isAugust ? 10 : Math.floor(monthlyJudged / 18) + (index * 3);
        const rem = Math.max(0, prog - jug);
        
        // Handling August near-zero judged
        let cr = reg > 0 ? Math.round((jug / reg) * 100) : (jug === 0 && rem === 0 ? 100 : 0);
        let dt = jug > 0 ? Math.round((30 / jug) * rem) : null; // Period: 30 days
        
        if (isAugust) {
          dt = null; // Skipped for judicial vacation
        }

        list.push({
          id: `seed-2025-${m}-${index}-${code}`,
          chamber,
          caseType: entry.label,
          code: entry.code,
          backlog: bl,
          registered: reg,
          inProgress: prog,
          judged: jug,
          remaining: rem,
          cr: cr,
          dt: dt,
          sheetName: `${m}-25`,
          year: 2025,
          periodType: 'monthly',
          month: m,
          periodLabel: `${monthNames[m-1]} 2025`
        });
      });
    });
  }

  // 4. Cumulative Year 2025 YTD 1-10 (Jan-Oct 2025)
  DEFAULT_CHAMBERS.forEach((chamber, index) => {
    const codes = ['2602', '2601'];
    codes.forEach(code => {
      const entry = DEFAULT_CASE_TYPES[code];
      const bl = Math.floor(1128 / 9);
      const reg = Math.floor(10244 / 18) + (index * 15);
      const prog = bl + reg;
      const jug = Math.floor(8575 / 18) + (index * 18);
      const rem = Math.max(0, prog - jug);
      const cr = reg > 0 ? Math.round((jug / reg) * 100) : (jug === 0 && rem === 0 ? 100 : 0);
      const dt = jug > 0 ? Math.round((304 / jug) * rem) : 0; // Cumulative Period (304 days till end of Oct)

      list.push({
        id: `seed-2025-cumulative-${index}-${code}`,
        chamber,
        caseType: entry.label,
        code: entry.code,
        backlog: bl,
        registered: reg,
        inProgress: prog,
        judged: jug,
        remaining: rem,
        cr,
        dt,
        sheetName: '1-10',
        year: 2025,
        periodType: 'cumulative',
        month: 10,
        periodLabel: 'تراكمي (10 أشهر) 2025'
      });
    });
  });

  return list;
}

function initDB(): AppDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as AppDatabase;
      let hasUpdates = false;
      if (data.users && Array.isArray(data.users)) {
        data.users.forEach(u => {
          if (!u.password) {
            u.password = u.username;
            hasUpdates = true;
          }
        });
      }
      if (!data.settings) {
        data.settings = {
          institutionName: 'محكمة الاستئناف بآسفي',
          logoUrl: null,
          periodEnd: '2025-10-31',
          aiProvider: 'gemini',
          aiApiKey: '',
          aiModelName: 'gemini-1.5-flash',
          aiEndpoint: '',
          aiSystemPrompt: '',
        };
        hasUpdates = true;
      } else {
        if (data.settings.aiProvider === undefined) { data.settings.aiProvider = 'gemini'; hasUpdates = true; }
        if (data.settings.aiApiKey === undefined) { data.settings.aiApiKey = ''; hasUpdates = true; }
        if (data.settings.aiModelName === undefined) { data.settings.aiModelName = 'gemini-1.5-flash'; hasUpdates = true; }
        if (data.settings.aiEndpoint === undefined) { data.settings.aiEndpoint = ''; hasUpdates = true; }
        if (data.settings.aiSystemPrompt === undefined) { data.settings.aiSystemPrompt = ''; hasUpdates = true; }
      }
      if (hasUpdates) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
      return data;
    } catch (e) {
      console.error('Error reading database file, resetting...', e);
    }
  }

  const defaultMovements = generateSeedMovements();
  const db: AppDatabase = {
    users: [
      {
        id: 'user-superadmin',
        username: 'admin',
        name: ' المسؤول الأعلى للتطبيق',
        role: 'SuperAdmin',
        roleArabic: ' المسؤول الأعلى ',
        active: true,
        password: 'admin',
      },
      {
        id: 'user-manager',
        username: 'manager',
        name: 'المسير الإداري للمحكمة',
        role: 'Manager',
        roleArabic: 'المسير',
        active: true,
        password: 'manager',
      },
      {
        id: 'user-admin',
        username: 'director',
        name: 'مدير الخلية المعلوماتية',
        role: 'Admin',
        roleArabic: 'المدير',
        active: true,
        password: 'director',
      }
    ],
    imports: [
      {
        id: 'import-seed',
        filename: 'CA Stat 2025 Penal par mois sans.xlsx',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'المسؤول الأعلى',
        recordCount: defaultMovements.length,
        active: true,
      }
    ],
    movements: defaultMovements,
    settings: {
      institutionName: 'محكمة الاستئناف بآسفي',
      logoUrl: null,
      periodEnd: '2025-10-31',
      aiProvider: 'gemini',
      aiApiKey: '',
      aiModelName: 'gemini-1.5-flash',
      aiEndpoint: '',
      aiSystemPrompt: '',
    },
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  return db;
}

const db = initDB();

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// REST endpoints
// 1. JWT Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.active);
  
  if (user && (user.password === password || (!user.password && user.username === password))) {
    // Simple mock JWT / Session token
    res.json({
      success: true,
      token: `mock-token-${user.id}`,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        roleArabic: user.roleArabic,
      },
    });
  } else {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

// 2. User Management (Super Administrator / Admin)
app.get('/api/users', (req, res) => {
  res.json(db.users);
});

// User self-change password
app.post('/api/users/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const expectedPassword = user.password || user.username;
  if (expectedPassword !== currentPassword) {
    return res.status(403).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }

  user.password = newPassword;
  saveDB();
  res.json({ success: true, message: 'تم تغيير كلمة المرور للمستخدم بنجاح' });
});

// Admin reset any user password
app.post('/api/users/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const { operatorId, newPassword } = req.body;

  if (!operatorId || !newPassword) {
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' });
  }

  const operator = db.users.find(u => u.id === operatorId && u.active);
  if (!operator || (operator.role !== 'SuperAdmin' && operator.role !== 'Admin')) {
    return res.status(403).json({ error: 'غير مسموح لك بتعديل كلمات المرور' });
  }

  const targetUser = db.users.find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ error: 'المستخدم المستهدف غير موجود' });
  }

  // Prevent modifying SuperAdmin's passwords
  if (targetUser.role === 'SuperAdmin') {
    return res.status(403).json({ error: 'غير مسموح بتعديل أو إعادة تعيين كلمة مرور المسؤول الأعلى لأسباب تتعلق بالنزاهة والسيادة الرقمية' });
  }

  targetUser.password = newPassword;
  saveDB();
  res.json({ success: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح' });
});

app.post('/api/users', (req, res) => {
  const { username, name, role } = req.body;
  if (!username || !name || !role) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const roleArabicMap: Record<string, string> = {
    SuperAdmin: ' المسؤول الأعلى ',
    Admin: 'المدير',
    Manager: 'المسير',
    Visitor: 'الزائر'
  };

  const newUser: DatabaseUser = {
    id: `user-${Date.now()}`,
    username,
    name,
    role,
    roleArabic: roleArabicMap[role] || 'الزائر',
    active: true,
    password: username,
  };

  db.users.push(newUser);
  saveDB();
  res.json({ success: true, user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, active } = req.body;
  const userIndex = db.users.findIndex(u => u.id === id);

  if (userIndex !== -1) {
    const user = db.users[userIndex];
    if (name !== undefined) user.name = name;
    if (active !== undefined) user.active = active;
    if (role !== undefined) {
      user.role = role;
      const roleArabicMap: Record<string, string> = {
        SuperAdmin: ' المسؤول الأعلى ',
        Admin: 'المدير',
        Manager: 'المسير',
        Visitor: 'الزائر'
      };
      user.roleArabic = roleArabicMap[role] || 'الزائر';
    }
    saveDB();
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: 'المستخدم غير موجود' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.users = db.users.filter(u => u.id !== id);
  saveDB();
  res.json({ success: true });
});

// 3. File Upload and Parse Excel File
app.post('/api/upload', (req, res) => {
  const { filename, base64Data, uploadedBy } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: 'ملف البيانات فارغ أو غير صالح' });
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const parsedMovements: DBJudicialMovement[] = [];
    let warningCount = 0;

    // We need to parse every single sheet
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const items = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }) as Record<string, any>[];

      // Extremely robust parse of sheetName to extract year, periodType, and month
      const cleanName = sheetName.trim();
      let sheetYear = 2025;
      let periodType: 'annual' | 'monthly' | 'cumulative' = 'monthly';
      let month: number | null = null;
      let periodLabel = sheetName;

      // 1. Detect year: Look for any 4-digit number starting with 20 (e.g. 2020-2029) or 2-digit years
      const year4Match = cleanName.match(/\b(202\d|201\d)\b/);
      if (year4Match) {
        sheetYear = parseInt(year4Match[1], 10);
      } else {
        // Look for 2-digit years in patterns: -23, -24, -25, or /23, /24, /25
        const year2Match = cleanName.match(/[\-\/](2[3-9]|1[8-9])\b/);
        if (year2Match) {
          sheetYear = 2000 + parseInt(year2Match[1], 10);
        } else if (/^(2[3-9]|1[8-9])$/.test(cleanName)) {
          // Pure 2-digit sheetName
          sheetYear = 2000 + parseInt(cleanName, 10);
        }
      }

      // 2. Classify period type
      const isAnnual = /^20\d{2}$/.test(cleanName) || cleanName.includes('سنوي') || cleanName.includes('عام') || cleanName.includes('annual') || cleanName.includes('حصيلة سنوية');
      const isCumulative = cleanName.startsWith('1-') || cleanName.includes('تراكمي') || cleanName.includes('حصيلة تراكمية') || cleanName.includes('cumul');

      if (isAnnual) {
        periodType = 'annual';
        periodLabel = `سنوي ${sheetYear}`;
      } else if (isCumulative) {
        periodType = 'cumulative';
        // Extract month number (e.g. "1-10" or "تراكمي 10")
        const monthMatch = cleanName.match(/-\s*(\d+)/) || cleanName.match(/تراكمي\s*(\d+)/) || cleanName.match(/\b(\d+)\b/);
        if (monthMatch) {
          const parsedM = parseInt(monthMatch[1], 10);
          if (parsedM >= 1 && parsedM <= 12) {
            month = parsedM;
          }
        }
        if (!month) month = 10; // default to Oct
        periodLabel = `تراكمي (${month} أشهر) ${sheetYear}`;
      } else {
        periodType = 'monthly';
        // Extract month number
        // Check for "05-24" or pure number
        let parsedM: number | null = null;
        const parts = cleanName.split(/[\-\/]/);
        if (parts.length > 0) {
          const firstNum = parseInt(parts[0].trim(), 10);
          if (!isNaN(firstNum) && firstNum >= 1 && firstNum <= 12) {
            parsedM = firstNum;
          }
        }
        if (parsedM === null) {
          const numMatch = cleanName.match(/\b(\d{1,2})\b/);
          if (numMatch) {
            const val = parseInt(numMatch[1], 10);
            if (val >= 1 && val <= 12) {
              parsedM = val;
            }
          }
        }

        if (parsedM !== null) {
          month = parsedM;
          const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
          periodLabel = `${monthNames[month - 1]} ${sheetYear}`;
        } else {
          month = 10; // fallback
          periodLabel = `شهري ${sheetYear}`;
        }
      }

      // Map columns dynamically by scanning for keywords
      let chamberIndex = 'B';
      let typeIndex = 'C';
      let codeIndex = 'D';
      let backlogIndex = 'E';
      let registeredIndex = 'F';
      let progIndex = 'G';
      let judgedIndex = 'H';
      let remainingIndex = 'I';
      let crIndex = 'J';
      let dtIndex = 'K';

      // Look at the first 15 rows to detect headers with robust list of variations
      for (let r = 0; r < Math.min(items.length, 15); r++) {
        const row = items[r];
        const keys = Object.keys(row);
        let foundHeader = false;
        
        keys.forEach(k => {
          const val = String(row[k] || '').trim();
          if (val.includes('الهيآت') || val.includes('الهيئات') || val.includes('الهيئة') || val.includes('الهيأة')) chamberIndex = k;
          if (val.includes('نوعية القضايا') || val.includes('نوعية القضية') || val.includes('نوع القضية') || val.includes('نوع القضايا')) typeIndex = k;
          if (val.includes('الرمز') || val.includes('رمز') || val.includes('الرموز') || val.includes('المعرف')) codeIndex = k;
          if (val.includes('المخلف') || val.includes('مخلف') || val.includes('المتخلف')) backlogIndex = k;
          if (val.includes('المسجل') || val.includes('مسجل') || val.includes('مسجلة') || val.includes('الجديد')) registeredIndex = k;
          if (val.includes('الرائج') || val.includes('رائج') || val.includes('الرائجة')) progIndex = k;
          if (val.includes('المحكوم') || val.includes('محكوم') || val.includes('المضموم') || val.includes('محكومة') || val.includes('القرارات السنوية')) judgedIndex = k;
          if (val.includes('الباقي') || val.includes('باقي') || val.includes('المتبقي')) remainingIndex = k;
          if (val.includes('CR')) crIndex = k;
          if (val.includes('DT')) dtIndex = k;
          
          if (val.includes('الرمز') || val.includes('الهيئات') || val.includes('الهيآت') || val.includes('المخلف')) {
            foundHeader = true;
          }
        });
        if (foundHeader) break;
      }

      // Iterate rows and collect detailed data
      items.forEach((row, rowIndex) => {
        const codeVal = String(row[codeIndex] || '').trim();
        const chamberName = String(row[chamberIndex] || '').trim();
        const caseTypeName = String(row[typeIndex] || '').trim();

        // Must be a valid detail row
        // Starts with numeric code OR we have numeric values in backlog/registered/judged and a valid chamber name
        const isNumericCode = /^\d+$/.test(codeVal);
        const hasNumbers = !isNaN(parseInt(row[backlogIndex], 10)) || !isNaN(parseInt(row[registeredIndex], 10)) || !isNaN(parseInt(row[judgedIndex], 10));
        
        const isHeaderRow = chamberName === 'الهيئات' || chamberName === 'الهيآت' || chamberName === 'الهيئة' || chamberName === 'الهيأة' || chamberName.includes('نوعية القضايا') || chamberName.includes('الرمز');
        const isTotalRow = chamberName.includes('المجموع') || chamberName.includes('المجموع الإجمالي') || caseTypeName.includes('المجموع') || codeVal.includes('المجموع');

        if ((isNumericCode || hasNumbers) && chamberName && !isHeaderRow && !isTotalRow) {
          const bl = parseInt(row[backlogIndex], 10) || 0;
          const reg = parseInt(row[registeredIndex], 10) || 0;
          const prog = parseInt(row[progIndex], 10) || (bl + reg);
          const judgedVal = parseInt(row[judgedIndex], 10) || 0;
          const rem = parseInt(row[remainingIndex], 10) || Math.max(0, prog - judgedVal);

          // Safe division logic for CR% and DT
          let cr: number | null = null;
          let dt: number | null = null;

          if (reg > 0) {
            cr = Math.round((judgedVal / reg) * 100);
          } else {
            cr = (judgedVal === 0 && rem === 0 ? 100 : 0);
          }

          const periodDays = getDaysInPeriod(sheetYear, periodType, month);
          if (judgedVal > 0) {
            dt = Math.round((periodDays / judgedVal) * rem);
          } else {
            dt = null;
          }

          // Use parsed codeVal or create a fallback code mapped based on caseType or index
          let finalCode = codeVal;
          if (!isNumericCode || !finalCode) {
            // lookup mapped code from DEFAULT_CASE_TYPES
            const foundCodeEntry = Object.keys(DEFAULT_CASE_TYPES).find(key => DEFAULT_CASE_TYPES[key].label === caseTypeName);
            finalCode = foundCodeEntry || `999${rowIndex}`;
          }

          parsedMovements.push({
            id: `imported-${sheetName}-${rowIndex}-${finalCode}`,
            chamber: chamberName,
            caseType: caseTypeName || (DEFAULT_CASE_TYPES[finalCode]?.label || 'قضية زجرية'),
            code: finalCode,
            backlog: bl,
            registered: reg,
            inProgress: prog,
            judged: judgedVal,
            remaining: rem,
            cr,
            dt,
            sheetName,
            year: sheetYear,
            periodType,
            month,
            periodLabel
          });
        }
      });
    });

    if (parsedMovements.length === 0) {
      return res.status(400).json({ error: 'لم يتم العثور على أي بيانات قضائية صالحة في الملف المرفق.' });
    }

    // Register active imported dataset
    db.movements = parsedMovements;
    const logId = `import-${Date.now()}`;
    const newLog: DBImportHistory = {
      id: logId,
      filename,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedBy || 'المسؤول',
      recordCount: parsedMovements.length,
      active: true
    };

    // Mark previous as active: false
    db.imports.forEach(i => i.active = false);
    db.imports.unshift(newLog);
    saveDB();

    res.json({
      success: true,
      log: newLog,
      warnings: warningCount,
      count: parsedMovements.length
    });

  } catch (error: any) {
    console.error('Error parsing file:', error);
    res.status(500).json({ error: `حدث خطأ أثناء معالجة ملف الإكسل: ${error.message}` });
  }
});

// 4. Movements and statistics dashboard
app.get('/api/movements', (req, res) => {
  res.json(db.movements);
});

app.get('/api/imports', (req, res) => {
  res.json(db.imports);
});

// 5. Automated AI HUB endpoints & linear forecast logic
app.get('/api/ai/forecast-data', (req, res) => {
  const movs = db.movements.filter(m => m.periodType === 'monthly' && m.year === 2025);
  
  // Aggregate YTD monthly movements
  const listByMonth: Record<number, { registered: number; judged: number; remaining: number }> = {};
  for (let m = 1; m <= 12; m++) {
    listByMonth[m] = { registered: 0, judged: 0, remaining: 0 };
  }

  movs.forEach(m => {
    if (m.month) {
      listByMonth[m.month].registered += m.registered;
      listByMonth[m.month].judged += m.judged;
      listByMonth[m.month].remaining += m.remaining;
    }
  });

  const chartData = Object.keys(listByMonth)
    .map(key => {
      const m = parseInt(key, 10);
      return {
        month: m,
        monthName: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][m - 1],
        registered: listByMonth[m].registered,
        judged: listByMonth[m].judged,
        backlog: listByMonth[m].remaining,
        predicted: false
      };
    })
    .filter(item => item.registered > 0 || item.month <= 10);

  // 1. Simple Linear Regression for November, December, January
  // Retrieve average slope from previous 5 months (excluding August)
  const normMonths = chartData.filter(d => d.month !== 8 && d.registered > 0);
  let regSumX = 0, regSumY = 0, regSumXY = 0, regSumXSq = 0;
  const n = normMonths.length;
  
  normMonths.forEach(d => {
    regSumX += d.month;
    regSumY += d.registered;
    regSumXY += d.month * d.registered;
    regSumXSq += d.month * d.month;
  });

  const slope = n > 1 ? (n * regSumXY - regSumX * regSumY) / (n * regSumXSq - regSumX * regSumX) : 5;
  const intercept = n > 1 ? (regSumY - slope * regSumX) / n : 1000;

  // Let's add predictions for Month 11 (November 2025), Month 12 (December 2025) and Month 13 (January 2026)
  const predictions = [11, 12, 1].map((m, idx) => {
    const virtualMonthIdx = m === 1 ? 13 : m;
    const predReg = Math.max(300, Math.round(slope * virtualMonthIdx + intercept));
    const avgJudgedPace = Math.round(normMonths.reduce((acc, d) => acc + d.judged, 0) / n);
    const predRemaining = Math.max(100, Math.round(chartData[chartData.length - 1]?.backlog + (predReg - avgJudgedPace) * (idx + 1)));

    return {
      month: m,
      monthName: m === 1 ? 'يناير 2026' : (m === 11 ? 'نوفمبر' : 'ديسمبر'),
      registered: predReg,
      judged: avgJudgedPace,
      backlog: predRemaining,
      predicted: true
    };
  });

  res.json({
    history: chartData,
    forecast: predictions,
    paceExplanation: 'تم حساب توقعات الأشهر المقبلة باستخدام نموذج الانحدار الخطي المحسن لتدفق القضايا وتصفية المخزون القضائي من واقع الأشهر السابقة.'
  });
});

// 6. Automated Arabic recommendations per chamber
app.get('/api/ai/recommendations', (req, res) => {
  const movs = db.movements.filter(m => m.periodType === 'monthly' && m.month === 10); // current month (October)
  
  const chamberStats: Record<string, { cr: number; dt: number; registered: number; judged: number; codeList: string[] }> = {};
  
  movs.forEach(m => {
    if (!chamberStats[m.chamber]) {
      chamberStats[m.chamber] = { cr: 0, dt: 0, registered: 0, judged: 0, codeList: [] };
    }
    chamberStats[m.chamber].registered += m.registered;
    chamberStats[m.chamber].judged += m.judged;
    if (m.cr) chamberStats[m.chamber].cr = m.cr;
    if (m.dt) chamberStats[m.chamber].dt = m.dt;
    chamberStats[m.chamber].codeList.push(m.code);
  });

  const recommendations = Object.keys(chamberStats).map((chamber, idx) => {
    const stats = chamberStats[chamber];
    let note = '';
    let category: 'ممتاز' | 'جيد' | 'مقبول' | 'حرج' = 'مقبول';
    let action = '';

    if (stats.cr > 95 && (stats.dt < 40 || !stats.dt)) {
      category = 'ممتاز';
      note = 'أداء ممتاز يتطابق مع المعايير الذهبية؛ يُوصى للحفاظ على هذا المنحنى التشغيلي.';
      action = 'تعزيز المكتسبات المعرفية وعقد جلسات تقييمية لمشاركة ممارسات الهيئة الإيجابية.';
    } else if (stats.cr > 75) {
      category = 'جيد';
      note = 'أداء جيد ومؤشرات تشغيلية مستقرة لتصفية الملفات.';
      action = 'عقد جلسات حوارية مع النيابة العامة لضبط لوائح القضايا المسجلة.';
    } else if (stats.cr > 50) {
      category = 'مقبول';
      note = 'تراكم نسبي ملحوظ ومعدل التصفية بحاجة إلى تقييم عاجل.';
      action = 'اعتماد خطة رقمنة تواصلية لتسريع التبليغات واختصار آماد الجلسات.';
    } else {
      category = 'حرج';
      note = 'مؤشر تصفية حرج ومدة صرف مخزون طويلة تتجاوز الحدود المسموحة.';
      action = 'يُوصى بتخصيص جلسات استثنائية فورية لتصفية المخزون وتعيين قضاة إضافيين لدعم الهيئة زجرياً.';
    }

    return {
      id: `rec-${idx}`,
      chamber,
      cr: stats.cr || 50,
      dt: stats.dt || 90,
      category,
      note,
      action
    };
  });

  res.json(recommendations);
});

// 7. Dynamic multi-provider Arabic interactive assistant
app.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'الرجاء توفير مصفوفة رسائل صالحة للمساعد' });
  }

  const aiProvider = db.settings.aiProvider || 'gemini';
  const aiApiKey = db.settings.aiApiKey || '';
  const aiModelName = db.settings.aiModelName || (aiProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
  const aiEndpoint = db.settings.aiEndpoint || '';
  const customPrompt = db.settings.aiSystemPrompt || '';

  if (!aiApiKey) {
    return res.json({
      reply: 'لم يتم تفعيل مفتاح الـ API للذكاء الاصطناعي بعد من قبل المسؤول الأعلى للمحكمة. يرجى تهيئة وحفظ مفتاح الـ API وجدول الموديل في الإعدادات.'
    });
  }

  try {
    const lastUserMessage = messages[messages.length - 1].text || messages[messages.length - 1].content || '';
    
    // Provide general context of Court of Appeal stats to the system instructions
    const totalRegistered = db.movements.reduce((acc, m) => acc + (m.registered || 0), 0);
    const totalJudged = db.movements.reduce((acc, m) => acc + (m.judged || 0), 0);

    let systemPrompt = `أنت الخبير القضائي والمساعد الذكي لمحكمة الاستئناف بآسفي المغربية.
تجيب دائماً باللغة العربية الفصحى الرسمية القضائية بدقة واحترافية وبدون مبالغة أو تسويق.
تتعامل مع البيانات القضائية التالية لدعم إجاباتك:
- إجمالي عدد القضايا المسجلة كأرقام تراكمية: ${totalRegistered} قضية.
- إجمالي القضايا المحكومة: ${totalJudged} قضية.
- المرجعيات الرسمية للوزارة: معدل تصفية القضايا CR% (الهدف > 95%)، مدة صرف المخزون DT يوم.
- المؤسسة: محكمة الاستئناف بآسفي المغربية.`;

    if (customPrompt) {
      systemPrompt += `\n\nتوجيهات إضافية خاصة بالمحكمة:\n${customPrompt}`;
    }

    systemPrompt += `\n\nأجب باختصار واحترافية ومقترحات عملية واضحة ومستندة للواقع والقانون الجنائي المغربي والتعليمات الوزارية.`;

    let reply = '';

    if (aiProvider === 'gemini') {
      try {
        const aiClient = new GoogleGenAI({
          apiKey: aiApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        
        const chatSession = aiClient.chats.create({
          model: aiModelName,
          config: {
            systemInstruction: systemPrompt,
          }
        });

        const response = await chatSession.sendMessage({ message: lastUserMessage });
        reply = response.text || '';
      } catch (geminiError: any) {
        throw new Error(`مشكلة في استجابة خدمة Gemini: ${geminiError.message}`);
      }
    } else if (aiProvider === 'openai') {
      try {
        const endpoint = aiEndpoint || 'https://api.openai.com/v1/chat/completions';
        
        const formattedMessages = [
          { role: 'system', content: systemPrompt }
        ];

        messages.slice(-6).forEach((m: any) => {
          const content = m.text || m.content;
          if (content) {
            formattedMessages.push({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: content
            });
          }
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`
          },
          body: JSON.stringify({
            model: aiModelName,
            messages: formattedMessages,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status} - ${errText}`);
        }

        const data = await response.json();
        reply = data.choices?.[0]?.message?.content || 'فشل التوليد عن طريق OpenAI.';
      } catch (openaiError: any) {
        throw new Error(`مشكلة في استجابة خدمة OpenAI: ${openaiError.message}`);
      }
    } else { // Custom API format (OpenAI-compatible)
      try {
        const endpoint = aiEndpoint || 'https://api.openai.com/v1/chat/completions';
        const formattedMessages = [
          { role: 'system', content: systemPrompt }
        ];

        messages.slice(-6).forEach((m: any) => {
          const content = m.text || m.content;
          if (content) {
            formattedMessages.push({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: content
            });
          }
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': aiApiKey.startsWith('Bearer ') ? aiApiKey : `Bearer ${aiApiKey}`
          },
          body: JSON.stringify({
            model: aiModelName,
            messages: formattedMessages
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status} - ${errText}`);
        }

        const data = await response.json();
        reply = data.choices?.[0]?.message?.content || 'فشل توليد الرد للخدمة المخصصة.';
      } catch (customError: any) {
        throw new Error(`مشكلة في استجابة الخدمة المخصصة: ${customError.message}`);
      }
    }

    res.json({ reply });

  } catch (error: any) {
    console.error('Dynamic AI Error:', error);
    res.status(500).json({ error: `خطأ أثناء تشغيل محرك الذكاء الاصطناعي: ${error.message}` });
  }
});

// 8. Template file generation (Download actual court XLS representation)
app.get('/api/download-template', (req, res) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Group active movements by sheetName to write sheets
    const sheetsData: Record<string, any[]> = {};
    db.movements.forEach(m => {
      if (!sheetsData[m.sheetName]) {
        sheetsData[m.sheetName] = [];
      }
      sheetsData[m.sheetName].push({
        'الهيئات': m.chamber,
        'نوعية القضايا الزجرية': m.caseType,
        'الرمز': m.code,
        'المخلف': m.backlog,
        'المسجل': m.registered,
        'الرائج': m.inProgress,
        'المحكوم': m.judged,
        'الباقي': m.remaining,
        'CR (%)': m.cr || 0,
        'DT (يوم)': m.dt || 0
      });
    });

    Object.keys(sheetsData).forEach(sheetName => {
      const sheetWS = XLSX.utils.json_to_sheet(sheetsData[sheetName]);
      XLSX.utils.book_append_sheet(workbook, sheetWS, sheetName);
    });

    const wopts: XLSX.WritingOptions = { bookType: 'xlsx', bookSST: false, type: 'buffer' };
    const buffer = XLSX.write(workbook, wopts);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="CA_Stat_Court_Of_Appeal_Safi.xlsx"');
    res.end(buffer);

  } catch (error: any) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'عذراً لا يمكن توليد نموذج البيانات الإحصائية في الوقت الحالي.' });
  }
});

// Settings Management
app.get('/api/settings', (req, res) => {
  res.json({
    institutionName: db.settings.institutionName,
    periodEnd: db.settings.periodEnd,
    logoUrl: db.settings.logoUrl,
    aiProvider: db.settings.aiProvider || 'gemini',
    aiApiKey: db.settings.aiApiKey || '',
    aiModelName: db.settings.aiModelName || 'gemini-1.5-flash',
    aiEndpoint: db.settings.aiEndpoint || '',
    aiSystemPrompt: db.settings.aiSystemPrompt || '',
    statsSummary: {
      registeredCount: db.movements.reduce((acc, m) => acc + (m.registered || 0), 0),
      judgedCount: db.movements.reduce((acc, m) => acc + (m.judged || 0), 0),
    }
  });
});

app.post('/api/settings', (req, res) => {
  const { institutionName, periodEnd, aiProvider, aiApiKey, aiModelName, aiEndpoint, aiSystemPrompt } = req.body;
  if (institutionName !== undefined) db.settings.institutionName = institutionName;
  if (periodEnd !== undefined) db.settings.periodEnd = periodEnd;
  if (aiProvider !== undefined) db.settings.aiProvider = aiProvider;
  if (aiApiKey !== undefined) db.settings.aiApiKey = aiApiKey;
  if (aiModelName !== undefined) db.settings.aiModelName = aiModelName;
  if (aiEndpoint !== undefined) db.settings.aiEndpoint = aiEndpoint;
  if (aiSystemPrompt !== undefined) db.settings.aiSystemPrompt = aiSystemPrompt;
  saveDB();
  res.json({ success: true, settings: db.settings });
});

async function startServer() {
  // Vite dev server integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Judicial Platform Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
