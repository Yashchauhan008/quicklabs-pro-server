-- migrate:up
ALTER TABLE users
  ADD COLUMN profile_picture_file_id UUID REFERENCES files(id) ON DELETE SET NULL;

CREATE INDEX idx_users_profile_picture_file ON users(profile_picture_file_id);

-- migrate:down
DROP INDEX IF EXISTS idx_users_profile_picture_file;
ALTER TABLE users DROP COLUMN IF EXISTS profile_picture_file_id;
