-- migrate:up
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS logo_file_id UUID REFERENCES files(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS semester INTEGER;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS semester INTEGER;

CREATE INDEX IF NOT EXISTS idx_universities_logo_file_id ON universities(logo_file_id);
CREATE INDEX IF NOT EXISTS idx_users_semester ON users(semester);
CREATE INDEX IF NOT EXISTS idx_documents_semester ON documents(semester);

-- migrate:down
DROP INDEX IF EXISTS idx_documents_semester;
DROP INDEX IF EXISTS idx_users_semester;
DROP INDEX IF EXISTS idx_universities_logo_file_id;

ALTER TABLE documents DROP COLUMN IF EXISTS semester;
ALTER TABLE users DROP COLUMN IF EXISTS semester;
ALTER TABLE universities DROP COLUMN IF EXISTS logo_file_id;
