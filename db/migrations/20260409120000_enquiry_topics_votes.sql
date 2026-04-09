-- migrate:up
CREATE TYPE enquiry_topic AS ENUM ('subject', 'document', 'report', 'other');

ALTER TABLE enquiries
  RENAME COLUMN message TO description;

ALTER TABLE enquiries
  ADD COLUMN topic enquiry_topic NOT NULL DEFAULT 'other',
  ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_enquiries_topic ON enquiries(topic);
CREATE INDEX idx_enquiries_subject_id ON enquiries(subject_id);
CREATE INDEX idx_enquiries_document_id ON enquiries(document_id);
CREATE INDEX idx_enquiries_is_private ON enquiries(is_private);

CREATE TABLE enquiry_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (enquiry_id, student_id)
);

CREATE INDEX idx_enquiry_votes_enquiry_id ON enquiry_votes(enquiry_id);
CREATE INDEX idx_enquiry_votes_student_id ON enquiry_votes(student_id);

-- migrate:down
DROP TABLE IF EXISTS enquiry_votes;
DROP INDEX IF EXISTS idx_enquiries_is_private;
DROP INDEX IF EXISTS idx_enquiries_document_id;
DROP INDEX IF EXISTS idx_enquiries_subject_id;
DROP INDEX IF EXISTS idx_enquiries_topic;
ALTER TABLE enquiries
  DROP COLUMN IF EXISTS is_private,
  DROP COLUMN IF EXISTS document_id,
  DROP COLUMN IF EXISTS subject_id,
  DROP COLUMN IF EXISTS topic;
ALTER TABLE enquiries
  RENAME COLUMN description TO message;
DROP TYPE IF EXISTS enquiry_topic;
