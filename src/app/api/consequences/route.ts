import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConsequencesList, createConsequence, getUsersList, createNotification } from '@/lib/firebase-db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const consequences = await getConsequencesList();
  const users = await getUsersList();

  const enriched = consequences.map((c: any) => {
    const issuer = users.find((usr: any) => Number(usr.id) === Number(c.issuer_id));
    return {
      ...c,
      issuer_name: issuer?.preferred_name || 'Admin',
    };
  });

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    return NextResponse.json({ consequences: enriched });
  }

  const myConsequences = enriched.filter((c: any) => Number(c.user_id) === Number(user.id));
  return NextResponse.json({ consequences: myConsequences });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { user_id, type, reason, notes, expires_at } = await request.json();

    if (!user_id || !type || !reason) {
      return NextResponse.json({ error: 'Target user, type, and reason are required' }, { status: 400 });
    }

    const cons = await createConsequence({
      user_id: Number(user_id),
      issuer_id: user.id,
      type,
      reason,
      notes: notes || null,
      expires_at: expires_at || null
    });

    await createNotification(
      Number(user_id),
      `Disciplinary Action Issued: ${type.replace('_', ' ')}`,
      `You have been issued a ${type.replace('_', ' ')}. Reason: ${reason}`,
      'CONSEQUENCE'
    );

    return NextResponse.json({ consequence: cons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to issue consequence' }, { status: 500 });
  }
}
