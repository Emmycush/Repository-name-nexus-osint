
ALTER TABLE findings ADD COLUMN confidence INTEGER NOT NULL DEFAULT 50;
ALTER TABLE findings ADD COLUMN analyst_note TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS case_members (
  case_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'viewer',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(case_id,user_id),
  FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS finding_links (
  id TEXT PRIMARY KEY,
  finding_id TEXT NOT NULL,
  linked_finding_id TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'related',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(finding_id) REFERENCES findings(id) ON DELETE CASCADE,
  FOREIGN KEY(linked_finding_id) REFERENCES findings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_members_user ON case_members(user_id);
CREATE INDEX IF NOT EXISTS idx_finding_links_finding ON finding_links(finding_id);
