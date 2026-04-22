-- migrate:up
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(university_id, name)
);

CREATE INDEX IF NOT EXISTS idx_universities_deleted_at ON universities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_universities_name ON universities(name);
CREATE INDEX IF NOT EXISTS idx_branches_university_id ON branches(university_id);
CREATE INDEX IF NOT EXISTS idx_branches_deleted_at ON branches(deleted_at);
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);

DROP TRIGGER IF EXISTS update_universities_updated_at ON universities;
CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON universities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_year INTEGER;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_university_id ON users(university_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_batch_year ON users(batch_year);
CREATE INDEX IF NOT EXISTS idx_documents_university_id ON documents(university_id);
CREATE INDEX IF NOT EXISTS idx_documents_branch_id ON documents(branch_id);
CREATE INDEX IF NOT EXISTS idx_documents_batch_year ON documents(batch_year);

-- migrate:down
DROP INDEX IF EXISTS idx_documents_batch_year;
DROP INDEX IF EXISTS idx_documents_branch_id;
DROP INDEX IF EXISTS idx_documents_university_id;
DROP INDEX IF EXISTS idx_users_batch_year;
DROP INDEX IF EXISTS idx_users_branch_id;
DROP INDEX IF EXISTS idx_users_university_id;

ALTER TABLE documents
  DROP COLUMN IF EXISTS batch_year,
  DROP COLUMN IF EXISTS branch_id,
  DROP COLUMN IF EXISTS university_id;

ALTER TABLE users
  DROP COLUMN IF EXISTS batch_year,
  DROP COLUMN IF EXISTS branch_id,
  DROP COLUMN IF EXISTS university_id,
  DROP COLUMN IF EXISTS bio;

DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
DROP TRIGGER IF EXISTS update_universities_updated_at ON universities;

DROP INDEX IF EXISTS idx_branches_name;
DROP INDEX IF EXISTS idx_branches_deleted_at;
DROP INDEX IF EXISTS idx_branches_university_id;
DROP INDEX IF EXISTS idx_universities_name;
DROP INDEX IF EXISTS idx_universities_deleted_at;

DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS universities;
