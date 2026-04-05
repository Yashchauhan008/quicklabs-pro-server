/** Public profile fields + optional avatar key (map to profile_picture_url in API). */
export const userProfileWithPictureSql = `
SELECT
  u.id,
  u.name,
  u.email,
  u.role,
  u.social_profiles,
  u.created_at,
  u.updated_at,
  f.key AS profile_picture_key
FROM users u
LEFT JOIN files f ON f.id = u.profile_picture_file_id
WHERE u.id = $1
`;
