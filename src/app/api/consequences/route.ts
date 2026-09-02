import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  let consequences: any[];

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    consequences = db.prepare(`
      SELECT c.*, u.preferred_name as target_name, u.roblox_username as target_roblox,
             issuer.preferred_name as issuer_name
      FROM consequences c
      JOIN users u ON c.user_id = u.id
      JOIN users issuer ON c.issuer_id = issuer.id
      ORDER BY c.created_at DESC
    `).all();
  } else {
    consequences = db.prepare(`
      SELECT c.*, u.preferred_name as target_name, u.roblox_username as target_roblox,
             issuer.preferred_name as issuer_name
      FROM consequences c
      JOIN users u ON c.user_id = u.id
      JOIN users issuer ON c.issuer_id = issuer.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).all(user.id);
  }

  return NextResponse.json({ consequences });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { user_id, type, reason, notes } = await request.json();

    if (!user_id || !type || !['INFORMAL_SANCTION', 'INFRACTION', 'SUSPENSION'].includes(type) || !reason) {
      return NextResponse.json({ error: 'Missing required consequence parameters' }, { status: 400 });
    }

    const db = getDb();

    // Check target user
    const targetUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user_id) as any;
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Insert consequence
    const res = db.prepare(`
      INSERT INTO consequences (user_id, issuer_id, type, reason, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, user.id, type, reason.trim(), notes ? notes.trim() : null);

    // If suspension, update user status to SUSPENDED
    if (type === 'SUSPENSION') {
      db.prepare(`UPDATE users SET status = 'SUSPENDED' WHERE id = ?`).run(user_id);
    }

    // Send Notification
    const readableType = type.replace('_', ' ');
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'CONSEQUENCE')
    `).run(
      user_id,
      `New Disciplinary Action: ${readableType}`,
      `You received a ${readableType}. Reason: ${reason}`
    );

    return NextResponse.json({ success: true, consequenceId: Number(res.lastInsertRowid) });
  } catch (err) {
    console.error('Consequence issue error:', err);
    return NextResponse.json({ error: 'Failed to issue consequence' }, { status: 500 });
  }
}
