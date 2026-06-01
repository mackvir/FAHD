/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Sparkles, 
  Send, 
  AlertTriangle, 
  Lightbulb, 
  TrendingUp,
  BrainCircuit,
  Bot
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ForecastItem {
  month: number;
  monthName: string;
  registered: number;
  judged: number;
  backlog: number;
  predicted: boolean;
}

interface RecommendationItem {
  id: string;
  chamber: string;
  cr: number;
  dt: number;
  category: string;
  note: string;
  action: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function AIHub() {
  const [historyAndForecast, setHistoryAndForecast] = useState<ForecastItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'مرحباً بك في مركز الذكاء الاصطناعي التابع لمحكمة الاستئناف بآسفي. أنا مساعدك القضائي الذكي، يمكنك سؤالي عن تحليل حركة الملفات، تحديد الغرف الأكثر تراكماً، أو طلب مقترحات تفصيلية لتحسين نجاعة التصفية الزجرية.',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch forecast and recommendations data from backend
  useEffect(() => {
    fetch('/api/ai/forecast-data')
      .then(res => res.json())
      .then(data => {
        // Combine history + forecast
        const combined = [...data.history, ...data.forecast];
        setHistoryAndForecast(combined);
        setLoadingForecast(false);
      })
      .catch(err => {
        console.error('Error fetching forecast data:', err);
        setLoadingForecast(false);
      });

    fetch('/api/ai/recommendations')
      .then(res => res.json())
      .then(data => {
        setRecommendations(data);
        setLoadingRecs(false);
      })
      .catch(err => {
        console.error('Error fetching recommendations:', err);
        setLoadingRecs(false);
      });
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userInput,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    const originalInput = userInput;
    setUserInput('');
    setSendingMessage(true);

    try {
      // Build past conversation context for Gemini api
      const payloadMessages = chatMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text
      }));
      payloadMessages.push({ role: 'user', content: originalInput });

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages })
      });
      const data = await response.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'عذراً، الخادم يواجه ضغطاً ولا يمكنني صياغة إجابة قضائية دقيقة حالياً.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, botMsg]);

    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'خطأ في الاتصال بمستودع المعرفة القضائي. يرجى مراجعة حالة الاتصال بالشبكة.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setSendingMessage(false);
    }
  };

  const askSuggestedPrompt = (promptText: string) => {
    setUserInput(promptText);
  };

  const anomaliesList = historyAndForecast.filter(d => !d.predicted && (d.registered > 1400 || d.registered < 300));

  return (
    <div id="ai-hub-container" className="space-y-4 font-sans p-4 overflow-y-auto max-h-screen text-slate-800" dir="rtl">
      
      {/* 1. Header component */}
      <div className="bg-[#1a2b4b] border border-white/10 p-4 rounded-xl shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-emerald-400 h-7 w-7 shrink-0" />
            <span>مركز الذكاء الاصطناعي للتنبؤ وحوكمة النجاعة</span>
          </h2>
          <p className="text-slate-350 text-xs mt-0.5">
            موجه بالذكاء الاصطناعي لتخطيط التدفق الجنائي وتفادي التراكمات بالاعتماد على خوارزميات التنبؤ الرقمية وسلاسل الوزارة المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg shrink-0">
          <Sparkles className="text-amber-400 h-4.5 w-4.5 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">النموذج النشط: Gemini 1.5 Pro</span>
        </div>
      </div>

      {/* 2. Forecast chart & Backlog Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Forecast chart area */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 border-r-4 border-blue-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="text-emerald-700 h-5 w-5" />
              <span>تنبؤات حركة تدفق القضايا للأشهر المقبلة</span>
            </h3>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">
              تحليل الاستقراء الخطي المحسن
            </span>
          </div>

          {loadingForecast ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-semibold">جاري حساب التوقعات القضائية...</div>
          ) : (
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyAndForecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ textAlign: 'right', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend />
                  <Area name="مسجل فعلي / متوقع" type="monotone" dataKey="registered" stroke="#2563eb" fillOpacity={0.1} fill="#3b82f6" strokeWidth={2} />
                  <Area name="محكوم فعلي / مستهدف" type="monotone" dataKey="judged" stroke="#10b981" fillOpacity={0.05} fill="#10b981" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-[9px] text-slate-400 mt-1.5 font-medium">
            * المنحنى الممتد بعد شهر &quot;أكتوبر&quot; يعتمد على نموذج توقعات ذكي للتنبؤ بتسجيل فترات نهاية السنة وبداية العام القضائي الجديد لتفادي اختناق العمل القضائي.
          </p>
        </div>

        {/* Projections Sidebar */}
        <div className="space-y-4">
          
          {/* Backlog Alert Box */}
          <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl shadow-sm">
            <h4 className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span>إنذار مبكر بتراكم المخزون</span>
            </h4>
            <p className="text-xs text-rose-800 leading-relaxed mt-2.5">
              إذا استمرت وتيرة الإنجاز الحالية بنسبة تصفية <strong className="font-bold font-mono text-slate-900">84%</strong>، فمن المقدر أن يتجاوز المخزون العالق بالدائرة حاجز <strong className="font-bold font-mono text-slate-900">3,100</strong> قضية بحلول نهاية العام القضائي الحالي.
            </p>
            <div className="mt-4 bg-white/70 rounded-xl p-2.5 text-center text-[11px] font-bold text-rose-950 border border-rose-100">
              مؤشر أداء تصفية المخزن بحاجة إلى تدخل فوري
            </div>
          </div>

          {/* Anomaly detector alerts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>كشف الاضطرابات والانحرافات الشاذة</span>
            </h4>
            <div className="space-y-2">
              {anomaliesList.map(a => (
                <div key={a.month} className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-xs flex items-start gap-1">
                  <span className="text-amber-500 font-bold shrink-0">●</span>
                  <div className="leading-relaxed">
                    <strong>شهر {a.monthName}:</strong> انحراف ملحوظ في مؤشر المسجل بمعدل <strong className="font-mono">{a.registered}</strong> قضية. {a.month === 8 ? 'إجازة قضائية.' : 'ذروة تسجيل استثنائية.'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 3. Automatic recommendations section & Chat Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recommendation Engine cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="text-emerald-600 h-6 w-6" />
            <h3 className="font-bold text-slate-900 text-md">توصيات حوكمة النجاعة حسب تشكيل الغرف</h3>
          </div>

          {loadingRecs ? (
            <div className="text-slate-400 text-sm text-center py-12 font-semibold">جاري توليد التوصيات القضائية...</div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {recommendations.slice(0, 3).map(rec => (
                <div key={rec.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs truncate max-w-72">{rec.chamber}</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${rec.category === 'حرج' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                      مستوى {rec.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    {rec.note}
                  </p>

                  <div className="bg-emerald-50 border border-emerald-100/50 p-2.5 rounded-lg text-xs text-emerald-950 flex gap-2">
                    <span className="font-bold shrink-0">الإجراء القضائي المقترح:</span>
                    <span>{rec.action}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gemini Chatbot Assistant Card */}
        <div id="ai-chat-interface" className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden h-[540px]">
          
          {/* Header */}
          <div className="bg-slate-900 text-slate-100 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="text-emerald-400 h-5 w-5 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-slate-100">المستشار القضائي الافتراضي</h3>
                <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">متاح للاستشارة القضائية الفورية</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-mono">active</span>
          </div>

          {/* Messages lists scroll */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold ${msg.sender === 'user' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-800 text-white'}`}>
                  {msg.sender === 'user' ? 'أ' : 'ج'}
                </div>

                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[8px] opacity-60 mt-1 text-left font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {sendingMessage && (
              <div className="flex gap-2 items-center text-xs text-slate-400 pr-4 italic">
                <Cpu className="animate-spin h-4 w-4 text-emerald-500" />
                <span>جاري صياغة الاستشارة القانونية الدقيقة...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Fast suggestions anchors */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white flex flex-wrap gap-1.5">
            <button
              onClick={() => askSuggestedPrompt('ما هي الغرف الأكثر تراكمًا للقضايا؟')}
              className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200/50 px-2.5 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              ما الغرف الأكثر تراكماً؟
            </button>
            <button
              onClick={() => askSuggestedPrompt('كيف نقيس أداء الجنحي حوادث السير؟')}
              className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200/50 px-2.5 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              نجاعة حوادث السير؟
            </button>
            <button
              onClick={() => askSuggestedPrompt('ما هي خطة المعالجة المقترحة للجنايات؟')}
              className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200/50 px-2.5 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              مسارات مكافحة التراكم القضائي
            </button>
          </div>

          {/* Form write message input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={sendingMessage}
              placeholder="اكتب استشارتك القضائية أو الاستفسار الإحصائي هنا..."
              className="flex-1 bg-slate-50 text-slate-900 border border-slate-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
            />
            <button
              type="submit"
              disabled={sendingMessage || !userInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-xl shadow-sm transition-colors cursor-pointer disabled:bg-slate-100 disabled:text-slate-350"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
