import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getFlightsList, createFlight, deleteFlight, getAllocationsList, getUsersList } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const flights = await getFlightsList();
  const allocations = await getAllocationsList();
  const users = await getUsersList();

  const enrichedFlights = flights.map((flight: any) => {
    const flightAllocations = allocations.filter((a: any) => Number(a.flight_id) === Number(flight.id));

    const enrichedAllocations = flightAllocations.map((alloc: any) => {
      const u = users.find((usr: any) => Number(usr.id) === Number(alloc.user_id));
      return {
        ...alloc,
        preferred_name: u?.preferred_name || 'Staff Member',
        roblox_username: u?.roblox_username || 'Unknown',
        role: u?.role || 'STAFF'
      };
    });

    const myAlloc = flightAllocations.find((a: any) => Number(a.user_id) === Number(user.id));

    return {
      ...flight,
      my_status: myAlloc ? myAlloc.status : 'UNALLOCATED',
      allocations: enrichedAllocations
    };
  });

  return NextResponse.json({ flights: enrichedFlights }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { flight_code, host_name, aircraft, datetime_utc } = await request.json();

    if (!flight_code || !host_name || !aircraft || !datetime_utc) {
      return NextResponse.json({ error: 'All flight fields are required' }, { status: 400 });
    }

    const flight = await createFlight({
      flight_code,
      host_name,
      aircraft,
      datetime_utc,
      status: 'UPCOMING'
    });

    return NextResponse.json({ flight }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create flight' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Flight ID required' }, { status: 400 });
    }

    await deleteFlight(Number(id));
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete flight' }, { status: 500 });
  }
}
