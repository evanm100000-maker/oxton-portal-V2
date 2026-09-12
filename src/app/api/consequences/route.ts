import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConsequencesList, createConsequence, deleteConsequence, getUsersList, createNotification } from '@/lib/firebase-db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIER_LABELS: Record<string, string> = {
  C1: 'C1 - Warning',
  C2: 'C2 - Warning',
  C3: 'C3 - Informal Sanction',
  C4A: 'C4A - 20 Minute Detention',
  C4B: 'C4B - 30 Minute Detention',
  C5A: 'C5A - 2 Day Suspension',
  C5B: 'C5B - Indefinite Suspension',
};

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
      tier: c.tier || (c.type === 'SUSPENSION' ? 'C5A' : c.type === 'INFRACTION' ? 'C3' : 'C1'),
      tier_label: TIER_LABELS[c.tier || c.type] || c.tier || c.type,
      status: c.status || 'ACTIVE',
      issuer_name: issuer?.preferred_name || 'Admin',
    };
  });

  if (user.role === 'ADMIN' || user.role === 'FOUNDER') {
    return NextResponse.json({ consequences: enriched }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }

  const myConsequences = enriched.filter((c: any) => Number(c.user_id) === Number(user.id));
  return NextResponse.json({ consequences: myConsequences }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { user_id, tier, reason, notes, timeframe_deadline, expires_at } = await request.json();

    if (!user_id || !tier || !reason) {
      return NextResponse.json({ error: 'Target user, consequence tier, and reason are required' }, { status: 400 });
    }

    const consTier = tier; // 'C1' | 'C2' | 'C3' | 'C4A' | 'C4B' | 'C5A' | 'C5B'
    const consType = consTier.startsWith('C5') ? 'SUSPENSION' : consTier.startsWith('C4') ? 'DETENTION' : consTier === 'C3' ? 'INFORMAL_SANCTION' : 'WARNING';

    const consData = {
      user_id: Number(user_id),
      issuer_id: user.id,
      tier: consTier,
      type: consType,
      reason,
      notes: notes || null,
      timeframe_deadline: timeframe_deadline || null,
      status: 'ACTIVE',
      expires_at: expires_at || null,
      created_at: new Date().toISOString(),
    };

    const cons = await createConsequence(consData);

    // Save to SQLite
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO consequences (user_id, issuer_id, type, tier, reason, notes, timeframe_deadline, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        Number(user_id),
        user.id,
        consType,
        consTier,
        reason,
        notes || null,
        timeframe_deadline || null,
        'ACTIVE',
        expires_at || null
      );
    } catch (e) {
      console.error('SQLite consequence insert error:', e);
    }

    const tierLabel = TIER_LABELS[consTier] || consTier;
    const timeframeMsg = timeframe_deadline ? ` | Required deadline: ${new Date(timeframe_deadline).toLocaleString()}` : '';

    await createNotification(
      Number(user_id),
      `Disciplinary Action Issued: ${tierLabel}`,
      `You have been issued a ${tierLabel}. Reason: ${reason}${timeframeMsg}`,
      'CONSEQUENCE'
    );

    return NextResponse.json({ consequence: cons }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to issue consequence' }, { status: 500 });
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
      return NextResponse.json({ error: 'Consequence ID required' }, { status: 400 });
    }

    await deleteConsequence(Number(id));

    // Delete from SQLite
    try {
      const db = getDb();
      db.prepare(`DELETE FROM consequences WHERE id = ?`).run(Number(id));
    } catch (e) {}

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove consequence' }, { status: 500 });
  }
}
