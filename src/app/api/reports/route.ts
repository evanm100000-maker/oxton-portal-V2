import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  let reports: any[];

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    reports = db.prepare(`
      SELECT r.*, u.preferred_name as reporter_name, u.roblox_username as reporter_roblox
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
    `).all();
  } else {
    reports = db.prepare(`
      SELECT r.*, u.preferred_name as reporter_name, u.roblox_username as reporter_roblox
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      WHERE r.reporter_id = ?
      ORDER BY r.created_at DESC
    `).all(user.id);
  }

  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, target_username, subject, description } = await request.json();

    if (!type || !['USER', 'BUG', 'OTHER'].includes(type) || !subject || !description) {
      return NextResponse.json({ error: 'Missing required report fields' }, { status: 400 });
    }

    if (type === 'USER' && (!target_username || target_username.trim() === '')) {
      return NextResponse.json({ error: 'Target Roblox username is required for user reports' }, { status: 400 });
    }

    const db = getDb();
    const res = db.prepare(`
      INSERT INTO reports (reporter_id, type, target_username, subject, description, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `).run(user.id, type, target_username ? target_username.trim() : null, subject.trim(), description.trim());

    return NextResponse.json({ success: true, reportId: Number(res.lastInsertRowid) });
  } catch (err) {
    console.error('Report submission error:', err);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, status, admin_notes } = await request.json();

    if (!id || !['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      UPDATE reports
      SET status = ?, admin_notes = ?
      WHERE id = ?
    `).run(status, admin_notes || '', id);

    const report = db.prepare(`SELECT reporter_id, subject FROM reports WHERE id = ?`).get(id) as any;
    if (report) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'INFO')
      `).run(
        report.reporter_id,
        `Report Status Updated`,
        `Your report "${report.subject}" has been marked as ${status.replace('_', ' ')}.`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Report update error:', err);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
