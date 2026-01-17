-- migrate:up
CREATE TYPE document_visibility AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visibility document_visibility DEFAULT 'PRIVATE' NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_documents_subject_id ON documents(subject_id);
CREATE INDEX idx_documents_file_id ON documents(file_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX idx_documents_title ON documents(title);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- migrate:down
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP INDEX IF EXISTS idx_documents_title;
DROP INDEX IF EXISTS idx_documents_deleted_at;
DROP INDEX IF EXISTS idx_documents_created_at;
DROP INDEX IF EXISTS idx_documents_visibility;
DROP INDEX IF EXISTS idx_documents_uploaded_by;
DROP INDEX IF EXISTS idx_documents_file_id;
DROP INDEX IF EXISTS idx_documents_subject_id;
DROP TABLE IF EXISTS documents;
DROP TYPE IF EXISTS document_visibility;