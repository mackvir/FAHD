/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Scale, ShieldAlert, KeyRound, UserCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('الرجاء تعبئة جميع الحقول المطلوبة.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || 'اسم المستخدم أو كلمة المرور غير صالحة.');
      }
    } catch (err) {
      setError('خادم التحقق غير مستجيب. يرجى تكرار المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (user: string) => {
    setUsername(user);
    setPassword(user);
    setError(null);
  };

  return (
    <div id="login-screen" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md">
          <Scale className="h-9 w-9" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
          المملكة المغربية
        </h2>
        <p className="mt-2 text-md text-slate-600">
          محكمة الاستئناف بآسفي · الخلية المعلوماتية
        </p>
        <p className="text-sm font-semibold text-emerald-700 mt-1">
          منصة تحليل وتصور الإحصاءات الزجرية الرقمية
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2 text-sm leading-relaxed">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                اسم المستخدم
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-950 text-right text-sm"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                كلمة المرور
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-950 text-right text-sm"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-400 transition-colors"
              >
                {loading ? 'جاري التحقق...' : 'دخول المنصة الآمن'}
              </button>
            </div>
          </form>

          {/* Preset helpers for verification */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider text-center mb-4">
              حسابات الوصول التجريبية السريعة
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => loadPreset('admin')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 border border-emerald-100 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold transition-colors"
              >
                <KeyRound className="h-4 w-4 text-emerald-600" />
                <span>المسؤول الأعلى</span>
              </button>
              <button
                onClick={() => loadPreset('manager')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 border border-blue-100 rounded-xl bg-blue-50/50 hover:bg-blue-50 text-blue-800 text-xs font-semibold transition-colors"
              >
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span>المسير الإداري</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
