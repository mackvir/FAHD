/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Scale, ShieldAlert, Cpu } from 'lucide-react';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import GlobalDashboard from './components/GlobalDashboard';
import ChamberDashboard from './components/ChamberDashboard';
import AIHub from './components/AIHub';
import UploadManager from './components/UploadManager';
import UsersManager from './components/UsersManager';
import SettingsManager from './components/SettingsManager';

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

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<any>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const [activeTab, setActiveTab] = useState('global');
  const [movements, setMovements] = useState<JudicialMovement[]>([]);
  const [institutionName, setInstitutionName] = useState('محكمة الاستئناف بآسفي');
  const [lastUpdatedDate, setLastUpdatedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/movements');
      const data = await response.json();
      if (response.ok) {
        setMovements(data);
      }
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (response.ok) {
        if (data.institutionName) setInstitutionName(data.institutionName);
        if (data.lastImportedAt) {
          setLastUpdatedDate(data.lastImportedAt);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMovements();
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLoginSuccess = (usr: any, tkn: string) => {
    setUser(usr);
    setToken(tkn);
    localStorage.setItem('token', tkn);
    localStorage.setItem('user', JSON.stringify(usr));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setActiveTab('global');
  };

  // Content area depending on active view
  const renderContent = () => {
    switch (activeTab) {
      case 'global':
        return <GlobalDashboard movements={movements} />;
      case 'chambers':
        return <ChamberDashboard movements={movements} />;
      case 'ai-hub':
        return <AIHub />;
      case 'upload':
        return <UploadManager user={user} onUploadSuccess={() => { fetchMovements(); fetchSettings(); }} />;
      case 'users':
        return <UsersManager user={user} />;
      case 'settings':
        return <SettingsManager user={user} onSettingsUpdate={(s) => setInstitutionName(s.institutionName)} />;
      default:
        return <GlobalDashboard movements={movements} />;
    }
  };

  // If no session, show Arabized Login CARD
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center font-sans" dir="rtl">
        <Scale className="animate-pulse text-amber-500 h-16 w-16 mb-4" />
        <h3 className="font-bold text-lg">جاري تحميل وتزامن جداول المطبوع القضائي...</h3>
        <p className="text-xs text-slate-400 mt-2">يرجى الانتظار لحين تهيئة الخلية المعلوماتية للبيانات الإحصائية.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex font-sans overflow-hidden" dir="rtl">
      
      {/* 1. Sidebar Panel on the right */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
        institutionName={institutionName}
      />

      {/* 2. Main content area on the left */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden">
        
        {/* Supreme Top Court Header bar */}
        <header className="bg-[#1a2b4b] text-white border-b border-white/10 py-3 px-6 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
              <Scale className="h-5 w-5 text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">{institutionName} <span className="opacity-60 text-xs font-normal">· منصة الإحصاءات الزجرية</span></h1>
            <span className="bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20 text-[10px] px-2.5 py-0.5 rounded-md uppercase">
              المحكمة الرقمية النموذجية
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* AI Assistant quick stats badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1 rounded-lg text-xs text-slate-200">
              <Cpu className="text-emerald-400 h-4 w-4" />
              <span>مساعد الذكاء الاصطناعي: جاهز للاستشارة</span>
            </div>
            
            {lastUpdatedDate && (
              <div className="text-left border-r border-[#ffffff20] pr-4">
                <span className="text-[10px] text-slate-300/80 block">تاريخ تحديث المنصة</span>
                <span className="text-xs font-bold font-mono text-emerald-400 block mt-0.5">
                  {new Date(lastUpdatedDate).toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            
            <div className="text-left border-r border-white/10 pr-4">
              <span className="text-[10px] text-slate-300/80 block">توقيت الخلية</span>
              <span className="text-xs font-bold font-mono text-white mt-0.5 block">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        {/* 3. Central view routers */}
        <div className="flex-1 overflow-hidden bg-[#f0f2f5]">
          {renderContent()}
        </div>

      </main>
    </div>
  );
}
