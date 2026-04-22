/** Shared SELECT for pinned peer rows (bookmark list + profile payload). */
export const pinnedPeersFromBookmarks = `
SELECT 
  u.id,
  u.name,
  u.social_profiles,
  u.bio,
  u.created_at,
  u.batch_year,
  u.semester,
  u.university_id,
  u.branch_id,
  uni.name AS university_name,
  ulf.key AS university_logo_key,
  br.name AS branch_name,
  u.role,
  b.created_at AS pinned_at,
  pf.key AS profile_picture_key,
  (SELECT COALESCE(ROUND(AVG(sr.stars)::numeric, 2), 0) FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_avg,
  (SELECT COUNT(*)::int FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_count,
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
FROM student_peer_bookmarks b
INNER JOIN users u ON u.id = b.peer_id AND u.role = 'student'
LEFT JOIN files pf ON pf.id = u.profile_picture_file_id
LEFT JOIN universities uni ON uni.id = u.university_id
LEFT JOIN files ulf ON ulf.id = uni.logo_file_id
LEFT JOIN branches br ON br.id = u.branch_id
WHERE b.student_id = $1
ORDER BY b.created_at DESC
`;
