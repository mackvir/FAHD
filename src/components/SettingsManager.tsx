/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sliders, ShieldAlert, Logs, Save, CheckCircle, Scale, Lock, KeyRound, UserRoundCog } from 'lucide-react';

interface SettingsProps {
  onSettingsUpdate: (newSettings: any) => void;
  user: any;
}

export default function SettingsManager({ onSettingsUpdate, user }: SettingsProps) {
  const [institutionName, setInstitutionName] = useState('محكمة الاستئناف بآسفي');
  const [periodEnd, setPeriodEnd] = useState('2025-10-31');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Dynamic AI State variables for SuperAdmin
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModelName, setAiModelName] = useState('gemini-1.5-flash');
  const [aiEndpoint, setAiEndpoint] = useState('');
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  
  // Lists of users for admin role
  const [usersList, setUsersList] = useState<any[]>([]);
  
  // Own password change states (Self)
  const [selfCurrentPassword, setSelfCurrentPassword] = useState('');
  const [selfNewPassword, setSelfNewPassword] = useState('');
  const [selfConfirmPassword, setSelfConfirmPassword] = useState('');
  const [selfSuccess, setSelfSuccess] = useState<string | null>(null);
  const [selfError, setSelfError] = useState<string | null>(null);
  const [selfLoading, setSelfLoading] = useState(false);

  // Admin reset specific states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdminOrSuper = user.role === 'SuperAdmin' || user.role === 'Admin';

  // Audits logs
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; actor: string; timestamp: string; ip: string }>>([
    {
      id: 'aud-1',
      action: 'مصادقة آمنة على الجلسة الحالية بمستوى المسؤول الأعلى للتطبيق',
      actor: user.name,
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1'
    },
    {
      id: 'aud-2',
      action: 'تحميل وتهيئة مستودع الإحصائيات الجنائي seed_dataset للأعوام (2023 - 2024 - 2025)',
      actor: 'الخلية المعلوماتية',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      ip: 'localhost'
    }
  ]);

  useEffect(() => {
    // Read court parameters
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.institutionName) setInstitutionName(data.institutionName);
        if (data.periodEnd) setPeriodEnd(data.periodEnd);
        if (data.aiProvider) setAiProvider(data.aiProvider);
        if (data.aiApiKey) setAiApiKey(data.aiApiKey);
        if (data.aiModelName) setAiModelName(data.aiModelName);
        if (data.aiEndpoint !== undefined) setAiEndpoint(data.aiEndpoint);
        if (data.aiSystemPrompt !== undefined) setAiSystemPrompt(data.aiSystemPrompt);
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  useEffect(() => {
    if (isAdminOrSuper) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Filter out SuperAdmins from the resettable list to protect their accounts
            const resettableUsers = data.filter(u => u.role !== 'SuperAdmin');
            setUsersList(resettableUsers);
            if (resettableUsers.length > 0) {
              const firstOther = resettableUsers.find(u => u.id !== user.id) || resettableUsers[0];
              setSelectedUserId(firstOther?.id || '');
            } else {
              setSelectedUserId('');
            }
          }
        })
        .catch(err => console.error('Error fetching users for resets:', err));
    }
  }, [isAdminOrSuper, user.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      const payload: any = { institutionName, periodEnd };
      if (user.role === 'SuperAdmin') {
        payload.aiProvider = aiProvider;
        payload.aiApiKey = aiApiKey;
        payload.aiModelName = aiModelName;
        payload.aiEndpoint = aiEndpoint;
        payload.aiSystemPrompt = aiSystemPrompt;
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setStatusMessage('تم تحديث معلمات وإعدادات المحكمة والذكاء الاصطناعي بنجاح!');
        onSettingsUpdate(data.settings);
        
        // Add audit logs
        setAuditLogs(prev => [
          {
            id: `aud-${Date.now()}`,
            action: user.role === 'SuperAdmin'
              ? `تحديث معلمات الهيئة القضائية والتحكم التفاعلي في الذكاء الاصطناعي (${aiProvider})`
              : `تحديث معلمات الهيئة القضائية ليكون الاسم: ${institutionName}`,
            actor: user.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const handleSelfPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError(null);
    setSelfSuccess(null);

    if (!selfCurrentPassword || !selfNewPassword || !selfConfirmPassword) {
      setSelfError('الرجاء ملء جميع خانات كلمات المرور الخاصة بك.');
      return;
    }

    if (selfNewPassword !== selfConfirmPassword) {
      setSelfError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setSelfLoading(true);
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: selfCurrentPassword,
          newPassword: selfNewPassword
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSelfSuccess('تم تغيير كلمة المرور بنجاح! يرجى الاستمرار بحفظ سرية الرمز.');
        setSelfCurrentPassword('');
        setSelfNewPassword('');
        setSelfConfirmPassword('');
        
        setAuditLogs(prev => [
          {
            id: `aud-${Date.now()}`,
            action: `تحيين كلمة المرور الخاصة بحساب المسؤول: ${user.name}`,
            actor: user.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          ...prev
        ]);
      } else {
        setSelfError(data.error || 'فشل تغيير كلمة المرور. يرجى التحقق من صحة الكلمة الحالية.');
      }
    } catch (err) {
      setSelfError('حدث خطأ في الاتصال بالوزارة للتحقق.');
    } finally {
      setSelfLoading(false);
    }
  };

  const handleAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);

    if (!selectedUserId || !adminNewPassword || !adminConfirmPassword) {
      setAdminError('الرجاء اختيار الحساب وملء كلمات المرور.');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setAdminError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    const targetUserObj = usersList.find(u => u.id === selectedUserId);
    if (!targetUserObj) {
      setAdminError('المستفيد المحدد غير موجود.');
      return;
    }

    setAdminLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedUserId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId: user.id,
          newPassword: adminNewPassword
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setAdminSuccess(`تم تصفير وإعادة تعيين كلمة مرور جديدة للمسؤول (${targetUserObj.name}) بنجاح!`);
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        
        setAuditLogs(prev => [
          {
            id: `aud-${Date.now()}`,
            action: `فرض وتغيير نظامي لكلمة مرور حساب: ${targetUserObj.name} (${targetUserObj.roleArabic})`,
            actor: user.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          ...prev
        ]);
      } else {
        setAdminError(data.error || 'تعذر تغيير كلمة المرور، يرجى مراجعة الصلاحيات قضائياً وعملياً.');
      }
    } catch (err) {
      setAdminError('خطأ أثناء تحيين كلمة المرور من الخلويات.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div id="settings-manager-view" className="space-y-8 font-sans p-6 overflow-y-auto max-h-screen" dir="rtl">
      
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Scale className="text-emerald-700 h-7 w-7" />
          <span>إعدادات النظام والنزاهة وسجلات المراقبة</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          إصلاح بارامترات التقارير وجداول العمل، بالإضافة إلى رصد دفاتر المراقبة الحية للحفاظ على شفافية الإدخال الإحصائي للمحكمة.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings options */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-900 text-md flex items-center gap-2 border-b border-slate-50 pb-3">
            <Save className="text-emerald-700 h-5 w-5" />
            <span>معلمات الهيئة القضائية</span>
          </h3>

          {statusMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-1.5">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs font-semibold">
            
            <div>
              <label className="block text-slate-500 mb-1">اسم المؤسسة القضائية</label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">تاريخ نهاية الفترة النشطة الصالحة للتقارير</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {user.role === 'SuperAdmin' && (
              <div className="pt-4 border-t border-slate-100 space-y-4 text-right" dir="rtl">
                <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5 pb-1 justify-start">
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0">تحيين AI الذكي</span>
                  <span>إعدادات مساعد الذكاء الاصطناعي التفاعلي</span>
                </h4>

                <div>
                  <label className="block text-slate-500 mb-1">مزود الخدمة الذكية (AI Provider)</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => {
                      const prov = e.target.value;
                      setAiProvider(prov);
                      if (prov === 'gemini') {
                        setAiModelName('gemini-1.5-flash');
                      } else if (prov === 'openai') {
                        setAiModelName('gpt-4o-mini');
                      } else {
                        setAiModelName('deepseek-chat');
                      }
                    }}
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="gemini">Google Gemini AI</option>
                    <option value="openai">OpenAI GPT API</option>
                    <option value="custom">بوابة مخصصة ومطابقة لـ OpenAI (DeepSeek / Local / API Proxy)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">مفتاح السر للاستدعاء (API Key)</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">سيتم تخزين المفتاح بشكل آمن ومشفر على الخادم القضائي مباشرة.</p>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">اسم النموذج (Model Name)</label>
                  <input
                    type="text"
                    value={aiModelName}
                    onChange={(e) => setAiModelName(e.target.value)}
                    placeholder={aiProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                  />
                </div>

                {(aiProvider === 'openai' || aiProvider === 'custom') && (
                  <div>
                    <label className="block text-slate-500 mb-1">الرابط المخصص للاتصال (Endpoint URL)</label>
                    <input
                      type="text"
                      value={aiEndpoint}
                      onChange={(e) => setAiEndpoint(e.target.value)}
                      placeholder={aiProvider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/v1/chat/completions'}
                      className="w-full bg-slate-50 text-slate-900 border border-slate-200 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 mb-1">التوجيهات الاستراتيجية المخصصة (System Prompt Supplement)</label>
                  <textarea
                    value={aiSystemPrompt}
                    onChange={(e) => setAiSystemPrompt(e.target.value)}
                    rows={3}
                    placeholder="مثال: ركز دائماً على توجيهات النزاهة وحث القضاة على التقليل من أمد تصفية القضايا الزجرية..."
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 leading-relaxed text-xs"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md cursor-pointer transition-colors pt-2.5"
            >
              حفظ المعلمات وتعميمها
            </button>

          </form>
        </div>

        {/* Audit Logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-900 text-md flex items-center gap-2">
            <Logs className="text-slate-700 h-5 w-5" />
            <span>دفتر سجلات الرصد والمراقبة الحية للنزاهة (Audit Trail)</span>
          </h3>

          <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200/40 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="text-slate-900">{log.action}</span>
                  <span className="font-mono text-[9px] text-slate-400">{log.id}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
                  <span>المسؤول: <strong className="text-slate-600 font-bold">{log.actor}</strong></span>
                  <span>الوقت: <strong className="font-mono text-slate-600">{new Date(log.timestamp).toLocaleString('fr-FR')}</strong></span>
                  <span>موقع الدخول: <strong className="font-mono text-slate-600">{log.ip}</strong></span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            * يتم حفظ دفاتر التتبع الأمنية على منسوب الخلويات المعلوماتية المحلية لغايات الامتثال لقانون الرقابة القضائية ولا يمكن تعديل أو محو هذه الأسطر.
          </p>
        </div>

      </div>

      {/* 3. Password Management & System Integrity Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Lock className="text-emerald-700 h-6 w-6" />
            <span>إدارة رموز الوصول والنزاهة الأمنية (كلمات المرور)</span>
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            تحصين حسابات الهيئة القضائية من خلال التحكم المباشر وتحديث كلمات المرور للحسابات النشطة.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs font-semibold">
          
          {/* Card A: Self password change */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 space-y-4">
            <h4 className="text-sm font-bold text-[#1a2b4b] flex items-center gap-1.5 pb-2 border-b border-slate-200/50">
              <KeyRound className="text-emerald-600 h-4.5 w-4.5" />
              <span>تغيير كلمة المرور الخاصة بك ({user.name})</span>
            </h4>

            {selfSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl flex items-center gap-1.5 font-bold">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{selfSuccess}</span>
              </div>
            )}

            {selfError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                <span>{selfError}</span>
              </div>
            )}

            <form onSubmit={handleSelfPasswordChange} className="space-y-4">
              <div>
                <label className="block text-slate-500 mb-1">كلمة المرور الحالية</label>
                <input
                  type="password"
                  value={selfCurrentPassword}
                  onChange={(e) => setSelfCurrentPassword(e.target.value)}
                  className="w-full bg-white text-slate-950 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 font-sans"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={selfNewPassword}
                    onChange={(e) => setSelfNewPassword(e.target.value)}
                    className="w-full bg-white text-slate-950 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 font-sans"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={selfConfirmPassword}
                    onChange={(e) => setSelfConfirmPassword(e.target.value)}
                    className="w-full bg-white text-slate-950 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 font-sans"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={selfLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm cursor-pointer transition-colors pt-2 disabled:bg-emerald-400"
              >
                {selfLoading ? 'جاري الحفظ والتحيين...' : 'تحديث كلمة المرور الخاصة بسريّتكم'}
              </button>
            </form>
          </div>

          {/* Card B: Admin user credentials setter */}
          {isAdminOrSuper ? (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-sm font-bold text-[#1a2b4b] flex items-center gap-1.5 pb-2 border-b border-slate-200/50">
                <UserRoundCog className="text-purple-600 h-4.5 w-4.5" />
                <span>لوحة فرض كلمات المرور وتصفير حسابات المستخدمين والمسؤولين</span>
              </h4>

              {adminSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl flex items-center gap-1.5 font-bold">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>{adminSuccess}</span>
                </div>
              )}

              {adminError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminPasswordReset} className="space-y-4">
                <div>
                  <label className="block text-slate-500 mb-1">اختر حساب المسؤول القضائي</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="">-- يرجى اختيار الحساب --</option>
                    {usersList.map((usr) => (
                      <option key={usr.id} value={usr.id}>
                        {usr.name} ({usr.roleArabic}) · [@{usr.username}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      className="w-full bg-white text-slate-955 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 font-sans"
                      placeholder="كلمة مرور جديدة قوية"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">تأكيد كلمة المرور</label>
                    <input
                      type="password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full bg-white text-slate-955 border border-slate-200 px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 font-sans"
                      placeholder="تأكيد كلمة المرور"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full bg-[#1a2b4b] hover:bg-[#121f37] text-white font-bold py-3.5 px-4 rounded-xl shadow-sm cursor-pointer transition-colors pt-2 disabled:bg-[#1a2b4b]/60"
                >
                  {adminLoading ? 'جاري فرض الكلمة...' : 'تعيين كلمة المرور الجديدة وإبلاغ المعني'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-xl border border-dashed border-slate-200 flex flex-col justify-center items-center text-center p-8">
              <ShieldAlert className="h-12 w-12 text-slate-400 mb-3 animate-pulse" />
              <h4 className="text-slate-800 font-bold mb-1">لوحة التصفير الإداري مقفلة</h4>
              <p className="text-slate-500 text-[10px] max-w-sm leading-relaxed font-bold">
                صلاحية تصفير أو تعيين كلمات مرور الآخرين مقتصرة حصرياً على مستويات السلطة الرقابية القصوى بالمنصة (المسؤول الأعلى والمدير الإداري).
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
