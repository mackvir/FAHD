/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldAlert, Key, UserMinus, ShieldCheck } from 'lucide-react';

interface DatabaseUser {
  id: string;
  username: string;
  name: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Visitor';
  roleArabic: string;
  active: boolean;
}

interface UsersManagerProps {
  user: any;
}

export default function UsersManager({ user }: UsersManagerProps) {
  const [userList, setUserList] = useState<DatabaseUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // New user form state
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'SuperAdmin' | 'Admin' | 'Manager' | 'Visitor'>('Visitor');

  const fetchUsers = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUserList(data))
      .catch(err => console.error('Error fetching users:', err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !name) {
      setError('الرجاء كتابة اسم المستخدم والاسم بالكامل.');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, role })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setUsername('');
        setName('');
        setRole('Visitor');
        setError(null);
        fetchUsers();
      } else {
        setError(data.error || 'حدث خطأ أثناء محاولة تسجيل المستخدم الجديد.');
      }
    } catch (err) {
      setError('الخادم غير مستجيب. يرجى مراجعة الاتصال.');
    }
  };

  const toggleUserActive = async (targetUser: DatabaseUser) => {
    // SuperAdmin cannot be deactivated to prevent self-lockout
    if (targetUser.username === 'admin') {
      alert('لا يمكن إيقاف الحساب النشط للمسؤول الأعلى الافتراضي لمنع انغلاق الخدمة.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !targetUser.active })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error updating user status:', err);
    }
  };

  const deleteUser = async (userId: string, targetUsername: string) => {
    if (targetUsername === 'admin') {
      alert('المسؤول الرئيسي الافتراضي محمي من الحذف.');
      return;
    }

    if (!confirm('هل أنت متأكد من رغبتك في إقصاء حساب هذا المستخدم وإزالته نهائياً؟')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const getRoleBadgeClass = (r: string) => {
    switch (r) {
      case 'SuperAdmin': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Manager': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Restrict access
  const isSuperAdmin = user.role === 'SuperAdmin';

  if (!isSuperAdmin && user.role !== 'Admin') {
    return (
      <div className="p-12 text-center text-slate-500 font-sans" dir="rtl">
        <ShieldAlert className="h-16 w-16 text-rose-600 mx-auto mb-4" />
        <h3 className="font-bold text-slate-900 text-lg">عذراً، لا تمتلك الصلاحيات الإدارية المطلوبة!</h3>
        <p className="text-xs text-slate-400 mt-2">يرجى الاتصال بالمسؤول الأعلى لإدارة أدوار المستخدمين للأجهزة الدورية.</p>
      </div>
    );
  }

  return (
    <div id="users-manager-view" className="space-y-8 font-sans p-6 overflow-y-auto max-h-screen" dir="rtl">
      
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="text-emerald-700 h-7 w-7" />
          <span>حوكمة الحسابات وأذوار المسؤولين للشعبة القضائية</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          إصدار أذونات تشغيل المنصة وحسابات المسؤولين بالخلية المعلوماتية لغايات النزاهة وحفظ السر المهني والتقارير الرقمية.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Table of active users */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-900 text-md flex items-center gap-2">
            <ShieldCheck className="text-emerald-600 h-5 w-5" />
            <span>قائمة المسؤولين الذين يمتلكون أذونات قضائية مفعّلة</span>
          </h3>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-bold">
                  <th className="pb-3 pr-1">الاسم الكامل للمسؤول</th>
                  <th className="pb-3">رمز الدخول الأساسي</th>
                  <th className="pb-3 text-center">نوع الترخيص</th>
                  <th className="pb-3 text-center">أقدمية النشاط</th>
                  <th className="pb-3 text-center">إيقاف رخص النشاط</th>
                  <th className="pb-3 text-center">العملية الإقصائية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {userList.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 pr-1 font-bold text-slate-900">{usr.name}</td>
                    <td className="py-3.5 font-mono text-slate-500">{usr.username}</td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getRoleBadgeClass(usr.role)}`}>
                        {usr.roleArabic}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${usr.active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                        {usr.active ? 'مفعل وجاهز' : 'موقف مؤقتاً'}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => toggleUserActive(usr)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${usr.active ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        {usr.active ? 'إيقاف الترخيص' : 'تشغيل الترخيص'}
                      </button>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => deleteUser(usr.id, usr.username)}
                        className="text-rose-500 hover:text-rose-700 text-[10px] font-bold underline cursor-pointer"
                        disabled={usr.username === 'admin'}
                      >
                        إزاحة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add user form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5 border-b border-slate-50 pb-3">
            <UserPlus className="text-emerald-700 h-5 w-5" />
            <span>إصدار ترخيص دخول جديد بالخلية</span>
          </h3>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-semibold">
            
            <div>
              <label className="block text-slate-500 mb-1">اسم المستخدم (بالأحرف اللاتينية)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="مثال: said_appeal"
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 text-xs px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">الاسم الكامل لوكيل المصلحة</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: ذ. سعيد الشليح"
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 text-xs px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">الدور والصلاحيات الوظيفية</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 text-xs px-3 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="SuperAdmin">المسؤول الأعلى (كامل أذونات الإدارة والتواصل الفوقي)</option>
                <option value="Admin">المدير (إدارة البيانات وتصور السجلات والتقارير)</option>
                <option value="Manager">المسير (تحميل الجداول وحصص تصدير البيانات)</option>
                <option value="Visitor">الزائر (مشاهدة مؤشرات النجاعة والجداول دورياً)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md cursor-pointer transition-colors pt-2.5"
            >
              إصدار ترخيص فعال
            </button>

          </form>
        </div>

      </div>

    </div>
  );
}
