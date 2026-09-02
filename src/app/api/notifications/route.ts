import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getNotificationsList, markNotificationsAsRead } from '@/lib/firebase-db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notifications = await getNotificationsList(user.id);
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await markNotificationsAsRead(user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update notifications' }, { status: 500 });
  }
}
