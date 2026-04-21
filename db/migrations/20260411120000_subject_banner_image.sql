-- migrate:up
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS banner_file_id UUID REFERENCES files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_banner_file_id ON subjects(banner_file_id);

-- migrate:down
DROP INDEX IF EXISTS idx_subjects_banner_file_id;
ALTER TABLE subjects DROP COLUMN IF EXISTS banner_file_id;
