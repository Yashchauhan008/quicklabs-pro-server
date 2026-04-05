-- migrate:up
CREATE TYPE subject_kind AS ENUM ('informational', 'lab_solutions');

ALTER TABLE subjects
  ADD COLUMN kind subject_kind NOT NULL DEFAULT 'informational';

CREATE INDEX idx_subjects_kind ON subjects(kind);

ALTER TABLE users
  ADD COLUMN social_profiles JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE document_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    rated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (document_id, rated_by)
);

CREATE INDEX idx_document_ratings_document ON document_ratings(document_id);
CREATE INDEX idx_document_ratings_rated_by ON document_ratings(rated_by);

CREATE TABLE student_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rated_student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rated_student_id, rated_by),
    CHECK (rated_student_id <> rated_by)
);

CREATE INDEX idx_student_ratings_student ON student_ratings(rated_student_id);
CREATE INDEX idx_student_ratings_rated_by ON student_ratings(rated_by);

CREATE TYPE enquiry_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TABLE enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status enquiry_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enquiries_student_id ON enquiries(student_id);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_enquiries_created_at ON enquiries(created_at DESC);

CREATE TRIGGER update_enquiries_updated_at BEFORE UPDATE ON enquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE user_daily_usage (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    uploads_count INTEGER NOT NULL DEFAULT 0 CHECK (uploads_count >= 0),
    downloads_count INTEGER NOT NULL DEFAULT 0 CHECK (downloads_count >= 0),
    PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX idx_user_daily_usage_date ON user_daily_usage(usage_date);

-- migrate:down
DROP TABLE IF EXISTS user_daily_usage;
DROP TRIGGER IF EXISTS update_enquiries_updated_at ON enquiries;
DROP TABLE IF EXISTS enquiries;
DROP TYPE IF EXISTS enquiry_status;
DROP TABLE IF EXISTS student_ratings;
DROP TABLE IF EXISTS document_ratings;
ALTER TABLE users DROP COLUMN IF EXISTS social_profiles;
DROP INDEX IF EXISTS idx_subjects_kind;
ALTER TABLE subjects DROP COLUMN IF EXISTS kind;
DROP TYPE IF EXISTS subject_kind;
