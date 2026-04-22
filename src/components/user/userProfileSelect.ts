/** Public profile fields + optional avatar key (map to profile_picture_url in API). */
export const userProfileWithPictureSql = `
SELECT
  u.id,
  u.name,
  u.email,
  u.role,
  u.social_profiles,
  u.bio,
  u.batch_year,
  u.semester,
  u.university_id,
  u.branch_id,
  uni.name AS university_name,
  ulf.key AS university_logo_key,
  br.name AS branch_name,
  u.created_at,
  u.updated_at,
  f.key AS profile_picture_key,
  (
    SELECT COUNT(*)::int
    FROM subjects s
    WHERE s.created_by = u.id AND s.deleted_at IS NULL
  ) AS total_courses,
  (
    SELECT COUNT(*)::int
    FROM documents d
    WHERE d.uploaded_by = u.id AND d.deleted_at IS NULL
  ) AS total_files
FROM users u
LEFT JOIN files f ON f.id = u.profile_picture_file_id
LEFT JOIN universities uni ON uni.id = u.university_id
LEFT JOIN files ulf ON ulf.id = uni.logo_file_id
LEFT JOIN branches br ON br.id = u.branch_id
WHERE u.id = $1
`;
