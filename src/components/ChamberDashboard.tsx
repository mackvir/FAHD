/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  HelpCircle, 
  ChevronRight, 
  BarChart2, 
  TableProperties, 
  Info,
  Sliders,
  Scale,
  TrendingUp,
  PieChart as PieIcon,
  CheckCircle2,
  ListCollapse
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';

// French formatting helper for standard Western Arabic numerals (1 2 3...) with clean Moroccan layout styling
const formatFr = (val: any): string => {
  if (val === null || val === undefined) return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  return num.toLocaleString('fr-FR');
};

const RAINBOW_COLORS = [
  '#2563eb', // Vivid Blue
  '#0d9488', // Emerald Teal
  '#10b981', // Clean Green
  '#f59e0b', // Radiant Amber
  '#ec4899', // Rich Pink
  '#8b5cf6', // Dark Purple
  '#ef4444', // Cardinal Red
  '#06b6d4'  // Cyan Blue
];

interface JudicialMovement {
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

interface ChamberDashboardProps {
  movements: JudicialMovement[];
}

export default function ChamberDashboard({ movements }: ChamberDashboardProps) {
  // Get all chambers from active dataset
  const chambers = useMemo(() => {
    return Array.from(new Set(movements.map(m => m.chamber))).sort();
  }, [movements]);

  // Extract unique years from the dataset
  const years = useMemo(() => {
    return Array.from(new Set(movements.map(m => String(m.year)))).sort();
  }, [movements]);

  // Selected Year & Chamber State
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedChamber, setSelectedChamber] = useState<string>('');

  // Align selectedYear with available years
  const activeYear = useMemo(() => {
    if (selectedYear && years.includes(selectedYear)) {
      return Number(selectedYear);
    }
    return years.length > 0 ? Number(years[years.length - 1]) : 2025;
  }, [selectedYear, years]);

  // Initialize selected year and selected chamber once data is loaded
  React.useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  React.useEffect(() => {
    if (chambers.length > 0 && !selectedChamber) {
      setSelectedChamber(chambers[0]);
    }
  }, [chambers, selectedChamber]);

  // Extract monthly records for this chamber and active year
  const chamberMonthlyStats = useMemo(() => {
    return movements.filter(m => m.chamber === selectedChamber && m.periodType === 'monthly' && m.year === activeYear);
  }, [movements, selectedChamber, activeYear]);

  // Get maximum cumulative month for the active year in this chamber
  const maxCumulativeMonth = useMemo(() => {
    const months = movements
      .filter(m => m.chamber === selectedChamber && m.periodType === 'cumulative' && m.year === activeYear)
      .map(m => m.month || 0);
    return months.length > 0 ? Math.max(...months) : 10;
  }, [movements, selectedChamber, activeYear]);

  // Aggregate stats for Selected Chamber YTD (from cumulative sheet, annual sheet, or sum monthly)
  const cumulativeStats = useMemo(() => {
    // 1. Try annual sheets first if the year only has annual records
    const annualItems = movements.filter(m => 
      m.chamber === selectedChamber && 
      m.periodType === 'annual' && 
      m.year === activeYear
    );
    
    if (annualItems.length > 0) {
      let reg = 0, jud = 0, bl = 0, rem = 0, prog = 0;
      annualItems.forEach(item => {
        reg += item.registered;
        jud += item.judged;
        bl += item.backlog;
        rem += item.remaining;
        prog += item.inProgress;
      });

      const cr = reg > 0 ? Math.round((jud / reg) * 100) : (jud === 0 && rem === 0 ? 100 : 0);
      const dt = jud > 0 ? Math.round((365 / jud) * rem) : 0; // 365 calendar days for annual

      return {
        registered: reg,
        judged: jud,
        backlog: bl,
        remaining: rem,
        inProgress: prog,
        cr,
        dt,
        isAnnualOnly: true
      };
    }

    // 2. Try cumulative
    const cumulativeItems = movements.filter(m => 
      m.chamber === selectedChamber && 
      m.periodType === 'cumulative' && 
      m.year === activeYear &&
      m.month === maxCumulativeMonth
    );
    
    if (cumulativeItems.length > 0) {
      let reg = 0, jud = 0, bl = 0, rem = 0, prog = 0;
      cumulativeItems.forEach(item => {
        reg += item.registered;
        jud += item.judged;
        bl += item.backlog;
        rem += item.remaining;
        prog += item.inProgress;
      });

      const cr = reg > 0 ? Math.round((jud / reg) * 100) : (jud === 0 && rem === 0 ? 100 : 0);
      const dt = jud > 0 ? Math.round((304 / jud) * rem) : 0; // 304 calendar days

      return {
        registered: reg,
        judged: jud,
        backlog: bl,
        remaining: rem,
        inProgress: prog,
        cr,
        dt,
        isAnnualOnly: false
      };
    }

    // 3. Fallback search: sum monthly items
    let regSum = 0, judSum = 0, remLatest = 0, blInitial = 0;
    const sorted = [...chamberMonthlyStats].sort((a, b) => (a.month || 0) - (b.month || 0));
    
    if (sorted.length > 0) {
      blInitial = sorted[0].backlog;
      remLatest = sorted[sorted.length - 1].remaining;
      sorted.forEach(s => {
        regSum += s.registered;
        judSum += s.judged;
      });
    }

    const progSum = blInitial + regSum;
    const crSum = regSum > 0 ? Math.round((judSum / regSum) * 100) : (judSum === 0 && remLatest === 0 ? 100 : 0);
    const dtSum = judSum > 0 ? Math.round((304 / judSum) * remLatest) : 0;

    return {
      registered: regSum,
      judged: judSum,
      backlog: blInitial,
      remaining: remLatest,
      inProgress: progSum,
      cr: crSum,
      dt: dtSum,
      isAnnualOnly: false
    };
  }, [movements, selectedChamber, chamberMonthlyStats, activeYear, maxCumulativeMonth]);

