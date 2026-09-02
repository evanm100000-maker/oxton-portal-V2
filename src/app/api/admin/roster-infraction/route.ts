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
    SELECT id, email, preferred_name, roblox_username, discord_username, role, status
    FROM users
    WHERE status = 'ACTIVE'
    ORDER BY preferred_name ASC
  `).all() as any[];

  const rosterStatus = users.map((u) => {
    const quota = getUserQuotaInfo(u.id);
    const isCompliant = quota.completedThisWeek >= quota.requiredQuota;
    return {
      user: u,
      quota,
      isCompliant
    };
  });

  return NextResponse.json({ roster: rosterStatus });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { target_user_id } = await request.json();

    if (!target_user_id) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
    }

    const db = getDb();
    const targetUser = db.prepare(`SELECT preferred_name FROM users WHERE id = ?`).get(target_user_id) as any;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const quota = getUserQuotaInfo(target_user_id);
    if (quota.statusBadge !== 'ACTIVE') {
      return NextResponse.json({
        error: `Cannot issue infraction: User is currently on ${quota.statusBadge}`
      }, { status: 400 });
    }

    const reason = `Missed Weekly Quota (${quota.completedThisWeek}/${quota.requiredQuota} flights completed)`;

    const res = db.prepare(`
      INSERT INTO consequences (user_id, issuer_id, type, reason, notes)
      VALUES (?, ?, 'INFRACTION', ?, 'Automated roster non-compliance infraction issued by Admin')
    `).run(target_user_id, user.id, reason);

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'CONSEQUENCE')
    `).run(
      target_user_id,
      'Infraction Issued: Missed Weekly Quota',
      `You have been issued an Infraction for failing to meet your weekly quota of ${quota.requiredQuota} flights.`
    );

    return NextResponse.json({ success: true, consequenceId: Number(res.lastInsertRowid) });
  } catch (err) {
    console.error('Roster infraction error:', err);
    return NextResponse.json({ error: 'Failed to issue roster infraction' }, { status: 500 });
  }
}
