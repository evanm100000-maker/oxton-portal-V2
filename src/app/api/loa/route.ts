import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLOARequestsList, createLOARequest, updateLOARequest, getUsersList, createNotification } from '@/lib/firebase-db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const list = await getLOARequestsList();
  const users = await getUsersList();

  const enriched = list.map((r: any) => {
    const u = users.find((usr: any) => Number(usr.id) === Number(r.user_id));
    return {
      ...r,
      preferred_name: u?.preferred_name || 'Staff Member',
      roblox_username: u?.roblox_username || 'Unknown'
    };
  });

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    return NextResponse.json({ requests: enriched });
  }

  const userRequests = enriched.filter((r: any) => Number(r.user_id) === Number(user.id));
  return NextResponse.json({ requests: userRequests });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, reason, start_date, end_date } = await request.json();

    if (!type || !reason || !start_date || !end_date) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const newReq = await createLOARequest({
      user_id: user.id,
      type,
      reason,
      start_date,
      end_date,
      status: 'PENDING'
    });

    return NextResponse.json({ request: newReq });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit LOA request' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, status, admin_notes } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    }

    const requests = await getLOARequestsList();
    const targetReq = requests.find((r: any) => Number(r.id) === Number(id));

    if (!targetReq) {
      return NextResponse.json({ error: 'LOA request not found' }, { status: 404 });
    }

    await updateLOARequest(Number(id), { status, admin_notes: admin_notes || null });

    await createNotification(
      Number(targetReq.user_id),
      `LOA Request ${status}`,
      `Your ${targetReq.type} application for ${targetReq.start_date} to ${targetReq.end_date} has been ${status.toLowerCase()}.`,
      status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update LOA request' }, { status: 500 });
  }
}
