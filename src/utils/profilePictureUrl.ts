/** Public path segment (same origin as API); mount at app.use('/files/avatars', static). */
export function profilePicturePublicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/files/avatars/${encodeURIComponent(key)}`;
}

export function stripProfilePictureKey<T extends Record<string, unknown>>(
  row: T
): Omit<T, 'profile_picture_key' | 'university_logo_key'> & {
  profile_picture_url: string | null;
  university_logo_url: string | null;
} {
  const { profile_picture_key: pkey, university_logo_key: ukey, ...rest } = row as T & {
    profile_picture_key?: string | null;
    university_logo_key?: string | null;
  };
  return {
    ...rest,
    profile_picture_url: profilePicturePublicUrl(pkey),
    university_logo_url: profilePicturePublicUrl(ukey),
  } as Omit<T, 'profile_picture_key' | 'university_logo_key'> & {
    profile_picture_url: string | null;
    university_logo_url: string | null;
  };
}
