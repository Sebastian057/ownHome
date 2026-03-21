import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { apiError } from '@/lib/api-response';
import type { NextResponse } from 'next/server';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
});

export async function withRateLimit(
  identifier: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const { success } = await ratelimit.limit(identifier);
  if (!success) return apiError('FORBIDDEN', 429) as unknown as NextResponse;
  return handler();
}
