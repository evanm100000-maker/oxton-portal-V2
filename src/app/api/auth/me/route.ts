import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserQuotaInfo, getUserActiveLOA } from '@/lib/server-utils';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quota = getUserQuotaInfo(user.id);
  const activeLoa = getUserActiveLOA(user.id);

  return NextResponse.json({
    user: {
      ...user,
      quota,
      active_loa: activeLoa
    }
  });
}
