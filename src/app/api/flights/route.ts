import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const flights = db.prepare(`SELECT * FROM flights ORDER BY datetime_utc DESC`).all() as any[];

  const allocationsStmt = db.prepare(`
    SELECT fa.flight_id, fa.status, fa.attended, u.id as user_id, u.preferred_name, u.roblox_username, u.role
    FROM flight_allocations fa
    JOIN users u ON fa.user_id = u.id
    WHERE u.status = 'ACTIVE'
  `);
  const allAllocations = allocationsStmt.all() as any[];

  const flightsWithDetails = flights.map((flight) => {
    const flightAllocations = allAllocations.filter((a) => a.flight_id === flight.id);
    const myAllocation = flightAllocations.find((a) => a.user_id === user.id);

    return {
      ...flight,
      my_status: myAllocation?.status || 'UNSURE',
      allocations: flightAllocations
    };
  });

  return NextResponse.json({ flights: flightsWithDetails });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { flight_code, host_name, aircraft, datetime_utc } = await request.json();

    if (!flight_code || !host_name || !aircraft || !datetime_utc) {
      return NextResponse.json({ error: 'Missing required flight fields' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO flights (flight_code, host_name, aircraft, datetime_utc, status)
      VALUES (?, ?, ?, ?, 'UPCOMING')
    `).run(flight_code.trim(), host_name.trim(), aircraft.trim(), datetime_utc);

    return NextResponse.json({ success: true, flightId: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error('Error creating flight:', err);
    return NextResponse.json({ error: 'Failed to create flight' }, { status: 500 });
  }
}
