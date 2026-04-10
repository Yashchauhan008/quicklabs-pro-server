-- migrate:up
CREATE TABLE IF NOT EXISTS document_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
    is_main BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_files_document_id ON document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_document_files_file_id ON document_files(file_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_files_one_main_per_document
    ON document_files (document_id)
    WHERE is_main = true;

CREATE OR REPLACE FUNCTION enforce_document_files_max_ten()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COUNT(*)::int
        FROM document_files
        WHERE document_id = NEW.document_id
    ) >= 10 THEN
        RAISE EXCEPTION 'A document cannot have more than 10 files';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_files_max_ten ON document_files;
CREATE TRIGGER document_files_max_ten
    BEFORE INSERT ON document_files
    FOR EACH ROW
    EXECUTE FUNCTION enforce_document_files_max_ten();

-- Backfill only for documents that still have file_id and no row yet (re-runs safe)
INSERT INTO document_files (document_id, file_id, is_main, sort_order)
SELECT d.id, d.file_id, true, 0
FROM documents d
WHERE d.file_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM document_files df WHERE df.document_id = d.id
  );

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_file_id_fkey;
DROP INDEX IF EXISTS idx_documents_file_id;
ALTER TABLE documents DROP COLUMN IF EXISTS file_id;

-- migrate:down
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES files(id) ON DELETE RESTRICT;

UPDATE documents d
SET file_id = df.file_id
FROM document_files df
WHERE df.document_id = d.id AND df.is_main = true AND d.deleted_at IS NULL;

UPDATE documents d
SET file_id = sub.file_id
FROM (
    SELECT DISTINCT ON (document_id) document_id, file_id
    FROM document_files
    ORDER BY document_id, sort_order, id
) sub
WHERE d.id = sub.document_id AND d.file_id IS NULL;

ALTER TABLE documents ALTER COLUMN file_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_file_id ON documents(file_id);

DROP TRIGGER IF EXISTS document_files_max_ten ON document_files;
DROP FUNCTION IF EXISTS enforce_document_files_max_ten();

DROP INDEX IF EXISTS uq_document_files_one_main_per_document;
DROP INDEX IF EXISTS idx_document_files_file_id;
DROP INDEX IF EXISTS idx_document_files_document_id;

DROP TABLE IF EXISTS document_files;
