-- Additive migration for the existing production schema (visit_date/company already exist).
CREATE TABLE users (
 id TEXT PRIMARY KEY,
 supabase_id TEXT NOT NULL UNIQUE,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 display_name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','worker')),
 active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
 must_change_password INTEGER NOT NULL DEFAULT 1,
 auth_epoch INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX one_initial_admin ON users(role) WHERE role='admin';
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 auth_epoch INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE auth_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT, action TEXT NOT NULL, target_id TEXT, created_at INTEGER NOT NULL);
CREATE TABLE bootstrap_state (id INTEGER PRIMARY KEY CHECK(id=1), completed_at INTEGER NOT NULL);
CREATE TRIGGER prevent_second_bootstrap BEFORE INSERT ON users WHEN NEW.role='admin' AND EXISTS(SELECT 1 FROM bootstrap_state WHERE id=1)
BEGIN SELECT RAISE(ABORT,'Administrator bootstrap already completed'); END;
CREATE TRIGGER mark_bootstrap AFTER INSERT ON users WHEN NEW.role='admin'
BEGIN INSERT INTO bootstrap_state(id,completed_at) VALUES(1,NEW.created_at); END;
ALTER TABLE cases ADD COLUMN assigned_user_id TEXT REFERENCES users(id);
ALTER TABLE cases ADD COLUMN signer_name TEXT;
ALTER TABLE cases ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cases ADD COLUMN last_mutation TEXT;
ALTER TABLE cases ADD COLUMN deleted_at TEXT;
CREATE INDEX cases_assignment_day ON cases(assigned_user_id,visit_date,time);
