ALTER TABLE users ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_credits INTEGER NOT NULL,
  max_cases INTEGER NOT NULL,
  max_members_per_case INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  renews_at TEXT,
  provider TEXT,
  provider_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(plan_id) REFERENCES plans(id)
);
CREATE TABLE IF NOT EXISTS usage_daily (
  user_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  investigations INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  provider_checks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, usage_date),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT OR IGNORE INTO plans(id,name,monthly_credits,max_cases,max_members_per_case) VALUES
('free','Free',25,5,2),('pro','Pro',250,50,10),('team','Team',1000,250,25);
