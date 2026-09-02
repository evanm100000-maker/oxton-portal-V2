import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersList, updateUser, createNotification } from '@/lib/firebase-db';
import { getUserQuotaInfo } from '@/lib/server-utils';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getUsersList();

  const usersWithQuota = await Promise.all(
    users.map(async (u: any) => ({
      ...u,
      quota: await getUserQuotaInfo(u.id)
    }))
  );

  return NextResponse.json({ users: usersWithQuota });
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, target_user_id } = body;

    if (action === 'approval') {
      const { status } = body;
      if (!['ACTIVE', 'DECLINED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      await updateUser(Number(target_user_id), { status });

      await createNotification(
        Number(target_user_id),
        `Account Request ${status === 'ACTIVE' ? 'Approved' : 'Declined'}`,
        status === 'ACTIVE'
          ? 'Your registration request has been approved! Welcome to the Luma Airways Staff Portal.'
          : 'Your registration request was declined.',
        status === 'ACTIVE' ? 'SUCCESS' : 'WARNING'
      );

      return NextResponse.json({ success: true });
    }

    if (action === 'update_role') {
      if (currentUser.role !== 'FOUNDER') {
        return NextResponse.json({
          error: 'Only the Founder can add or remove users from the Admin team.'
        }, { status: 403 });
      }

      const { role } = body;
      if (!['ADMIN', 'STAFF'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const users = await getUsersList();
      const targetUser = users.find((u) => Number(u.id) === Number(target_user_id));

      if (targetUser?.role === 'FOUNDER') {
        return NextResponse.json({ error: 'Founder role cannot be modified' }, { status: 400 });
      }

      await updateUser(Number(target_user_id), { role });

      await createNotification(
        Number(target_user_id),
        'Role Updated',
        `Your portal role has been updated to ${role} by the Founder.`
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin user update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: 500 });
  }
}
