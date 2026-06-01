/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart3, 
  Layers, 
  Cpu, 
  FolderDown, 
  Users, 
  Sliders, 
  LogOut,
  Scale,
  BadgeAlert
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  institutionName: string;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, institutionName }: SidebarProps) {
  const roleLabelMap: Record<string, string> = {
    SuperAdmin: 'الملكف بالرقابة (المسؤول الأعلى)',
    Admin: 'المشرف العام (المدير)',
    Manager: 'المسير القضائي (المسير)',
    Visitor: 'المستشار القضائي (الزائر)'
  };

  const navItems = [
    { id: 'global', label: 'لوحة القيادة الشاملة', icon: BarChart3, roles: ['SuperAdmin', 'Admin', 'Manager', 'Visitor'] },
    { id: 'chambers', label: 'تفاصيل الهيئات القضائية', icon: Layers, roles: ['SuperAdmin', 'Admin', 'Manager', 'Visitor'] },
    { id: 'ai-hub', label: 'مركز الذكاء الاصطناعي', icon: Cpu, roles: ['SuperAdmin', 'Admin', 'Manager', 'Visitor'] },
    { id: 'upload', label: 'استيراد ملف البيانات (.xlsx)', icon: FolderDown, roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { id: 'users', label: 'إدارة أدوار المسؤولين', icon: Users, roles: ['SuperAdmin', 'Admin'] },
    { id: 'settings', label: 'الإعدادات العامة والنزاهة', icon: Sliders, roles: ['SuperAdmin', 'Admin', 'Manager'] }
  ];

  return (
    <aside id="main-sidebar" className="w-64 bg-white text-slate-700 flex flex-col h-screen border-l border-slate-200 shrink-0 font-sans shadow-sm">
      {/* Institution Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="h-10 w-10 bg-[#1a2b4b] rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
          <Scale className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-xs font-bold text-slate-900 leading-tight truncate">
            {institutionName}
          </h2>
          <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider block mt-0.5">
            محكمة الاستئناف بآسفي
          </span>
        </div>
      </div>

      {/* Logged-In Profiler Info */}
      <div className="p-4 bg-slate-50 border-b border-slate-100/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#1a2b4b] flex items-center justify-center font-bold text-emerald-400 border border-slate-200 text-xs">
            {user.name.trim()[0]}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 truncate">{user.name}</h4>
            <span className="text-[9px] text-slate-500 font-medium block">
              {roleLabelMap[user.role] || 'مستشار'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isAllowed = item.roles.includes(user.role);
          const IconComponent = item.icon;
          
          if (!isAllowed) return null;

          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${
                isActive 
                ? 'bg-slate-100 text-[#1a2b4b] font-bold border-r-4 border-emerald-500' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <IconComponent className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></span>}
            </button>
          );
        })}
      </nav>

      {/* Footer Exit Module */}
      <div className="p-3 border-t border-slate-100 mt-auto bg-slate-50/50">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100/80 transition-all cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>خروج آمن من الجلسة</span>
        </button>
        <span className="block text-[8px] text-slate-400 text-center mt-2.5 font-mono">
          نظام S@J2 PENAL المطور · محكمة الاستئناف
        </span>
      </div>
    </aside>
  );
}
