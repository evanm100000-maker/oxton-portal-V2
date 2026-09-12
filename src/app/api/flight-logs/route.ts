import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getFlightLogsList, createFlightLog, updateFlightLog, createNotification, getFlightsList } from '@/lib/firebase-db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'luma-staff-portal-secret-key-2024';

async function getUserFromToken() {
  const token = cookies().get('auth_token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function GET() {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await getFlightLogsList();
    const isExecutive = user.role === 'ADMIN' || user.role === 'FOUNDER';
    const userLogs = isExecutive ? logs : logs.filter((l) => Number(l.user_id) === Number(user.id));
    
    // Sort latest first
    userLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ logs: userLogs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { flight_id, role_flown, proof_notes } = body;

    if (!flight_id || !role_flown) {
      return NextResponse.json({ error: 'Flight selection and role flown are required' }, { status: 400 });
    }

    const flights = await getFlightsList();
    const flight = flights.find((f) => Number(f.id) === Number(flight_id));

    if (!flight) {
      return NextResponse.json({ error: 'Selected flight not found' }, { status: 404 });
    }

    // Verify flight is from today (local/UTC date check)
    const flightDateStr = new Date(flight.datetime_utc).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    if (flightDateStr !== todayStr) {
      return NextResponse.json({ error: 'You can only leave flight logs for flights taking place today!' }, { status: 400 });
    }

    const logData = {
      user_id: user.id,
      user_name: user.preferred_name,
      roblox_username: user.roblox_username,
      flight_id: flight.id,
      flight_code: flight.flight_code,
      flight_date: flight.datetime_utc,
      role_flown,
      proof_notes: proof_notes || '',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    // Save to Firebase RTDB
    const newLog = await createFlightLog(logData);

    // Save to SQLite
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO flight_logs (user_id, flight_id, flight_code, flight_date, role_flown, proof_notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user.id, flight.id, flight.flight_code, flight.datetime_utc, role_flown, proof_notes || '', 'PENDING');
    } catch (e) {
      console.error('SQLite flight log insert error:', e);
    }

    return NextResponse.json({ success: true, log: newLog });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getUserFromToken();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { log_id, action, admin_notes } = body; // action: 'ACCEPT' | 'REJECT'

    if (!log_id || !['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const logs = await getFlightLogsList();
    const targetLog = logs.find((l) => Number(l.id) === Number(log_id));

    if (!targetLog) {
      return NextResponse.json({ error: 'Flight log not found' }, { status: 404 });
    }

    const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

    await updateFlightLog(Number(log_id), {
      status: newStatus,
      admin_notes: admin_notes || '',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });

    // Save to SQLite
    try {
      const db = getDb();
      db.prepare(`
        UPDATE flight_logs
        SET status = ?, admin_notes = ?, reviewed_by = ?
        WHERE id = ?
      `).run(newStatus, admin_notes || '', user.id, Number(log_id));
    } catch (e) {}

    // Notify user
    const msg = action === 'ACCEPT'
      ? `Your flight log for ${targetLog.flight_code} was ACCEPTED! +1 added to your weekly quota.`
      : `Your flight log for ${targetLog.flight_code} was REJECTED.${admin_notes ? ` Reason: ${admin_notes}` : ''}`;

    await createNotification(targetLog.user_id, `Flight Log ${newStatus}`, msg, action === 'ACCEPT' ? 'SUCCESS' : 'WARNING');

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
