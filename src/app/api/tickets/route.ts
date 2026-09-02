import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTicketsList, createTicket, addTicketMessage, updateTicket, getUsersList } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tickets = await getTicketsList();
  const users = await getUsersList();

  const enriched = tickets.map((t: any) => {
    const owner = users.find((usr: any) => Number(usr.id) === Number(t.user_id));
    return {
      ...t,
      roblox_username: owner?.roblox_username || 'Unknown',
      preferred_name: owner?.preferred_name || 'Staff Member'
    };
  });

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    return NextResponse.json({ tickets: enriched }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }

  const myTickets = enriched.filter((t: any) => Number(t.user_id) === Number(user.id));
  return NextResponse.json({ tickets: myTickets }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { subject, priority, initial_message } = body;

      if (!subject || !initial_message) {
        return NextResponse.json({ error: 'Subject and initial message are required' }, { status: 400 });
      }

      const ticket = await createTicket(
        { user_id: user.id, subject, priority: priority || 'MEDIUM', status: 'OPEN' },
        initial_message,
        user.preferred_name,
        user.role
      );

      return NextResponse.json({ ticket }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }

    if (action === 'reply') {
      const { ticket_id, message } = body;

      if (!ticket_id || !message) {
        return NextResponse.json({ error: 'Ticket ID and message required' }, { status: 400 });
      }

      await addTicketMessage(Number(ticket_id), user.id, user.preferred_name, user.role, message);
      return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ticket operation failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    }

    await updateTicket(Number(id), { status });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update ticket status' }, { status: 500 });
  }
}
