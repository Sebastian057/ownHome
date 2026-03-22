import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { apiError } from '@/lib/api-response';
import type { NextResponse } from 'next/server';

// Ratelimiter jest opcjonalny — jeśli Upstash nie jest skonfigurowany,
// rate limiting jest pomijany (tryb developerski).
function createRatelimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  try {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
    });
  } catch {
    return null;
  }
}

const ratelimit = createRatelimiter();

export async function withRateLimit(
  identifier: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  if (ratelimit) {
    try {
      const { success } = await ratelimit.limit(identifier);
      if (!success) return apiError('FORBIDDEN', 429) as unknown as NextResponse;
    } catch {
      // Redis niedostępny — kontynuuj bez rate limitingu
    }
  }
  return handler();
}
