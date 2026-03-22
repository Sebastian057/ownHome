import { AppError } from '@/types/common.types';
import { adminRepository } from './module.repository';
import { profileRepository } from '@/modules/profile/module.repository';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import type { CreateUserDto, UpdateRoleDto, AdminUserView } from './module.types';

async function requireAdmin(userId: string) {
  const profile = await profileRepository.getByUserId(userId);
  if (!profile || profile.role !== 'admin') {
    throw new AppError('FORBIDDEN', 'Brak uprawnień administratora');
  }
  return profile;
}

export const adminService = {
  async getUsers(adminUserId: string): Promise<AdminUserView[]> {
    await requireAdmin(adminUserId);

    const profiles = await adminRepository.getAllProfiles();
    if (profiles.length === 0) return [];

    // Pobierz dane z Supabase Auth i złącz z profilami
    const supabase = await createSupabaseAdminClient();
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map(authUsers.map((u) => [u.id, u]));

    return profiles.map((profile): AdminUserView => {
      const authUser = authMap.get(profile.userId);
      const meta = authUser?.user_metadata ?? {};
      const fullName =
        (meta.full_name as string | undefined) ??
        (meta.display_name as string | undefined) ??
        (meta.name as string | undefined) ??
        null;
      return {
        id: profile.id,
        userId: profile.userId,
        fullName,
        email: authUser?.email ?? null,
        phone: profile.phone,
        role: profile.role,
        createdAt: profile.createdAt,
      };
    });
  },

  async createUser(data: CreateUserDto, adminUserId: string): Promise<AdminUserView> {
    await requireAdmin(adminUserId);

    // Utwórz użytkownika w Supabase Auth z full_name w user_metadata.
    // Trigger handle_new_user() automatycznie tworzy user_profiles.
    const supabase = await createSupabaseAdminClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        throw new AppError('CONFLICT', 'Użytkownik z tym adresem email już istnieje');
      }
      throw new AppError('INTERNAL_ERROR', authError.message);
    }

    if (!authData.user) {
      throw new AppError('INTERNAL_ERROR', 'Nie udało się utworzyć użytkownika');
    }

    // Trigger może potrzebować chwili — odczekaj i pobierz profil
    await new Promise((r) => setTimeout(r, 400));
    const profile = await profileRepository.getByUserId(authData.user.id);
    if (!profile) throw new AppError('INTERNAL_ERROR', 'Profil użytkownika nie został utworzony przez trigger');

    return {
      id: profile.id,
      userId: profile.userId,
      fullName: data.fullName,
      email: data.email,
      phone: null,
      role: profile.role,
      createdAt: profile.createdAt,
    };
  },

  async updateRole(targetUserId: string, data: UpdateRoleDto, adminUserId: string): Promise<AdminUserView> {
    await requireAdmin(adminUserId);

    const targetProfile = await adminRepository.getProfileByUserId(targetUserId);
    if (!targetProfile) throw new AppError('NOT_FOUND');

    if (targetUserId === adminUserId && data.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Nie możesz odebrać sobie roli administratora');
    }

    const updated = await adminRepository.updateRole(targetUserId, data.role);

    // Pobierz dane auth
    const supabase = await createSupabaseAdminClient();
    const { data: authData } = await supabase.auth.admin.getUserById(targetUserId);
    const meta2 = authData.user?.user_metadata ?? {};
    const updatedFullName =
      (meta2.full_name as string | undefined) ??
      (meta2.display_name as string | undefined) ??
      (meta2.name as string | undefined) ??
      null;

    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updatedFullName,
      email: authData.user?.email ?? null,
      phone: updated.phone,
      role: updated.role,
      createdAt: updated.createdAt,
    };
  },

  async deleteUser(targetUserId: string, adminUserId: string): Promise<void> {
    await requireAdmin(adminUserId);

    if (targetUserId === adminUserId) {
      throw new AppError('FORBIDDEN', 'Nie możesz usunąć własnego konta');
    }

    const targetProfile = await adminRepository.getProfileByUserId(targetUserId);
    if (!targetProfile) throw new AppError('NOT_FOUND');

    const supabase = await createSupabaseAdminClient();
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);
    if (deleteError) throw new AppError('INTERNAL_ERROR', deleteError.message);

    await adminRepository.deleteProfile(targetUserId);
  },
};
