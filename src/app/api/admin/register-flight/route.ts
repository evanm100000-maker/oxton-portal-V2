import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getFlightsList, updateFlight, saveAllocation, createNotification, createConsequence } from '@/lib/firebase-db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { flight_id, attendance_map } = await request.json();

    if (!flight_id || !attendance_map || typeof attendance_map !== 'object') {
      return NextResponse.json({ error: 'Flight ID and attendance map required' }, { status: 400 });
    }

    const flights = await getFlightsList();
    const flight = flights.find((f: any) => Number(f.id) === Number(flight_id));

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    await updateFlight(Number(flight_id), { status: 'COMPLETED' });

    let processedCount = 0;
    for (const [userIdStr, status] of Object.entries(attendance_map)) {
      const userId = Number(userIdStr);
      const isAttended = (status === 'PRESENT' || status === 'LATE') ? 1 : 0;

      await saveAllocation(Number(flight_id), userId, 'ATTENDING', status as string);
      processedCount++;

      if (status === 'ABSENT') {
        const timeframeDeadline = new Date();
        timeframeDeadline.setDate(timeframeDeadline.getDate() + 7);

        await createConsequence({
          user_id: userId,
          issuer_id: user.id,
          tier: 'C4A',
          type: 'DETENTION',
          reason: `Absence from allocated flight (${flight.flight_code})`,
          notes: `Automatically issued via attendance register for flight ${flight.flight_code}.`,
          timeframe_deadline: timeframeDeadline.toISOString(),
          status: 'ACTIVE',
        });

        await createNotification(
          userId,
          `Flight Attendance Recorded: Absent`,
          `You were marked ABSENT for flight ${flight.flight_code}. A C4A (20 Minute Detention) sanction has been issued.`,
          'WARNING'
        );
      } else {
        const statusTitle = status === 'PRESENT' ? 'Present' : 'Late';
        await createNotification(
          userId,
          `Flight Attendance Recorded: ${statusTitle}`,
          `Attendance registered for flight ${flight.flight_code}: Marked as ${statusTitle} (+1 added to weekly quota).`,
          'SUCCESS'
        );
      }
    }

    return NextResponse.json({ success: true, count: processedCount });
  } catch (err: any) {
    console.error('Flight register error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process attendance register' }, { status: 500 });
  }
}
