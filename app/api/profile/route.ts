import { handleGetProfile, handleUpdateProfile } from '@/modules/profile/module.api';
import type { NextRequest } from 'next/server';

export const GET = () => handleGetProfile();
export const PATCH = (req: NextRequest) => handleUpdateProfile(req);
