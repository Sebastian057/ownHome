import { handleGetUsers, handleCreateUser } from '@/modules/admin/module.api';
import type { NextRequest } from 'next/server';

export const GET = () => handleGetUsers();
export const POST = (req: NextRequest) => handleCreateUser(req);
