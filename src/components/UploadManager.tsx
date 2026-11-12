/**
 * ============================================================================
 * منصة الإحصاء الزجري — محكمة الاستئناف بآسفي
 * Développeur exclusif : Abdelmoghit CHLIH (AbdelmoghitCHLIH@gmail.com)
 * Tous droits réservés © Abdelmoghit CHLIH - Code sous licence propriétaire stricte
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle,
  FileCheck,
  History,
  Sparkles,
  BarChart3,
  ArrowLeft,
  ShieldCheck,
  XCircle,
  RefreshCw,
  Check,
  X,
  Filter,
  Eye,
  Layers,
  Database
} from 'lucide-react';
import { ImportLog, IngestionReport, ParsedSheetReport } from '../types';

interface UploadManagerProps {
  onUploadSuccess: () => void;
  user: any;
  onNavigateToDashboard?: () => void;
}

export default function UploadManager({ onUploadSuccess, user, onNavigateToDashboard }: UploadManagerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'analyzing' | 'preview' | 'committing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [parsedCount, setParsedCount] = useState<number>(0);

  // Pre-flight validation state
  const [previewReport, setPreviewReport] = useState<IngestionReport | null>(null);
  const [pendingFile, setPendingFile] = useState<{ filename: string; base64Data: string } | null>(null);
  const [sheetFilter, setSheetFilter] = useState<'all' | 'penal' | 'excluded'>('all');

  // History states
  const [importHistory, setImportHistory] = useState<ImportLog[]>([]);

  const fetchHistory = () => {
    fetch('/api/imports')
      .then(res => res.json())
      .then(data => setImportHistory(data))
      .catch(err => console.error('Error fetching import logs:', err));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Étape 1 : Lecture du fichier et Pré-flight Preview sans altérer la base
  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setUploadStatus('error');
      setStatusMessage('عذراً، يجب اختيار ملف إكسل رسمي بالامتداد .xlsx فقط.');
      return;
    }

    setUploadStatus('analyzing');
    setStatusMessage('جاري الفحص الدقيق للملف واكتشاف أوراق المادة الزجرية واستبعاد الأوراق الملحقة...');
    setWarningsCount(0);
    setPreviewReport(null);
    setPendingFile(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              base64Data,
              uploadedBy: user.name,
              preview: true // Demande d'audit pré-flight uniquement
            })
          });

          const result = await response.json();

          if (response.ok && result.success && result.report) {
            setPendingFile({ filename: file.name, base64Data });
            setPreviewReport(result.report);
            setParsedCount(result.count);
            setUploadStatus('preview');
          } else {
            setUploadStatus('error');
            setStatusMessage(result.error || 'فشلت معالجة بنية جداول الإكسل. يرجى التأكد من احتواء الملف على جداول زجرية.');
          }
        } catch (fetchErr: any) {
          setUploadStatus('error');
          setStatusMessage('تعذر الاتصال بالخادم لمعاينة الملف: ' + fetchErr.message);
        }
      };

      reader.onerror = () => {
        setUploadStatus('error');
        setStatusMessage('حدث خطأ أثناء تحميل وقراءة الملف من القرص.');
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setUploadStatus('error');
      setStatusMessage('عذراً، حدث خطأ تقني غير متوقع مع الخادم: ' + err.message);
    }
  };

  // Étape 2 : Confirmation définitive et écriture en base (Écrasement complet)
  const commitImport = async () => {
    if (!pendingFile) return;

    setUploadStatus('committing');
    setStatusMessage('جاري مسح البيانات السابقة وحفظ الحركات الزجرية الجديدة في قاعدة البيانات...');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: pendingFile.filename,
          base64Data: pendingFile.base64Data,
          uploadedBy: user.name,
          preview: false // Écriture effective en base
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadStatus('success');
        setParsedCount(result.count);
        setStatusMessage(`تم استيراد وحفظ ${result.count} حركة قضائية زجرية بنجاح، ومسح كافة البيانات والملفات السابقة.`);
        fetchHistory();
        onUploadSuccess();
      } else {
        setUploadStatus('error');
        setStatusMessage(result.error || 'حدث خطأ أثناء حفظ البيانات في قاعدة البيانات.');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setStatusMessage('حدث خطأ أثناء حفظ البيانات في الخادم: ' + err.message);
    }
  };

  const cancelPreview = () => {
    setUploadStatus('idle');
    setPreviewReport(null);
    setPendingFile(null);
    setStatusMessage(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    window.location.href = '/api/download-template';
  };

  const filteredSheets: ParsedSheetReport[] = (previewReport?.sheetReports || []).filter(s => {
    if (sheetFilter === 'penal') return s.isPenal;
    if (sheetFilter === 'excluded') return !s.isPenal;
    return true;
  });

  return (
    <div id="upload-manager-view" className="space-y-8 font-sans p-6 overflow-y-auto max-h-screen" dir="rtl">
      
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-700 h-7 w-7" />
            <span>مركز استيراد وأرشفة المطبوع الإحصائي الجنائي</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            نظام ذكي متقدم لهندسة واستيعاب ملفات الإكسل: يتعرف تلقائياً على مواقع الأعمدة والصفوف، ويفلتر أوراق المادة المدنية ونشاط القضاة، ويعيد حساب المؤشرات بدقة رياضية صارمة.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3.5 py-2 rounded-xl border border-emerald-200/60 font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-650" />
          <span>حماية الفحص المسبق (Pre-Flight) نشطة</span>
        </div>
      </div>

      {/* 2. Mode Pre-Flight Preview Card (Affiché dès que le fichier est analysé) */}
      {uploadStatus === 'preview' && previewReport && pendingFile && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500/40 shadow-xl overflow-hidden animate-in fade-in duration-300">
          
          {/* Card Header */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-[#1a2b4b] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-300">
                <FileCheck className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    فحص ناجح 100%
                  </span>
                  <h3 className="text-lg font-bold">تقرير الفحص الذكي للملف قبل التثبيت والاعتماد النهائي</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-mono">
                  الملف المفحوص: <strong className="text-white underline">{pendingFile.filename}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={cancelPreview}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>إلغاء واختيار ملف آخر</span>
              </button>
              <button
                type="button"
                onClick={commitImport}
                className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black text-xs py-2.5 px-6 rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>تأكيد واعتماد البيانات (مسح القديم وتعويض بالجديد)</span>
              </button>
            </div>
          </div>

          {/* 4 Summary Counter Cards */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-200/60">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">إجمالي أوراق الملف</span>
                  <Layers className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {previewReport.totalSheets}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">ورقة عمل متضمنة</span>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between text-emerald-700 mb-2">
                  <span className="text-xs font-bold">أوراق المادة الزجرية</span>
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  {previewReport.penalSheetsCount}
                </div>
                <span className="text-[11px] text-emerald-600 mt-1 block font-semibold">مقبولة ومطابقة للمعايير</span>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs">
                <div className="flex items-center justify-between text-amber-700 mb-2">
                  <span className="text-xs font-bold">الأوراق المستبعدة</span>
                  <XCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-700 font-mono">
                  {previewReport.excludedSheetsCount}
                </div>
                <span className="text-[11px] text-amber-600 mt-1 block font-semibold">مدني / قضاة / تحصيل / أخرى</span>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-xs">
                <div className="flex items-center justify-between text-blue-700 mb-2">
                  <span className="text-xs font-bold">الحركات المستخلصة</span>
                  <Database className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-800 font-mono">
                  {previewReport.totalMovements}
                </div>
                <span className="text-[11px] text-blue-600 mt-1 block font-semibold">قضية زجرية مفهرسة ومحسوبة</span>
              </div>

            </div>
          </div>

          {/* Critical Warning Alert Banner */}
          <div className="mx-6 mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-650 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold block mb-0.5">تنبيه هام وميثاق أمان البيانات:</strong>
              عند الضغط على زر <span className="font-bold underline text-amber-950">تأكيد واعتماد البيانات</span> أدناه، سيتم مسح كافة البيانات والإحصائيات القديمة المخزنة في قاعدة البيانات بشكل نهائي، وتعويضها بالكامل بـ <span className="font-mono font-bold text-amber-950">{previewReport.totalMovements}</span> حركة قضائية زجرية مستخلصة من أوراق هذا الملف.
            </div>
          </div>

          {/* Sheet Breakdown Filter & Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span>تفاصيل تدقيق كل ورقة عمل بالملف ({filteredSheets.length})</span>
              </h4>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSheetFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${sheetFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  الكل ({previewReport.totalSheets})
                </button>
                <button
                  type="button"
                  onClick={() => setSheetFilter('penal')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${sheetFilter === 'penal' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  المعتمدة ({previewReport.penalSheetsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSheetFilter('excluded')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${sheetFilter === 'excluded' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  المستبعدة ({previewReport.excludedSheetsCount})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">اسم ورقة العمل (Feuille)</th>
                    <th className="py-3 px-4 text-center">الحالة الإجرائية</th>
                    <th className="py-3 px-4 text-center">السنة ونوع الفترة</th>
                    <th className="py-3 px-4 text-center">عدد القضايا المعتمدة</th>
                    <th className="py-3 px-4">ملاحظات التحليل والفرز التلقائي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSheets.map((s, idx) => (
                    <tr key={idx} className={s.isPenal ? 'bg-white hover:bg-emerald-50/30' : 'bg-slate-50/50 hover:bg-amber-50/30'}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {s.sheetName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.isPenal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>مادة زجرية معتمدة</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <XCircle className="h-3.5 w-3.5 text-amber-600" />
                            <span>مستبعدة تلقائياً</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {s.isPenal ? (
                          <span>
                            {s.year} — {s.periodType === 'annual' ? 'سنوي كامل' : s.periodType === 'cumulative' ? `تراكمي (${s.month} أشهر)` : `شهري (شهر ${s.month})`}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {s.isPenal ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {s.movementsCount} قضية
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {s.isPenal ? (
                          <span className="text-emerald-700 font-medium">تم التحقق من تطابق الأعمدة والأنواع الزجرية وإصلاح الصيغ الحسابية</span>
                        ) : (
                          <span className="text-amber-800 font-medium">{s.reason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Final Action Bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/60">
              <p className="text-xs text-slate-500">
                إجمالي <strong className="text-slate-800 font-mono">{previewReport.totalMovements}</strong> قضية زجرية جاهزة للتثبيت الفوري في المنصة.
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={cancelPreview}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء العملية
                </button>
                <button
                  type="button"
                  onClick={commitImport}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>تأكيد وحفظ البيانات في المنصة (مسح القديم وتعويض بالجديد)</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 3. Drag & Drop Zone (affiché si on n'est pas en cours de preview) */}
      {uploadStatus !== 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Upload Zone */}
          <div className="lg:col-span-2 space-y-4">
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                dragActive 
                ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/10'
              }`}
            >
              <div className="mx-auto h-16 w-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8 text-slate-500" />
              </div>

              <h3 className="text-md font-bold text-slate-800">اسحب ملف الإحصائيات القضائية هنا</h3>
              <p className="text-xs text-slate-400 mt-1">
                الملف المقبول هو ملف السحب الإحصائي بصيغة Excel (.xlsx) فقط — حتى وإن كان مدمجاً بملفات أخرى أو غير منظم
              </p>

              <div className="mt-6 flex justify-center">
                <label 
                  htmlFor="excel-file-selector"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  تصفح الملف من جهازك
                </label>
                <input 
                  id="excel-file-selector"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            </div>

            {/* Guidelines info card */}
            <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">خصائص المعالجة الذكية للملفات بالمحكمة:</span>
                <p>1. <strong className="text-slate-800">حرية التجميع:</strong> يمكن لكتابة الضبط رفع ملف يحتوي على المادة الزجرية والمدنية ونشاط المستشارين معاً؛ يتكفل النظام بعزل المادة الزجرية فقط وعرض تقرير مفصل عنها.</p>
                <p>2. <strong className="text-slate-800">مواقع الأعمدة والصفوف المرنة:</strong> يرصد النظام مواقع الأعمدة تلقائياً حتى لو أضيفت أعمدة جديدة أو تغير ترتيبها بين السنوات (مثل عام 2023 و2024 و2025).</p>
                <p>3. <strong className="text-slate-800">تصحيح الصيغ والمعادلات:</strong> يتم تلقائياً تلافي أخطاء <strong className="font-bold text-rose-700">#DIV/0!</strong> وإعادة احتساب الرائج (المخلف + المسجل) والباقي ومعدلات التصفية CR وDT وفق القواعد القضائية الرسمية.</p>
              </div>
            </div>
          </div>

          {/* Status report and tools sidebar */}
          <div className="space-y-4">
            
            {/* Active upload status tracker */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-50 pb-3">تقرير حالة الاستيراد النشطة</h3>
              
              {uploadStatus === 'idle' && (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">لا توجد عمليات رفع فعالة للبيانات في هذه الجلسة حالياً.</p>
                </div>
              )}

              {(uploadStatus === 'analyzing' || uploadStatus === 'committing') && (
                <div className="space-y-3 py-4 text-center">
                  <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-600 font-bold leading-relaxed">{statusMessage}</p>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="space-y-3 py-2 text-center animate-in fade-in">
                  <CheckCircle className="h-10 w-10 text-emerald-650 mx-auto" />
                  <h4 className="font-bold text-emerald-800 text-sm">تم استيراد الملف وتحديث المنصة بنجاح</h4>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    {statusMessage}
                  </p>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block font-bold">الحركات المغذاة في لوحة القيادة</span>
                    <strong className="text-emerald-900 text-lg font-mono">{parsedCount}</strong>
                  </div>

                  {onNavigateToDashboard && (
                    <button
                      type="button"
                      onClick={onNavigateToDashboard}
                      className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>الانتقال إلى لوحة القيادة واستعراض النتائج فوراً</span>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="space-y-3 py-2 text-center animate-in fade-in">
                  <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
                  <h4 className="font-bold text-rose-800 text-sm">تنبيه أثناء معالجة الملف</h4>
                  <p className="text-[11px] text-rose-700 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-100">
                    {statusMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => setUploadStatus('idle')}
                    className="mt-2 text-xs text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
                  >
                    إعادة المحاولة مع ملف آخر
                  </button>
                </div>
              )}
            </div>

            {/* Live spreadsheet exporter / template tool */}
            <div className="bg-emerald-50 border border-emerald-100/50 p-6 rounded-2xl shadow-sm text-center">
              <h4 className="font-bold text-emerald-900 text-xs flex items-center justify-center gap-1.5 mb-2">
                <Sparkles className="text-amber-500 h-4 w-4 animate-pulse" />
                <span>أداة تجربة المنصة والبيانات</span>
              </h4>
              <p className="text-[11px] text-emerald-700 leading-relaxed mb-4">
                اضغط أدناه لتحميل نسخة إكسل (.xlsx) تعبيرية تطابق تماماً هيكلة المحكمة الإحصائية لمعاينة الفحص المسبق الفوري.
              </p>
              <button
                onClick={downloadTemplate}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg w-full shadow-sm cursor-pointer transition-colors"
              >
                تحميل نموذج إكسل محاكاة فوري
              </button>
            </div>

          </div>

        </div>
      )}

      {/* 4. Archives History table logs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-900 text-md mb-4 flex items-center gap-2">
          <History className="text-emerald-700 h-5 w-5" />
          <span>سجل أرشيف استيراد ملفات الإحصاء الزجري</span>
        </h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-bold">
                <th className="pb-3 pr-1">رقم المعرف</th>
                <th className="pb-3">اسم ملف الإحصائيات</th>
                <th className="pb-3 text-center">تاريخ الاستيراد لتشغيل المنصة</th>
                <th className="pb-3 text-center">المسؤول عن الرفع</th>
                <th className="pb-3 text-center">عدد الدفوع والقرارات المغذاة</th>
                <th className="pb-3 text-center">حالة التشغيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
              {importHistory.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 pr-1 font-mono text-slate-900">{log.id}</td>
                  <td className="py-3.5 font-bold">{log.filename}</td>
                  <td className="py-3.5 text-center font-mono text-slate-500">
                    {new Date(log.uploadedAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3.5 text-center">{log.uploadedBy}</td>
                  <td className="py-3.5 text-center font-mono">{log.recordCount}</td>
                  <td className="py-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${log.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {log.active ? 'الملف الأنشط حالياً' : 'مؤرشف سابق'}
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
