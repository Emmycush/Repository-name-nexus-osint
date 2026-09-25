
CREATE INDEX IF NOT EXISTS idx_investigations_user_created ON investigations(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_findings_investigation_created ON findings(investigation_id,collected_at);
