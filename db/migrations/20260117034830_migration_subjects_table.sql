-- migrate:up
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_subjects_created_by ON subjects(created_by);
CREATE INDEX idx_subjects_created_at ON subjects(created_at DESC);
CREATE INDEX idx_subjects_deleted_at ON subjects(deleted_at);
CREATE INDEX idx_subjects_name ON subjects(name);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- migrate:down
DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
DROP INDEX IF EXISTS idx_subjects_name;
DROP INDEX IF EXISTS idx_subjects_deleted_at;
DROP INDEX IF EXISTS idx_subjects_created_at;
DROP INDEX IF EXISTS idx_subjects_created_by;
DROP TABLE IF EXISTS subjects;