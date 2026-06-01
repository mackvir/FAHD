-- ============================================================
-- SCHÉMA SUPABASE — منصة الإحصاء الزجري
-- Exécuter une seule fois dans l'éditeur SQL Supabase
-- ============================================================

-- 1. TABLE UTILISATEURS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SuperAdmin','Admin','Manager','Visitor')),
  role_arabic TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  password TEXT NOT NULL
);

-- 2. TABLE IMPORTATIONS
CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT false
);

-- 3. TABLE MOUVEMENTS JUDICIAIRES
CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY,
  chamber TEXT NOT NULL,
  case_type TEXT NOT NULL,
  code TEXT NOT NULL,
  backlog INTEGER NOT NULL DEFAULT 0,
  registered INTEGER NOT NULL DEFAULT 0,
  in_progress INTEGER NOT NULL DEFAULT 0,
  judged INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  cr NUMERIC,
  dt NUMERIC,
  sheet_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('annual','monthly','cumulative')),
  month INTEGER,
  period_label TEXT NOT NULL
);

-- 4. TABLE PARAMÈTRES (une seule ligne)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  institution_name TEXT NOT NULL DEFAULT 'محكمة الاستئناف بآسفي',
  logo_url TEXT,
  period_end TEXT NOT NULL DEFAULT '2025-10-31',
  ai_provider TEXT NOT NULL DEFAULT 'gemini',
  ai_api_key TEXT NOT NULL DEFAULT '',
  ai_model_name TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  ai_endpoint TEXT NOT NULL DEFAULT '',
  ai_system_prompt TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- SEED DATA — Données initiales
-- ============================================================

-- Utilisateurs par défaut
INSERT INTO users (id, username, name, role, role_arabic, active, password) VALUES
  ('user-superadmin', 'admin', 'المسؤول الأعلى للتطبيق', 'SuperAdmin', 'المسؤول الأعلى', true, 'admin'),
  ('user-manager',    'manager', 'المسير الإداري للمحكمة', 'Manager', 'المسير', true, 'manager'),
  ('user-admin',      'director', 'مدير الخلية المعلوماتية', 'Admin', 'المدير', true, 'director')
ON CONFLICT (id) DO NOTHING;

-- Paramètres initiaux
INSERT INTO settings (id, institution_name, period_end) VALUES
  (1, 'محكمة الاستئناف بآسفي', '2025-10-31')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SÉCURITÉ : Désactiver RLS (accès via service role uniquement)
-- ============================================================
ALTER TABLE users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE imports  DISABLE ROW LEVEL SECURITY;
ALTER TABLE movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
