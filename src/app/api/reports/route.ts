import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getReportsList, createReport, updateReport, getUsersList } from '@/lib/firebase-db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reports = await getReportsList();
  const users = await getUsersList();

  const enriched = reports.map((r: any) => {
    const reporter = users.find((usr: any) => Number(usr.id) === Number(r.reporter_id));
    return {
      ...r,
      reporter_name: reporter?.preferred_name || 'Staff Member',
    };
  });

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    return NextResponse.json({ reports: enriched });
  }

  const myReports = enriched.filter((r: any) => Number(r.reporter_id) === Number(user.id));
  return NextResponse.json({ reports: myReports });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, target_username, subject, description } = await request.json();

    if (!type || !subject || !description) {
      return NextResponse.json({ error: 'Type, subject, and description are required' }, { status: 400 });
    }

    const report = await createReport({
      reporter_id: user.id,
      type,
      target_username: target_username || null,
      subject,
      description,
      status: 'PENDING'
    });

    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit report' }, { status: 500 });
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

    await updateReport(Number(id), { status, admin_notes: admin_notes || null });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update report' }, { status: 500 });
  }
}
