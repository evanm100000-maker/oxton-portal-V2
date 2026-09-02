import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  let requests: any[];

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    requests = db.prepare(`
      SELECT l.*, u.preferred_name, u.roblox_username, u.role as user_role
      FROM loa_requests l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
    `).all();
  } else {
    requests = db.prepare(`
      SELECT l.*, u.preferred_name, u.roblox_username
      FROM loa_requests l
      JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(user.id);
  }

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, reason, start_date, end_date } = await request.json();

    if (!type || !['LOA', 'REDUCED_ACTIVITY'].includes(type) || !reason || !start_date || !end_date) {
      return NextResponse.json({ error: 'Invalid or missing fields' }, { status: 400 });
    }

    const db = getDb();
    const res = db.prepare(`
      INSERT INTO loa_requests (user_id, type, reason, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `).run(user.id, type, reason.trim(), start_date, end_date);

    return NextResponse.json({ success: true, id: Number(res.lastInsertRowid) });
  } catch (err) {
    console.error('LOA request error:', err);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { id, status, admin_notes } = await request.json();

    if (!id || !['APPROVED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      UPDATE loa_requests
      SET status = ?, admin_notes = ?
      WHERE id = ?
    `).run(status, admin_notes || '', id);

    // Notify user
    const loaReq = db.prepare(`SELECT user_id, type FROM loa_requests WHERE id = ?`).get(id) as any;
    if (loaReq) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(
        loaReq.user_id,
        `LOA Request ${status}`,
        `Your request for ${loaReq.type} has been ${status.toLowerCase()}.${admin_notes ? ` Note: ${admin_notes}` : ''}`,
        status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('LOA update error:', err);
    return NextResponse.json({ error: 'Failed to update LOA status' }, { status: 500 });
  }
}
