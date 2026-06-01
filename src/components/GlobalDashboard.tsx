/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  Scale, 
  Clock, 
  FolderMinus,
  HelpCircle,
  FileSpreadsheet,
  PieChart as PieIcon,
  BarChart2,
  ListOrdered
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
  LabelList,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
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

interface GlobalDashboardProps {
  movements: JudicialMovement[];
}

export default function GlobalDashboard({ movements }: GlobalDashboardProps) {
  // Unique lists for filters
  const years = useMemo(() => Array.from(new Set(movements.map(m => String(m.year)))).sort(), [movements]);
  
  const chambers = useMemo(() => {
    return Array.from(new Set(movements.map(m => m.chamber))).sort();
  }, [movements]);

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedPeriodType, setSelectedPeriodType] = useState<string>('monthly');
  const [selectedChamber, setSelectedChamber] = useState<string>('all');

  // Align selectedYear with available years
  const activeYear = useMemo(() => {
    if (selectedYear && years.includes(selectedYear)) {
      return selectedYear;
    }
    return years.length > 0 ? years[years.length - 1] : '2025';
  }, [selectedYear, years]);

  // Initialize selected year once data is loaded
  React.useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  // Auto-switch period type if selected period type does not exist in the active year's data
  React.useEffect(() => {
    if (!activeYear || movements.length === 0) return;
    const availablePeriods = Array.from(new Set(movements.filter(m => String(m.year) === activeYear).map(m => m.periodType)));
    
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedPeriodType as any)) {
      // If the current period type is not available, default to the best available one (annual > cumulative > monthly)
      if (availablePeriods.includes('annual')) {
        setSelectedPeriodType('annual');
      } else if (availablePeriods.includes('cumulative')) {
        setSelectedPeriodType('cumulative');
      } else {
        setSelectedPeriodType('monthly');
      }
    }
  }, [activeYear, movements, selectedPeriodType]);

  // Aggregate stats based on active filters
  const filteredMovements = useMemo(() => {
    const actYr = activeYear;
    return movements.filter(m => {
      const matchYear = String(m.year) === actYr;
      const matchPeriod = m.periodType === selectedPeriodType;
      const matchChamber = selectedChamber === 'all' || m.chamber === selectedChamber;
      return matchYear && matchPeriod && matchChamber;
    });
  }, [movements, activeYear, selectedPeriodType, selectedChamber]);

  // General Aggregations
  const totals = useMemo(() => {
    let backlogSum = 0;
    let registeredSum = 0;
    let progressSum = 0;
    let judgedSum = 0;
    let remainingSum = 0;

    filteredMovements.forEach(m => {
      backlogSum += m.backlog;
      registeredSum += m.registered;
      progressSum += m.inProgress;
      judgedSum += m.judged;
      remainingSum += m.remaining;
    });

    const cr = registeredSum > 0 ? Math.round((judgedSum / registeredSum) * 100) : (judgedSum === 0 && remainingSum === 0 ? 100 : 0);
    
    // Average processing time DT
    const activeDays = selectedPeriodType === 'annual' ? 365 : (selectedPeriodType === 'cumulative' ? 304 : 30);
    const dt = judgedSum > 0 ? Math.round((activeDays / judgedSum) * remainingSum) : 0;

    return {
      backlog: backlogSum,
      registered: registeredSum,
      inProgress: progressSum,
      judged: judgedSum,
      remaining: remainingSum,
      cr,
      dt
    };
  }, [filteredMovements, selectedPeriodType]);

  // Monthly trends data for Chart
  const monthlyData = useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const actYr = Number(activeYear) || 2025;
    
    // Find highest month currently mapped in selected year
    const actYrMonthly = movements.filter(m => m.year === actYr && m.periodType === 'monthly');
    const maxMonth = actYrMonthly.length > 0 ? Math.max(...actYrMonthly.map(m => m.month || 1)) : 10;
    const sliceMonths = months.slice(0, Math.max(10, maxMonth));

    const dataList = sliceMonths.map((monthName, idx) => {
      const monthNum = idx + 1;
      const monthMovs = movements.filter(m => m.year === actYr && m.periodType === 'monthly' && m.month === monthNum);
      
      let reg = 0;
      let jud = 0;
      let rem = 0;

      monthMovs.forEach(m => {
        if (selectedChamber === 'all' || m.chamber === selectedChamber) {
          reg += m.registered;
          jud += m.judged;
          rem += m.remaining;
        }
      });

      return {
        name: monthName,
        'القضايا المسجلة': reg,
        'القضايا المحكومة': jud,
        'المخزون الباقي': rem
      };
    });
    return dataList;
  }, [movements, activeYear, selectedChamber]);

  // Year over Year compare table
  const yoyCompare = useMemo(() => {
    const yrsList = Array.from(new Set(movements.map(m => m.year))).sort();
    if (yrsList.length === 0) return [];

    return yrsList.map(yr => {
      const availablePeriods = Array.from(new Set(movements.filter(m => m.year === yr).map(m => m.periodType)));
      let matchType: 'annual' | 'cumulative' | 'monthly' = 'annual';
      if (availablePeriods.includes('annual')) {
        matchType = 'annual';
      } else if (availablePeriods.includes('cumulative')) {
        matchType = 'cumulative';
      } else if (availablePeriods.includes('monthly')) {
        matchType = 'monthly';
      }

      let targetMonth: number | null = null;
      if (matchType === 'cumulative') {
        const cumMonths = movements.filter(m => m.year === yr && m.periodType === 'cumulative').map(m => m.month || 0);
        if (cumMonths.length > 0) {
          targetMonth = Math.max(...cumMonths);
        }
      }

      const pMovs = movements.filter(m => {
        const yearMatch = m.year === yr;
        const typeMatch = m.periodType === matchType;
        const monthMatch = targetMonth ? m.month === targetMonth : true;
        return yearMatch && typeMatch && monthMatch;
      });
      
      let reg = 0;
      let jud = 0;
      let prog = 0;
      let rem = 0;

      pMovs.forEach(m => {
        if (selectedChamber === 'all' || m.chamber === selectedChamber) {
          reg += m.registered;
          jud += m.judged;
          prog += m.inProgress;
          rem += m.remaining;
        }
      });

      const cr = reg > 0 ? Math.round((jud / reg) * 100) : (jud === 0 && rem === 0 ? 100 : 0);
      let activeDays = 365;
      if (matchType === 'cumulative' && targetMonth) {
        activeDays = targetMonth * 30; 
      } else if (matchType === 'monthly') {
        activeDays = 30;
      }
      const dt = jud > 0 ? Math.round((activeDays / jud) * rem) : 0;

      let label = String(yr);
      if (matchType === 'cumulative' && targetMonth) {
        label = `${yr} تراكمي (${targetMonth} أشهر)`;
      } else if (matchType === 'monthly') {
        label = `${yr} شهري عادي`;
      } else {
        label = `${yr} سنوي`;
      }

      return {
        year: yr,
        label,
        registered: reg,
        judged: jud,
        remaining: rem,
        cr,
        dt
      };
    });
  }, [movements, selectedChamber]);

  // Performance metrics aggregated for each chamber for the active year
  const chamberPerformanceData = useMemo(() => {
    const activeYr = Number(activeYear) || 2025;
    const prevYr = activeYr - 1;
    const map: Record<string, { chamber: string; registered: number; judged: number; remaining: number }> = {};
    
    const yearMovs = movements.filter(m => m.year === activeYr);
    const prevYearMovs = movements.filter(m => m.year === prevYr);
    const availablePeriods = Array.from(new Set(yearMovs.map(m => m.periodType)));
    
    let targetPeriod: 'annual' | 'cumulative' | 'monthly' = 'cumulative';
    if (availablePeriods.includes('cumulative')) {
      targetPeriod = 'cumulative';
    } else if (availablePeriods.includes('annual')) {
      targetPeriod = 'annual';
    } else {
      targetPeriod = 'monthly';
    }
    
    let targetMonth: number | null = null;
    if (targetPeriod === 'cumulative') {
      const months = yearMovs.filter(m => m.periodType === 'cumulative').map(m => m.month || 0);
      if (months.length > 0) targetMonth = Math.max(...months);
    }
    
    const items = yearMovs.filter(m => {
      if (m.periodType !== targetPeriod) return false;
      if (targetPeriod === 'cumulative' && targetMonth !== null && m.month !== targetMonth) return false;
      return true;
    });
    
    if (items.length > 0) {
      items.forEach(item => {
        const name = item.chamber;
        if (!map[name]) {
          map[name] = { chamber: name, registered: 0, judged: 0, remaining: 0 };
        }
        map[name].registered += item.registered;
        map[name].judged += item.judged;
        map[name].remaining += item.remaining;
      });
    } else {
      // Fallback
      yearMovs.forEach(item => {
        const name = item.chamber;
        if (!map[name]) {
          map[name] = { chamber: name, registered: 0, judged: 0, remaining: 0 };
        }
        map[name].registered += item.registered;
        map[name].judged += item.judged;
        map[name].remaining += item.remaining;
      });
    }

    // Previous year matching map for growth rate
    const prevAvailablePeriods = Array.from(new Set(prevYearMovs.map(m => m.periodType)));
    let prevTargetPeriod: 'annual' | 'cumulative' | 'monthly' = 'cumulative';
    if (prevAvailablePeriods.includes(targetPeriod)) {
      prevTargetPeriod = targetPeriod;
    } else if (prevAvailablePeriods.includes('cumulative')) {
      prevTargetPeriod = 'cumulative';
    } else if (prevAvailablePeriods.includes('annual')) {
      prevTargetPeriod = 'annual';
    } else {
      prevTargetPeriod = 'monthly';
    }

    let prevTargetMonth: number | null = null;
    if (prevTargetPeriod === 'cumulative') {
      const prevMonths = prevYearMovs.filter(m => m.periodType === 'cumulative').map(m => m.month || 0);
      if (targetMonth !== null && prevMonths.includes(targetMonth)) {
        prevTargetMonth = targetMonth;
      } else if (prevMonths.length > 0) {
        prevTargetMonth = Math.max(...prevMonths);
      }
    }

    const prevItems = prevYearMovs.filter(m => {
      if (m.periodType !== prevTargetPeriod) return false;
      if (prevTargetPeriod === 'cumulative' && prevTargetMonth !== null && m.month !== prevTargetMonth) return false;
      return true;
    });

    const prevMap: Record<string, number> = {};
    if (prevItems.length > 0) {
      prevItems.forEach(item => {
        const name = item.chamber;
        prevMap[name] = (prevMap[name] || 0) + item.registered;
      });
    } else {
      prevYearMovs.forEach(item => {
        const name = item.chamber;
        prevMap[name] = (prevMap[name] || 0) + item.registered;
      });
    }

    return Object.values(map).map(item => {
      const cr = item.registered > 0 ? Math.round((item.judged / item.registered) * 100) : (item.judged === 0 && item.remaining === 0 ? 100 : 0);
      const activeDays = targetPeriod === 'annual' ? 365 : (targetMonth ? targetMonth * 30 : 304);
      const dt = item.judged > 0 ? Math.round((activeDays / item.judged) * item.remaining) : 0;
      
      const prevRegistered = prevMap[item.chamber] || 0;
      const growth = prevRegistered > 0 
        ? Math.round(((item.registered - prevRegistered) / prevRegistered) * 100) 
        : 0;

      return {
        ...item,
        cr,
        dt,
        growth
      };
    }).sort((a, b) => b.registered - a.registered);
  }, [movements, activeYear]);

  // Top case types aggregated across the whole system for the active year
  const caseTypeSystemBreakdown = useMemo(() => {
    const activeYr = Number(activeYear) || 2025;
    const map: Record<string, { caseType: string; code: string; registered: number; judged: number; remaining: number }> = {};
    
    const yearMovs = movements.filter(m => m.year === activeYr);
    const availablePeriods = Array.from(new Set(yearMovs.map(m => m.periodType)));
    
    let targetPeriod: 'annual' | 'cumulative' | 'monthly' = 'cumulative';
    if (availablePeriods.includes('cumulative')) {
      targetPeriod = 'cumulative';
    } else if (availablePeriods.includes('annual')) {
      targetPeriod = 'annual';
    } else {
      targetPeriod = 'monthly';
    }
    
    let targetMonth: number | null = null;
    if (targetPeriod === 'cumulative') {
      const months = yearMovs.filter(m => m.periodType === 'cumulative').map(m => m.month || 0);
      if (months.length > 0) targetMonth = Math.max(...months);
    }
    
    const items = yearMovs.filter(m => {
      if (m.periodType !== targetPeriod) return false;
      if (targetPeriod === 'cumulative' && targetMonth !== null && m.month !== targetMonth) return false;
      return true;
    });

    items.forEach(item => {
      const key = item.code;
      if (!map[key]) {
        map[key] = { caseType: item.caseType, code: item.code, registered: 0, judged: 0, remaining: 0 };
      }
      map[key].registered += item.registered;
      map[key].judged += item.judged;
      map[key].remaining += item.remaining;
    });

    return Object.values(map)
      .map(item => {
        const cr = item.registered > 0 ? Math.round((item.judged / item.registered) * 100) : (item.judged === 0 && item.remaining === 0 ? 100 : 0);
        return { ...item, cr };
      })
      .sort((a, b) => b.registered - a.registered)
      .slice(0, 8); // Top 8 codes
  }, [movements, activeYear]);

  // Threshold standard indicator badges
  const getCRBadge = (crValue: number) => {
    if (crValue >= 95) {
      return { label: 'ممتاز', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'بمعدل تفريغ قضائي ممتاز' };
    }
    if (crValue >= 75) {
      return { label: 'جيد', bg: 'bg-blue-100 text-blue-800 border-blue-200', text: 'وتيرة معالجة منتظمة' };
    }
    if (crValue >= 50) {
      return { label: 'مقبول', bg: 'bg-amber-100 text-amber-800 border-amber-200', text: 'تراكم جزئي قيد الاحتواء' };
    }
    return { label: 'حرج', bg: 'bg-rose-100 text-rose-800 border-rose-200', text: 'جهود تصفية إضافية مطلوبة' };
  };

  const getDTBadge = (dtValue: number) => {
    if (dtValue <= 45) {
      return { label: 'ممتاز', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
    if (dtValue <= 90) {
      return { label: 'جيد', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
    if (dtValue <= 180) {
      return { label: 'مقبول', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { label: 'حرج', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
  };

  return (
    <div id="global-dashboard" className="space-y-4 font-sans p-4 overflow-y-auto max-h-screen text-slate-800" dir="rtl">
      
      {/* 1. Header and quick selector row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="text-emerald-700 h-6 w-6 shrink-0" />
            <span>لوحة القيادة الشاملة لقرارات العمل القضائي الزجري</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            مؤشرات السير والتحصيل القضائي الرقمية لمحكمة الاستئناف بآسفي، مفلترة ومحللة آنياً.
          </p>
        </div>

        {/* Global Filter Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">الهيئة القضائية</label>
            <select 
              value={selectedChamber}
              onChange={(e) => {
                setSelectedChamber(e.target.value);
              }}
              className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 cursor-pointer min-w-44"
            >
              <option value="all">كل الهيئات القضائية</option>
              {chambers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">السنة الإحصائية</label>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">نوعية التقرير</label>
            <select 
              value={selectedPeriodType}
              onChange={(e) => setSelectedPeriodType(e.target.value)}
              className="bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 cursor-pointer text-slate-800"
            >
              <option value="monthly">تقارير شهرية دورية (تفصيل)</option>
              <option value="cumulative">حصيلة تراكمية للفترة</option>
              <option value="annual">تقرير الحصيلة السنوية كاملة</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. KPI Scorecards */}
      <div id="kpi-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Registered Inflow */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-slate-500 flex items-start gap-3 hover:translate-y-[-2px] transition-transform duration-200">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">القضايا المسجلة (الوافد)</span>
            <span className="text-xl font-mono font-extrabold text-slate-900 block mt-0.5 tracking-tight">
              {formatFr(totals.registered)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">الملفات الجديدة المسجلة</span>
          </div>
        </div>

        {/* KPI 2: Judged Outflow */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-blue-600 flex items-start gap-4 hover:translate-y-[-2px] transition-transform duration-200">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">القضايا المحكومة (الصادر)</span>
            <span className="text-xl font-mono font-extrabold text-slate-900 block mt-0.5 tracking-tight">
              {formatFr(totals.judged)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">الأحكام والقرارات المصدرة</span>
          </div>
        </div>

        {/* KPI 3: Clearance Rate CR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-emerald-600 flex items-start gap-4 hover:translate-y-[-2px] transition-transform duration-200">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-500 font-bold truncate">معدل التصفية CR</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getCRBadge(totals.cr).bg}`}>
                {getCRBadge(totals.cr).label}
              </span>
            </div>
            <span className="text-xl font-mono font-extrabold text-emerald-600 block mt-0.5 tracking-tight">
              {formatFr(totals.cr)}%
            </span>
            {totals.cr > 100 && (
              <span className="text-[9px] text-emerald-600 font-bold block mt-0.5 leading-none bg-emerald-50/50 p-1 rounded">
                * تصفية المخزون المتراكم
              </span>
            )}
            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5 truncate">
              {getCRBadge(totals.cr).text}
            </span>
          </div>
        </div>

        {/* KPI 4: Discharging Time DT */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-amber-600 flex items-start gap-4 hover:translate-y-[-2px] transition-transform duration-200">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-500 font-bold truncate">أمد البت DT</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getDTBadge(totals.dt).bg}`}>
                {getDTBadge(totals.dt).label}
              </span>
            </div>
            <span className="text-xl font-mono font-extrabold text-amber-600 block mt-0.5 tracking-tight">
              {totals.dt ? `${formatFr(totals.dt)}` : '-'} <span className="text-xs font-bold font-sans text-slate-500">يوم</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">تصفية القضايا باليوم</span>
          </div>
        </div>

        {/* KPI 5: Remaining stock */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-red-600 flex items-start gap-4 hover:translate-y-[-2px] transition-transform duration-200">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <FolderMinus className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">المخلف الرائج (الباقي)</span>
            <span className="text-xl font-mono font-extrabold text-red-600 block mt-0.5 tracking-tight">
              {formatFr(totals.remaining)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">الملفات غير المحسومة المتبقية</span>
          </div>
        </div>

      </div>

      {/* 3. Operational Charts - High Definition Bento Grid of 4 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* GRAPH 1: Monthly Inflow vs Outflow */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="text-blue-600 h-5 w-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">المنحنى الشهري لحركة القضايا لسنة {formatFr(Number(activeYear))} (المسجل ضد المحكوم)</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">تتبع فوري لمعدل التدفق الشهري للملفات الوافدة والقرارات الصادرة.</p>
          </div>
          <div className="h-64 w-full font-sans text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={formatFr} />
                <Tooltip formatter={(value: any) => formatFr(value)} contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                <Legend iconType="circle" />
                <Bar name="القضايا المسجلة" dataKey="القضايا المسجلة" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="القضايا المسجلة" position="top" formatter={formatFr} style={{ fill: '#1e3a8a', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
                <Bar name="القضايا المحكومة" dataKey="القضايا المحكومة" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="القضايا المحكومة" position="top" formatter={formatFr} style={{ fill: '#064e3b', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: Backlog Evolution Area chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-red-500 h-5 w-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">تطور حجم المخزون العالق شهرياً (الرائج الباقي لعام {formatFr(Number(activeYear))})</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">مؤشر تراكم الجلسات والملفات المتبقية بنهاية كل شهر إحصائي.</p>
          </div>
          <div className="h-64 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={formatFr} />
                <Tooltip formatter={(value: any) => formatFr(value)} contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                <Legend iconType="circle" />
                <Area name="الملفات غير المحسومة متبقية" type="monotone" dataKey="المخزون الباقي" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRemaining)">
                  <LabelList dataKey="المخزون الباقي" position="top" formatter={formatFr} style={{ fill: '#991b1b', fontSize: 9, fontWeight: 'bold' }} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 3: Horizontal comparative performance per Chamber */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="text-emerald-700 h-5 w-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">مقارنة نجاعة وجودة المعالجة حسب الهيئة القضائية (تصفية وأمد)</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">معدل التصفية الجنائية الأساسي (CR%) وأمد البت التقديري (DT بالأيام).</p>
          </div>
          <div className="h-72 w-full text-[9px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chamberPerformanceData} layout="vertical" margin={{ top: 10, right: 35, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" tickFormatter={formatFr} />
                <YAxis dataKey="chamber" type="category" stroke="#94a3b8" width={180} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                <Tooltip formatter={(value: any) => formatFr(value)} contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                <Legend />
                <Bar name="معدل تصفية الرصيد %" dataKey="cr" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12}>
                  <LabelList dataKey="cr" position="right" formatter={(val: any) => `${formatFr(val)}%`} style={{ fill: '#064e3b', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
                <Bar name="أمد التصفية (أيام)" dataKey="dt" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12}>
                  <LabelList dataKey="dt" position="right" formatter={(val: any) => `${formatFr(val)} j`} style={{ fill: '#78350f', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 4: Pie Chart of Inflow work breakdown */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieIcon className="text-purple-600 h-5 w-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">التوزيع النسبي لعبء القضايا المسجلة الجديدة لعام {formatFr(Number(activeYear))}</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">النِسب المئوية لحجم القضايا التي تم استقبالها في كل هيئة زجرية.</p>
          </div>
          <div className="h-72 w-full flex items-center justify-center font-sans text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chamberPerformanceData}
                  dataKey="registered"
                  nameKey="chamber"
                  cx="48%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {chamberPerformanceData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={RAINBOW_COLORS[index % RAINBOW_COLORS.length]} />
                  ))}
                  <LabelList 
                    dataKey="registered" 
                    position="outside" 
                    formatter={formatFr}
                    style={{ fill: '#334155', fontSize: 9, fontWeight: 'bold' }} 
                  />
                </Pie>
                <Tooltip formatter={(value: any) => formatFr(value)} contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right" 
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ paddingRight: 5, fontSize: 10, fontWeight: 'bold' }}
                  formatter={(value: any, entry: any, index: any) => {
                    const item = chamberPerformanceData[index];
                    return item ? `${item.chamber} (${formatFr(item.registered)})` : value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 5: Radar Chart for comparative metrics */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between lg:col-span-2 hover:translate-y-[-2px] transition-transform duration-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="text-indigo-600 h-5 w-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">التحليل الراداري المقارن لكفاءة ونمو الهيئات القضائية</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">رؤية متعددة الأبعاد تقارن بين الهيئات القضائية بناءً على ثلاثة مؤشرات استراتيجية: معدل التصفية % (CR)، أمد التصفية باليوم (DT)، ونسبة نمو القضايا المسجلة % (YoY).</p>
          </div>
          <div className="h-96 w-full text-[10px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chamberPerformanceData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis 
                  dataKey="chamber" 
                  tickFormatter={(val) => {
                    if (!val) return '';
                    // Abbreviate for better readability inside radar axis
                    return val
                      .replace('غرفة الجنايات الاستئنافية', 'جنايات استئنافية')
                      .replace('غرفة الجنايات الابتدائية', 'جنايات ابتدائية')
                      .replace('حوادث السير المستأنف', 'حوادث سير مستأنف');
                  }}
                  tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }} 
                />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                <Radar name="معدل تصفية الرصيد % (CR)" dataKey="cr" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                <Radar name="أمد التصفية (أيام) (DT)" dataKey="dt" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                <Radar name="نمو تسجيل القضايا %" dataKey="growth" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    if (name === 'أمد التصفية (أيام) (DT)') return [`${formatFr(value)} يوم`, name];
                    if (name === 'معدل تصفية الرصيد % (CR)') return [`${formatFr(value)}%`, name];
                    if (name === 'نمو تسجيل القضايا %') return [`${formatFr(value)}%`, name];
                    return [formatFr(value), name];
                  }}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. Year over Year comparison table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-700 h-5 w-5 shrink-0" />
          <span>المقارنة السنوية لمؤشرات الأداء القضائي الموحد (YTD)</span>
        </h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="sticky top-0 bg-white border-b-2 border-slate-100 text-slate-500 font-bold text-[11px]">
                <th className="pb-2.5 pt-1">السنة الإحصائية</th>
                <th className="pb-2.5 pt-1">إجمالي المسجل</th>
                <th className="pb-2.5 pt-1">إجمالي المحكوم</th>
                <th className="pb-2.5 pt-1">تصفية القضايا CR%</th>
                <th className="pb-2.5 pt-1">أمد صرف المخزون DT</th>
                <th className="pb-2.5 pt-1 text-rose-600">القضايا المتبقية</th>
                <th className="pb-2.5 pt-1 text-center">أقدمية التصفية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {yoyCompare.map((compare) => (
                <tr key={compare.year} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 pr-1 font-bold text-slate-900">{compare.label}</td>
                  <td className="py-2.5 font-mono">{formatFr(compare.registered)}</td>
                  <td className="py-2.5 font-mono">{formatFr(compare.judged)}</td>
                  <td className="py-2.5 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getCRBadge(compare.cr).bg}`}>
                      {formatFr(compare.cr)}%
                    </span>
                  </td>
                  <td className="py-2.5 font-mono">{formatFr(compare.dt)} يوم</td>
                  <td className="py-2.5 font-mono text-rose-650 font-bold">{formatFr(compare.remaining)}</td>
                  <td className="py-2.5 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${compare.cr > 95 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {compare.cr > 95 ? 'مستوى مستقر' : 'تراكم متصاعد'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
