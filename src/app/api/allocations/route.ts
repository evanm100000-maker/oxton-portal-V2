import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveAllocation } from '@/lib/firebase-db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { flight_id, status } = await request.json();

    if (!flight_id || !status) {
      return NextResponse.json({ error: 'Flight ID and status required' }, { status: 400 });
    }

    if (!['ATTENDING', 'UNSURE', 'ABSENT'].includes(status)) {
      return NextResponse.json({ error: 'Invalid allocation status' }, { status: 400 });
    }

    await saveAllocation(Number(flight_id), Number(user.id), status);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update allocation' }, { status: 500 });
  }
}