  // Case types breakdown inside selected chamber
  const caseTypeBreakdown = useMemo(() => {
    // 1. Try annual first if present
    const annualItems = movements.filter(m => 
      m.chamber === selectedChamber && 
      m.periodType === 'annual' && 
      m.year === activeYear
    );
    if (annualItems.length > 0) {
      return annualItems;
    }

    // 2. Collect from the cumulative month sheet for active year
    const cumulativeItems = movements.filter(m => 
      m.chamber === selectedChamber && 
      m.periodType === 'cumulative' && 
      m.year === activeYear &&
      m.month === maxCumulativeMonth
    );
    if (cumulativeItems.length > 0) {
      return cumulativeItems;
    }
    
    // Aggregation of monthly items by code
    const temp: Record<string, any> = {};
    chamberMonthlyStats.forEach(m => {
      if (!temp[m.code]) {
        temp[m.code] = {
          code: m.code,
          caseType: m.caseType,
          backlog: m.backlog,
          registered: 0,
          judged: 0,
          remaining: m.remaining
        };
      }
      temp[m.code].registered += m.registered;
      temp[m.code].judged += m.judged;
      temp[m.code].remaining = m.remaining; // latest month is remaining
    });

    return Object.values(temp).map(item => {
      const inProgress = item.backlog + item.registered;
      const cr = item.registered > 0 ? Math.round((item.judged / item.registered) * 100) : (item.judged === 0 && item.remaining === 0 ? 100 : 0);
      const dt = item.judged > 0 ? Math.round((304 / item.judged) * item.remaining) : 0;
      return {
        ...item,
        inProgress,
        cr,
        dt
      };
    });
  }, [selectedChamber, chamberMonthlyStats, movements, activeYear, maxCumulativeMonth]);

  // Monthly heatmap metrics (Month name, CR, DT, status)
  const monthlyHeatmap = useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const maxMonthInStats = chamberMonthlyStats.length > 0 ? Math.max(...chamberMonthlyStats.map(s => s.month || 1)) : 10;
    const monthsSlice = months.slice(0, Math.max(10, maxMonthInStats));

