CREATE TABLE IF NOT EXISTS cases (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 name TEXT, surname TEXT, dni TEXT, phone TEXT, address TEXT, insurer TEXT,
 claim_no TEXT, time TEXT, description TEXT, observations TEXT,
 has_damage TEXT, damage_where TEXT, trades TEXT, sqm TEXT,
 injured_phone TEXT, housing_no TEXT, injured_damage TEXT,
 signer_dni TEXT, signature_key TEXT, status TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS case_photos (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 case_id TEXT NOT NULL,
 object_key TEXT NOT NULL,
 name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cases_user_updated ON cases(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_user_status ON cases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_case_photos_case ON case_photos(case_id);
