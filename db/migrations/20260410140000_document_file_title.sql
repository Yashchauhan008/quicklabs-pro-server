-- migrate:up
ALTER TABLE document_files
  ADD COLUMN IF NOT EXISTS title VARCHAR(50);

UPDATE document_files df
SET title = LEFT(
  COALESCE(
    NULLIF(regexp_replace(f.key, '^.*[/\\\\]', ''), ''),
    'Untitled'
  ),
  50
)
FROM files f
WHERE f.id = df.file_id
  AND (df.title IS NULL OR TRIM(df.title) = '');

UPDATE document_files
SET title = 'Untitled'
WHERE title IS NULL OR TRIM(title) = '';

ALTER TABLE document_files
  ALTER COLUMN title SET NOT NULL;

-- migrate:down
ALTER TABLE document_files DROP COLUMN IF EXISTS title;
