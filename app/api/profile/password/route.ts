import { handleChangePassword } from '@/modules/profile/module.api';
import type { NextRequest } from 'next/server';

export const POST = (req: NextRequest) => handleChangePassword(req);
