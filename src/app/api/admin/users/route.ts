import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserQuotaInfo } from '@/lib/server-utils';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const users = db.prepare(`
    SELECT id, email, preferred_name, roblox_username, discord_username, role, status, created_at
    FROM users
    ORDER BY created_at DESC
  `).all() as any[];

  const usersWithQuota = users.map((u) => ({
    ...u,
    quota: getUserQuotaInfo(u.id)
  }));

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
    const db = getDb();

    if (action === 'approval') {
      const { status } = body;
      if (!['ACTIVE', 'DECLINED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, target_user_id);

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(
        target_user_id,
        `Account Request ${status === 'ACTIVE' ? 'Approved' : 'Declined'}`,
        status === 'ACTIVE'
          ? 'Your registration request has been approved! Welcome to the Oxton Staff Portal.'
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

      const targetUser = db.prepare(`SELECT role FROM users WHERE id = ?`).get(target_user_id) as any;
      if (targetUser?.role === 'FOUNDER') {
        return NextResponse.json({ error: 'Founder role cannot be modified' }, { status: 400 });
      }

      db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, target_user_id);

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'INFO')
      `).run(
        target_user_id,
        'Role Updated',
        `Your portal role has been updated to ${role} by the Founder.`
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Admin user update error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
