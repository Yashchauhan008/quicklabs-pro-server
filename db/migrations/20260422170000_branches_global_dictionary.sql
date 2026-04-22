-- migrate:up
ALTER TABLE branches
  DROP CONSTRAINT IF EXISTS branches_university_id_fkey;

ALTER TABLE branches
  ALTER COLUMN university_id DROP NOT NULL;

ALTER TABLE branches
  DROP CONSTRAINT IF EXISTS branches_university_id_name_key;

DROP INDEX IF EXISTS branches_university_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_name_active
  ON branches (LOWER(name))
  WHERE deleted_at IS NULL;

-- migrate:down
DROP INDEX IF EXISTS uq_branches_name_active;

ALTER TABLE branches
  DROP CONSTRAINT IF EXISTS branches_university_id_fkey;

ALTER TABLE branches
  ADD CONSTRAINT branches_university_id_fkey
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE;

DELETE FROM branches WHERE university_id IS NULL;

ALTER TABLE branches
  ALTER COLUMN university_id SET NOT NULL;

ALTER TABLE branches
  ADD CONSTRAINT branches_university_id_name_key UNIQUE (university_id, name);
