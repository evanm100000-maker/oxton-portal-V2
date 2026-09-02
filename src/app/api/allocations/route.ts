import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { flight_id, status } = await request.json();

    if (!flight_id || !['ATTENDING', 'UNSURE', 'ABSENT'].includes(status)) {
      return NextResponse.json({ error: 'Invalid allocation parameter' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO flight_allocations (flight_id, user_id, status, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(flight_id, user_id) DO UPDATE SET
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `).run(flight_id, user.id, status);

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error('Error setting allocation:', err);
    return NextResponse.json({ error: 'Failed to update allocation' }, { status: 500 });
  }
}
