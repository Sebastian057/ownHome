import { prisma } from '@/lib/prisma';

export const adminRepository = {
  /**
   * Pobierz wszystkie profile — TYLKO dla admina (chronione na service layer).
   */
  async getAllProfiles() {
    return prisma.userProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async getProfileByUserId(userId: string) {
    return prisma.userProfile.findUnique({
      where: { userId },
    });
  },

  async updateRole(userId: string, role: string) {
    return prisma.userProfile.update({
      where: { userId },
      data: { role },
    });
  },

  async deleteProfile(userId: string) {
    return prisma.userProfile.delete({
      where: { userId },
    });
  },
};
