import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersList, createConsequence, createNotification } from '@/lib/firebase-db';
import { getUserQuotaInfo } from '@/lib/server-utils';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getUsersList();
  const activeStaff = users.filter((u: any) => u.status === 'ACTIVE');

  const rosterList = await Promise.all(
    activeStaff.map(async (u: any) => {
      const quota = await getUserQuotaInfo(u.id);
      return {
        user: u,
        quota,
        isCompliant: quota.isCompliant,
      };
    })
  );

  return NextResponse.json({ roster: rosterList });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { target_user_id } = await request.json();
    if (!target_user_id) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 });
    }

    const quota = await getUserQuotaInfo(Number(target_user_id));
    if (quota.isCompliant) {
      return NextResponse.json({ error: 'User is currently compliant or exempt from quota' }, { status: 400 });
    }

    await createConsequence({
      user_id: Number(target_user_id),
      issuer_id: currentUser.id,
      type: 'INFRACTION',
      reason: `Missed weekly flight quota quota (${quota.completedThisWeek}/${quota.requiredQuota} completed)`,
      notes: `Issued automatically during weekly roster review.`
    });

    await createNotification(
      Number(target_user_id),
      'Infraction Issued: Missed Weekly Quota',
      `You were issued an Infraction for failing to meet your weekly quota of ${quota.requiredQuota} flights.`,
      'CONSEQUENCE'
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to issue roster infraction' }, { status: 500 });
  }
}
