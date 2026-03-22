import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { profileRepository } from '@/modules/profile/module.repository';
import { profileService } from '@/modules/profile/module.service';

const BUCKET = 'avatars';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return apiError('UNAUTHORIZED', 401);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError('VALIDATION_ERROR', 400, 'Nieprawidłowe dane formularza');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return apiError('VALIDATION_ERROR', 400, 'Brak pliku');
  }
  if (!file.type.startsWith('image/')) {
    return apiError('VALIDATION_ERROR', 400, 'Dozwolone tylko pliki graficzne');
  }
  if (file.size > MAX_SIZE) {
    return apiError('VALIDATION_ERROR', 400, 'Plik zbyt duży (max 5 MB)');
  }

  const rawExt = file.name.split('.').pop() ?? 'jpg';
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'jpg';
  const path = `${session.userId}/avatar.${ext}`;

  const supabase = await createSupabaseAdminClient();

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return apiError('INTERNAL_ERROR', 500, uploadError.message);
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Append timestamp to bust CDN cache on re-upload
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  await profileRepository.update(session.userId, { avatarUrl });
  const profile = await profileService.getByUserId(session.userId);
  return apiSuccess(profile);
}
