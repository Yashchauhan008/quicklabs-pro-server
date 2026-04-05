-- migrate:up
-- Classify informational vs lab at document level (same subject can hold both).

CREATE TYPE document_kind AS ENUM ('informational', 'lab_solutions');

ALTER TABLE documents
  ADD COLUMN kind document_kind NOT NULL DEFAULT 'informational';

-- Carry over legacy per-subject classification onto every document in that subject (requires subjects.kind from prior migration).
UPDATE documents d
SET kind = CASE s.kind::text
  WHEN 'lab_solutions' THEN 'lab_solutions'::document_kind
  ELSE 'informational'::document_kind
END
FROM subjects s
WHERE d.subject_id = s.id;

CREATE INDEX idx_documents_kind ON documents(kind);

DROP INDEX IF EXISTS idx_subjects_kind;
ALTER TABLE subjects DROP COLUMN IF EXISTS kind;
DROP TYPE IF EXISTS subject_kind;

-- migrate:down
CREATE TYPE subject_kind AS ENUM ('informational', 'lab_solutions');

ALTER TABLE subjects
  ADD COLUMN kind subject_kind NOT NULL DEFAULT 'informational';

CREATE INDEX idx_subjects_kind ON subjects(kind);

DROP INDEX IF EXISTS idx_documents_kind;
ALTER TABLE documents DROP COLUMN IF EXISTS kind;
DROP TYPE IF EXISTS document_kind;
