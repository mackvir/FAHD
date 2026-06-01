/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = ' المسؤول الأعلى ' | ' المسؤول الأعلى ' | 'المدير' | 'المسير' | 'الزائر';
// Standardized keys in English mapped to Arabic labels
// Super Administrator: المسؤول الأعلى
// Admin: المدير
// Manager: المسير
// Visitor: الزائر

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Visitor'; // Internal Role mapping
  roleArabic: string;
  active: boolean;
}

export interface SpreadsheetRow {
  id: string;
  chamber: string;      // الهيئات
  caseType: string;     // نوعية القضايا الزجرية
  code: string;         // الرمز
  backlog: number;      // المخلف (E)
  registered: number;   // المسجل (F)
  inProgress: number;   // الرائج (G)
  judged: number;       // المحكوم / المضموم (H)
  remaining: number;    // الباقي (I)
  cr: number | null;    // CR (%) (J)
  dt: number | null;    // DT (يوم) (K)
}

export interface JudicialMovement {
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
  sheetName: string;   // Name of source sheet (e.g. "2023", "2025-10" or "10-25")
  year: number;        // Year extracted
  periodType: 'annual' | 'monthly' | 'cumulative';
  month: number | null;// 1-12 or null for annual
  periodLabel: string; // e.g. "أكتوبر 2025" or "سنوي 2023"
}

export interface ImportLog {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  active: boolean;
}

export interface KPIThreshold {
  level: string; // ممتاز / جيد / مقبول / حرج
  crRange: string;
  dtRange: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
