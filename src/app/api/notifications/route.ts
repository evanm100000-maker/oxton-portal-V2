import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(user.id);

  const unreadCount = notifications.filter((n: any) => n.is_read === 0).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { notification_id, mark_all } = await request.json();
    const db = getDb();

    if (mark_all) {
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(user.id);
    } else if (notification_id) {
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(notification_id, user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Notification update error:', err);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
