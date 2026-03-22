import { prisma } from '@/lib/prisma';

type ProfileDbFields = {
  phone?: string | null;
  language?: string;
  theme?: string;
  avatarUrl?: string | null;
};

export const profileRepository = {
  async getByUserId(userId: string) {
    return prisma.userProfile.findUnique({
      where: { userId },
    });
  },

  async create(data: { userId: string; role?: string }) {
    return prisma.userProfile.create({
      data: {
        userId: data.userId,
        role: data.role ?? 'user',
      },
    });
  },

  async update(userId: string, data: ProfileDbFields) {
    return prisma.userProfile.update({
      where: { userId },
      data,
    });
  },

  async count() {
    return prisma.userProfile.count();
  },
};
