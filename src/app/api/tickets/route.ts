import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  let tickets: any[];

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    tickets = db.prepare(`
      SELECT t.*, u.preferred_name as user_name, u.roblox_username
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `).all();
  } else {
    tickets = db.prepare(`
      SELECT t.*, u.preferred_name as user_name, u.roblox_username
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(user.id);
  }

  const ticketIds = tickets.map((t) => t.id);
  let messages: any[] = [];
  if (ticketIds.length > 0) {
    const placeholders = ticketIds.map(() => '?').join(',');
    messages = db.prepare(`
      SELECT tm.*, u.preferred_name as sender_name, u.role as sender_role
      FROM ticket_messages tm
      JOIN users u ON tm.sender_id = u.id
      WHERE tm.ticket_id IN (${placeholders})
      ORDER BY tm.created_at ASC
    `).all(...ticketIds);
  }

  const ticketsWithMessages = tickets.map((ticket) => ({
    ...ticket,
    messages: messages.filter((m) => m.ticket_id === ticket.id)
  }));

  return NextResponse.json({ tickets: ticketsWithMessages });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = getDb();

    if (body.action === 'reply') {
      const { ticket_id, message } = body;
      if (!ticket_id || !message || message.trim() === '') {
        return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
      }

      db.prepare(`
        INSERT INTO ticket_messages (ticket_id, sender_id, message)
        VALUES (?, ?, ?)
      `).run(ticket_id, user.id, message.trim());

      const ticket = db.prepare(`SELECT user_id, subject FROM support_tickets WHERE id = ?`).get(ticket_id) as any;
      if (ticket && user.id !== ticket.user_id) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'INFO')
        `).run(ticket.user_id, 'New Support Ticket Reply', `You received a response on ticket "${ticket.subject}".`);
      }

      return NextResponse.json({ success: true });
    } else {
      const { subject, priority, initial_message } = body;
      if (!subject || !initial_message) {
        return NextResponse.json({ error: 'Subject and initial message are required' }, { status: 400 });
      }

      const res = db.prepare(`
        INSERT INTO support_tickets (user_id, subject, priority, status)
        VALUES (?, ?, ?, 'OPEN')
      `).run(user.id, subject.trim(), priority || 'MEDIUM');

      const ticketId = Number(res.lastInsertRowid);

      db.prepare(`
        INSERT INTO ticket_messages (ticket_id, sender_id, message)
        VALUES (?, ?, ?)
      `).run(ticketId, user.id, initial_message.trim());

      return NextResponse.json({ success: true, ticketId });
    }
  } catch (err) {
    console.error('Ticket post error:', err);
    return NextResponse.json({ error: 'Failed to process support ticket' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, status } = await request.json();

    if (!id || !['OPEN', 'IN_PROGRESS', 'ESCALATED', 'CLOSED', 'DISMISSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      UPDATE support_tickets
      SET status = ?
      WHERE id = ?
    `).run(status, id);

    const ticket = db.prepare(`SELECT user_id, subject FROM support_tickets WHERE id = ?`).get(id) as any;
    if (ticket) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'INFO')
      `).run(ticket.user_id, 'Support Ticket Update', `Ticket "${ticket.subject}" status changed to ${status}.`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Ticket update error:', err);
    return NextResponse.json({ error: 'Failed to update ticket status' }, { status: 500 });
  }
}
