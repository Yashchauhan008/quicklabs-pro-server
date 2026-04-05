/** Shared SELECT for pinned peer rows (bookmark list + profile payload). */
export const pinnedPeersFromBookmarks = `
SELECT 
  u.id,
  u.name,
  u.social_profiles,
  u.role,
  b.created_at AS pinned_at,
  pf.key AS profile_picture_key,
  (SELECT COALESCE(ROUND(AVG(sr.stars)::numeric, 2), 0) FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_avg,
  (SELECT COUNT(*)::int FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_count
FROM student_peer_bookmarks b
INNER JOIN users u ON u.id = b.peer_id AND u.role = 'student'
LEFT JOIN files pf ON pf.id = u.profile_picture_file_id
WHERE b.student_id = $1
ORDER BY b.created_at DESC
`;
