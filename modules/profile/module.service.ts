import { AppError } from '@/types/common.types';
import { profileRepository } from './module.repository';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server';
import type { UserProfile, UpdateProfileDto, Role } from './module.types';

// ─── Helper: pobierz fullName i email z Supabase Auth ────────────────────────

async function getAuthUserData(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return { fullName: null, email: null };

  // Supabase przechowuje displayName pod różnymi kluczami zależnie od źródła:
  // - full_name: ustawione przez naszą aplikację (createUser)
  // - display_name: ustawione przez Supabase Dashboard
  // - name: OAuth providers (Google, GitHub)
  const meta = data.user.user_metadata ?? {};
  const fullName =
    (meta.full_name as string | undefined) ??
    (meta.display_name as string | undefined) ??
    (meta.name as string | undefined) ??
    null;

  return {
    fullName,
    email: data.user.email ?? null,
  };
}

// ─── Helper: złącz rekord DB z danymi Auth ───────────────────────────────────

async function mergeWithAuth(
  profile: Awaited<ReturnType<typeof profileRepository.getByUserId>>,
  userId: string,
): Promise<UserProfile> {
  if (!profile) throw new AppError('NOT_FOUND');
  const { fullName, email } = await getAuthUserData(userId);
  return {
    id: profile.id,
    userId: profile.userId,
    fullName,
    email,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    language: profile.language,
    theme: profile.theme,
    role: profile.role as Role,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const profileService = {
  /**
   * Pobierz profil lub utwórz jeśli nie istnieje.
   * Pierwszy użytkownik automatycznie dostaje rolę 'admin'.
   */
  async getOrCreate(userId: string): Promise<UserProfile> {
    let profile = await profileRepository.getByUserId(userId);

    if (!profile) {
      const totalProfiles = await profileRepository.count();
      const role = totalProfiles === 0 ? 'admin' : 'user';
      profile = await profileRepository.create({ userId, role });
    }

    return mergeWithAuth(profile, userId);
  },

  async getByUserId(userId: string): Promise<UserProfile> {
    const profile = await profileRepository.getByUserId(userId);
    return mergeWithAuth(profile, userId);
  },

  async update(userId: string, data: UpdateProfileDto): Promise<UserProfile> {
    const profile = await profileRepository.getByUserId(userId);
    if (!profile) throw new AppError('NOT_FOUND');

    // Aktualizuj dane w Supabase Auth jeśli podano fullName lub email
    if (data.fullName !== undefined || data.email !== undefined) {
      const supabase = await createSupabaseServerClient();
      const authUpdate: { email?: string; data?: Record<string, unknown> } = {};
      if (data.email) authUpdate.email = data.email;
      if (data.fullName !== undefined) authUpdate.data = { full_name: data.fullName };

      const { error } = await supabase.auth.updateUser(authUpdate);
      if (error) throw new AppError('INTERNAL_ERROR', error.message);
    }

    // Aktualizuj dane aplikacji w user_profiles (bez pól auth)
    const { fullName: _fn, email: _em, ...dbData } = data;
    if (Object.keys(dbData).length > 0) {
      await profileRepository.update(userId, dbData);
    }

    return mergeWithAuth(await profileRepository.getByUserId(userId), userId);
  },
};
