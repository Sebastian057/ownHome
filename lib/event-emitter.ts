import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { EventName } from '@/types/common.types';

export const eventEmitter = {
  async emit(
    name: EventName,
    payload: Prisma.InputJsonObject,
    userId: string,
    scheduledAt?: Date
  ): Promise<void> {
    await prisma.scheduledEvent.create({
      data: {
        name,
        payload,
        userId,
        scheduledAt: scheduledAt ?? new Date(),
      },
    });
  },
};