    return monthsSlice.map((monthName, idx) => {
      const monthNum = idx + 1;
      const monthMovs = chamberMonthlyStats.filter(s => s.month === monthNum);
      
      let reg = 0, jud = 0, bl = 0, rem = 0;
      
      monthMovs.forEach(m => {
        reg += m.registered;
        jud += m.judged;
        bl += m.backlog;
        rem += m.remaining;
      });

      const prog = bl + reg;
      const cr = reg > 0 ? Math.round((jud / reg) * 100) : (jud === 0 && rem === 0 ? 100 : 0);
      const dt = jud > 0 ? Math.round((30 / jud) * rem) : (monthNum === 8 ? null : 0); // null indicates August vacation

      let status: 'ممتاز' | 'جيد' | 'مقبول' | 'حرج' = 'مقبول';
      let colorClass = 'bg-amber-50 text-amber-700 border-amber-100';

      if (cr >= 95) {
        status = 'ممتاز';
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
      } else if (cr >= 75) {
        status = 'جيد';
        colorClass = 'bg-blue-50 text-blue-700 border-blue-100';
      } else if (cr < 50) {
        status = 'حرج';
        colorClass = 'bg-rose-50 text-rose-700 border-rose-100';
      }

      return {
        month: monthNum,
        name: monthName,
        registered: reg,
        judged: jud,
        cr,
        dt,
        status,
        colorClass
      };
    });
  }, [chamberMonthlyStats]);

  return (
    <div id="chamber-dashboard" className="space-y-4 font-sans p-4 overflow-y-auto max-h-screen text-slate-800" dir="rtl">
      
      {/* 1. Header controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-emerald-700 h-6 w-6 shrink-0" />
            <span>لوحة فحص وتحليل نجاعة الهيئات القضائية</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            اختر السنة الإحصائية والهيئة القضائية المستهدفة لاستعراض مؤشرات نجاعة التصفية الجنائية.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">السنة الإحصائية</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 cursor-pointer min-w-32"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">الهيئة القضائية المستهدفة</label>
            <select
              value={selectedChamber}
              onChange={(e) => setSelectedChamber(e.target.value)}
              className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 cursor-pointer min-w-64"
            >
              {chambers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Focused scorecards */}
      <div id="chamber-scorecards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 : Backlog & Registered (Slate border) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-slate-400 hover:translate-y-[-2px] transition-transform duration-200">
          <span className="text-xs text-slate-500 font-bold block">الملفات المدخلة (المخلف + المسجل)</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-mono font-extrabold text-slate-900">
              {formatFr(cumulativeStats.backlog + cumulativeStats.registered)}
            </span>
            <span className="text-xs font-bold text-slate-500">ملف</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 border-t border-slate-100 pt-1.5 font-bold">
            <span>مخلف: <strong className="font-mono text-slate-700">{formatFr(cumulativeStats.backlog)}</strong></span>
            <span>مسجل: <strong className="font-mono text-slate-700">{formatFr(cumulativeStats.registered)}</strong></span>
          </div>
        </div>

        {/* KPI 2 : Judged Outflow (Emerald border) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-emerald-500 hover:translate-y-[-2px] transition-transform duration-200">
          <span className="text-xs text-slate-500 font-bold block">مجموع القضايا الزجرية المحكومة</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-mono font-extrabold text-emerald-600">
              {formatFr(cumulativeStats.judged)}
            </span>
            <span className="text-xs font-bold text-slate-500">ملف مصدَّر</span>
          </div>
          <p className="text-[10px] text-emerald-700 font-semibold block mt-1.5 font-bold">معدل الإنجاز تراكمياً للفترة</p>
        </div>

        {/* KPI 3 : Clearance Rate CR% (Blue border) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-blue-500 hover:translate-y-[-2px] transition-transform duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">تصفية مخزون الهيئة CR</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${cumulativeStats.cr >= 95 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>
              {cumulativeStats.cr >= 95 ? 'تصفية ذهبية' : 'معدل قياسي'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-extrabold text-blue-600">
              {formatFr(cumulativeStats.cr)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium block mt-1.5 font-bold">إجمالي المحكوم من منسوب الرائج للهيئة</p>
        </div>

        {/* KPI 4 : Processing Time DT (Amber border) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-amber-500 hover:translate-y-[-2px] transition-transform duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">أمد تصريف المتبقي للجلسات</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${cumulativeStats.dt <= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {cumulativeStats.dt <= 60 ? 'مدة ممتازة' : 'فحص أقدمية'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-extrabold text-amber-600">
              {cumulativeStats.dt ? formatFr(cumulativeStats.dt) : '-'}
            </span>
            <span className="text-xs font-bold text-slate-500">يوم معالجة</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium block mt-1.5 font-bold">الوقت المقدر لتصفية حجم الباقي كاملاً</p>
        </div>

      </div>

      {/* 2.5. Graphical Chamber Analytics Section - Custom Bento Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* GRAPH 1: Selected Chamber Monthly Inflow vs Outflow */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-blue-600 h-5 w-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">التطور الشهري للنشاط القضائي للهيئة لعام {formatFr(activeYear)}</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">تدرج تطور الملفات المسجلة والمحكومة والمتبقية في الجلسات شهرياً.</p>
          </div>
          <div className="h-64 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHeatmap} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={formatFr} />
                <Tooltip formatter={(value: any) => formatFr(value)} contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                <Legend iconType="circle" />
                <Bar name="المسجلة للهيئة" dataKey="registered" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="registered" position="top" formatter={formatFr} style={{ fill: '#1e3a8a', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
                <Bar name="المحكومة للهيئة" dataKey="judged" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="judged" position="top" formatter={formatFr} style={{ fill: '#064e3b', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: Case Type workload breakdown inside the Selected Chamber */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieIcon className="text-purple-600 h-5 w-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">توزيع حصة الملفات المسجلة حسب مادة ونوع القضية في الهيئة</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">توزيع نسبي لحجم وتنوع عبء العمل الإجمالي (المسجل التراكمي لعام {formatFr(activeYear)}).</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center text-[9px] font-semibold">
            {caseTypeBreakdown && caseTypeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={caseTypeBreakdown.slice(0, 6)}
                    dataKey="registered"
                    nameKey="caseType"
                    cx="48%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {caseTypeBreakdown.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RAINBOW_COLORS[index % RAINBOW_COLORS.length]} />
                    ))}
                    <LabelList 
                      dataKey="registered" 
                      position="outside" 
                      formatter={formatFr}
                      style={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }} 
                    />
                  </Pie>
                  <Tooltip formatter={(value: any) => formatFr(value)} contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right" 
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ paddingRight: 5, fontSize: 9, fontWeight: 'bold', maxWidth: '40%' }}
                    formatter={(value: any, entry: any, index: any) => {
                      const item = caseTypeBreakdown[index];
                      return item ? `${item.code} (${formatFr(item.registered)})` : value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 font-bold">لا توجد بيانات رسومية كافية لهذه الهيئة</div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Breakdown per case type within selected chamber */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Detail Case codes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <TableProperties className="text-emerald-750 h-5 w-5 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm">توزيع القضايا القضائية التراكمية حسب الرمز والمجال</h3>
          </div>
          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 text-slate-500 font-bold">
                  <th className="pb-2">رمز القضية</th>
                  <th className="pb-2">نوعية القضية الزجرية</th>
                  <th className="pb-2 text-center">المخلف</th>
                  <th className="pb-2 text-center">المسجل</th>
                  <th className="pb-2 text-center">الرائج</th>
                  <th className="pb-2 text-center text-emerald-600">المحكوم</th>
                  <th className="pb-2 text-center text-rose-600">الباقي</th>
                  <th className="pb-2 text-center">CR%</th>
                  <th className="pb-2 text-center">DT (يوم)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-800">
                {caseTypeBreakdown.map((row) => (
                  <tr key={row.id || row.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-slate-900">{row.code}</td>
                    <td className="py-2.5">{row.caseType}</td>
                    <td className="py-2.5 text-center font-mono">{formatFr(row.backlog)}</td>
                    <td className="py-2.5 text-center font-mono">{formatFr(row.registered)}</td>
                    <td className="py-2.5 text-center font-mono">{formatFr(row.inProgress)}</td>
                    <td className="py-2.5 text-center font-mono text-emerald-600 font-bold">{formatFr(row.judged)}</td>
                    <td className="py-2.5 text-center font-mono text-rose-600 font-bold">{formatFr(row.remaining)}</td>
                    <td className="py-2.5 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${row.cr >= 95 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {formatFr(row.cr)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono">{row.dt ? formatFr(row.dt) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Heatmap showing performance over 10 months */}
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Info className="text-emerald-700 h-5 w-5 shrink-0" />
            <span>تتبع النجاعة الدورية عبر الأشهر (سنة {formatFr(activeYear)})</span>
          </h3>
          <div className="space-y-2 h-96 overflow-y-auto pr-1 flex flex-col">
            {cumulativeStats.isAnnualOnly ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 font-bold self-stretch">
                <Scale className="h-10 w-10 text-slate-400 mb-2" />
                <p className="text-xs">البيانات الإحصائية المتوفرة لهذا العام عبارة عن حصيلة سنوية شاملة مدمجة.</p>
                <p className="text-[10px] text-slate-400 mt-1">لا توجد تفاصيل شهرية مستقلة في الملف المرفوع.</p>
              </div>
            ) : (
              monthlyHeatmap.map((month) => {
                const isAugust = month.month === 8;
                return (
                  <div key={month.month} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors text-xs">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{month.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        مسجل: <strong className="font-mono text-slate-600">{formatFr(month.registered)}</strong> | محكوم: <strong className="font-mono text-slate-600">{formatFr(month.judged)}</strong>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 font-bold">
                      {isAugust ? (
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          إجازة قضائية
                        </span>
                      ) : (
                        <>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${month.colorClass}`}>
                            CR {formatFr(month.cr)}%
                          </span>
                          <span className="text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                            DT {month.dt ? formatFr(month.dt) : '-'} يوم
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
