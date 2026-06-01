/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle,
  FileCheck,
  ChevronDown,
  History,
  Scale,
  Sparkles
} from 'lucide-react';

interface ImportLog {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  active: boolean;
}

interface UploadManagerProps {
  onUploadSuccess: () => void;
  user: any;
}

export default function UploadManager({ onUploadSuccess, user }: UploadManagerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [parsedCount, setParsedCount] = useState<number>(0);

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

  // Standard File uploads Handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setUploadStatus('error');
      setStatusMessage('عذراً، يجب اختيار ملف إكسل رسمي بالامتداد .xlsx فقط.');
      return;
    }

    setUploadStatus('loading');
    setStatusMessage('جاري تحليل وفهرسة جداول المطبوع القضائي...');
    setWarningsCount(0);

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

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64Data,
            uploadedBy: user.name
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setUploadStatus('success');
          setParsedCount(result.count);
          setWarningsCount(result.warnings);
          setStatusMessage(`تم استيراد الملف القضائي بنجاح! تم شحن ${result.count} حركة وقرار قضائي لتحديث البيانات.`);
          fetchHistory();
          onUploadSuccess();
        } else {
          setUploadStatus('error');
          setStatusMessage(result.error || 'فشلت معالجة بنية جداول الإكسل. يرجى مطابقة رؤوس الأعمدة.');
        }
      };

      reader.onerror = () => {
        setUploadStatus('error');
        setStatusMessage('حدث خطأ أثناء تحميل وقراءة الملف من القرص.');
      };

      reader.readAsArrayBuffer(file);

    } catch (err) {
      setUploadStatus('error');
      setStatusMessage('عذراً، حدث خطأ تقني غير متوقع مع الخادم.');
    }
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

  // Generate automated template download
  const downloadTemplate = () => {
    window.location.href = '/api/download-template';
  };

  return (
    <div id="upload-manager-view" className="space-y-8 font-sans p-6 overflow-y-auto max-h-screen" dir="rtl">
      
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-700 h-7 w-7" />
          <span>مركز استيراد وأرشفة المطبوع الإحصائي الجنائي</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          قم بسحب وإسقاط ملف الإحصائيات الرسمي لمحكمة الاستئناف بآسفي لتحديث لوحة مؤشرات الأداء والقضاء على تكرار البيانات وإلغاء معالجة الأخطاء.
        </p>
      </div>

      {/* 2. Drag & Drop Zone */}
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
              الملف المقبول هو ملف السحب الإحصائي بصيغة Excel (.xlsx) فقط
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
              <span className="font-bold text-slate-900 block mb-1">تعليمات المطبوع الإحصائي الجنائي لتفادي الأخطاء:</span>
              <p>1. تأكد من أن الملف يحتوي على أوراق العمل السنوية والشهرية (مثال: <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-800 font-bold border">2023</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-800 font-bold border">2024</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-800 font-bold border">10-25</code>).</p>
              <p>2. يتولى النظام تلقائياً إصلاح مشاكل التقسيم على صفر <strong className="font-bold text-rose-700">#DIV/0!</strong> والتعويض بقيم فارغة لضمان عدم تلف معدلات النجاعة الإجمالية.</p>
              <p>3. يقوم النظام تلقائياً بالتحقق من هيكلة 12 عموداً لورقة العمل كقاعدة بيانات مع معالجة استثنائية لنسخة 14 عموداً لورقة 2023.</p>
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

            {uploadStatus === 'loading' && (
              <div className="space-y-3 py-4 text-center">
                <UploadCloud className="h-10 w-10 text-emerald-600 animate-bounce mx-auto" />
                <p className="text-xs text-slate-600 font-bold">{statusMessage}</p>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="space-y-3 py-2 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-650 mx-auto" />
                <h4 className="font-bold text-emerald-800 text-sm">تم الاستيراد والتشغيل لبيانات آسفي</h4>
                <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                  {statusMessage}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[9px] text-slate-400 block font-bold">الحركات المغذاة</span>
                    <strong className="text-slate-800 text-xs font-mono">{parsedCount}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[9px] text-slate-400 block font-bold">تنبيهات #DIV/0!</span>
                    <strong className="text-amber-700 text-xs font-mono">{warningsCount}</strong>
                  </div>
                </div>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="space-y-3 py-2 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
                <h4 className="font-bold text-rose-800 text-sm">خطأ في توافق المطبوع</h4>
                <p className="text-[11px] text-rose-700 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-100">
                  {statusMessage}
                </p>
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
              اضغط أدناه لتحميل نسخة إكسل (.xlsx) تعبيرية تطابق تماماً هيكلة المحكمة الإحصائية. يمكنك التعديل عليها وإعادة ورفعها لمعاينة فحص البيانات الفوري!
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

      {/* 3. Archives History table logs */}
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
