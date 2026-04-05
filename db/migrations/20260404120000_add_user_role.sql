-- migrate:up
CREATE TYPE user_role AS ENUM ('admin', 'student');

ALTER TABLE users
  ADD COLUMN role user_role NOT NULL DEFAULT 'student';

UPDATE users SET role = 'admin' WHERE email = 'yashchauhan1775@gmail.com';

CREATE INDEX idx_users_role ON users(role);

COMMENT ON COLUMN users.role IS 'Access scope: use /api/admin/* vs /api/students/*';

-- migrate:down
DROP INDEX IF EXISTS idx_users_role;
ALTER TABLE users DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS user_role;
