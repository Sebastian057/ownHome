import { handleUpdateRole, handleDeleteUser } from '@/modules/admin/module.api';
import type { NextRequest } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateRole(req, id);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteUser(req, id);
}
