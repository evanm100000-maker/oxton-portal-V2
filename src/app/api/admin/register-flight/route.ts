import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { flight_id, attendance_map } = await request.json();

    if (!flight_id || !attendance_map || typeof attendance_map !== 'object') {
      return NextResponse.json({ error: 'Flight ID and attendance map required' }, { status: 400 });
    }

    const db = getDb();
    const flight = db.prepare(`SELECT * FROM flights WHERE id = ?`).get(flight_id) as any;
    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    db.prepare(`UPDATE flights SET status = 'COMPLETED' WHERE id = ?`).run(flight_id);

    let processedCount = 0;
    for (const [userIdStr, status] of Object.entries(attendance_map)) {
      const userId = Number(userIdStr);
      const isAttended = (status === 'PRESENT' || status === 'LATE') ? 1 : 0;

      db.prepare(`
        INSERT INTO flight_allocations (flight_id, user_id, status, attendance_status, attended, updated_at)
        VALUES (?, ?, 'ATTENDING', ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(flight_id, user_id) DO UPDATE SET
          attendance_status = excluded.attendance_status,
          attended = excluded.attended,
          updated_at = CURRENT_TIMESTAMP
      `).run(flight_id, userId, status, isAttended);

      processedCount++;

      // Send Notification
      const statusTitle = status === 'PRESENT' ? 'Present' : status === 'LATE' ? 'Late' : 'Absent';
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(
        userId,
        `Flight Attendance Recorded: ${statusTitle}`,
        `Attendance registered for flight ${flight.flight_code}: Marked as ${statusTitle}.`,
        status === 'PRESENT' ? 'SUCCESS' : status === 'LATE' ? 'WARNING' : 'INFO'
      );
    }

    return NextResponse.json({ success: true, count: processedCount });
  } catch (err) {
    console.error('Flight register error:', err);
    return NextResponse.json({ error: 'Failed to process attendance register' }, { status: 500 });
  }
}
