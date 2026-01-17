-- migrate:up
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(500) NOT NULL UNIQUE,
    size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_files_key ON files(key);
CREATE INDEX idx_files_created_at ON files(created_at DESC);

-- migrate:down
DROP INDEX IF EXISTS idx_files_created_at;
DROP INDEX IF EXISTS idx_files_key;
DROP TABLE IF EXISTS files;