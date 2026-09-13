import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDetentionSessionsList, createDetentionSession, getConsequencesList, updateConsequence, createNotification, createConsequence } from '@/lib/firebase-db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessions = await getDetentionSessionsList();
    const consequences = await getConsequencesList();

    // Active pending C4 detentions (C4A or C4B with status === 'ACTIVE')
    const pendingDetentions = consequences.filter(
      (c) => (c.tier === 'C4A' || c.tier === 'C4B' || c.type === 'C4A' || c.type === 'C4B') && c.status === 'ACTIVE'
    );

    return NextResponse.json({ sessions, pendingDetentions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Unauthorized. Executive access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { session_date, notes, entries } = body; // entries: Array<{ user_id, consequence_id, status: 'PASSED' | 'FAILED' | 'ABSENT', notes?: string }>

    if (!session_date || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Session date and entries list are required' }, { status: 400 });
    }

    const sessionData = {
      session_date,
      created_by: user.id,
      created_by_name: user.preferred_name || 'Admin',
      notes: notes || '',
      entries,
      created_at: new Date().toISOString(),
    };

    const newSession = await createDetentionSession(sessionData);

    // Also record into SQLite if database available
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO detention_sessions (session_date, created_by, notes, entries_json)
        VALUES (?, ?, ?, ?)
      `).run(session_date, user.id, notes || '', JSON.stringify(entries));
    } catch (e) {}

    const consequences = await getConsequencesList();

    // Process each detention register entry
    for (const entry of entries) {
      const targetCons = consequences.find((c) => Number(c.id) === Number(entry.consequence_id));

      if (entry.status === 'PASSED') {
        // Detention PASSED -> Mark consequence as SERVED (removes from upcoming)
        if (targetCons) {
          await updateConsequence(targetCons.id, {
            status: 'SERVED',
            served_at: new Date().toISOString(),
            served_session_id: newSession.id,
          });

          // SQLite update
          try {
            const db = getDb();
            db.prepare(`UPDATE consequences SET status = 'SERVED' WHERE id = ?`).run(targetCons.id);
          } catch (e) {}

          await createNotification(
            entry.user_id,
            'Detention Completed (Passed)',
            `You passed your detention session on ${session_date}! The sanction has been cleared from your upcoming sanctions list.`,
            'SUCCESS'
          );
        }
      } else {
        // Detention FAILED or ABSENT
        if (targetCons) {
          const isC4A = targetCons.tier === 'C4A' || targetCons.type === 'C4A';

          if (isC4A) {
            // Escalate C4A to C4B (30 Minute Detention)
            await updateConsequence(targetCons.id, {
              tier: 'C4B',
              type: 'C4B',
              reason: `${targetCons.reason} (Escalated to C4B due to failed/missed detention on ${session_date})`,
              escalated_at: new Date().toISOString(),
              notes: (targetCons.notes || '') + ` | Failed C4A detention on ${session_date}. Escalated to C4B (30m detention).`,
            });

            // SQLite update
            try {
              const db = getDb();
              db.prepare(`
                UPDATE consequences
                SET tier = 'C4B', type = 'C4B', reason = ?
                WHERE id = ?
              `).run(`${targetCons.reason} (Escalated to C4B due to failed/missed detention on ${session_date})`, targetCons.id);
            } catch (e) {}

            await createNotification(
              entry.user_id,
              'Detention Failed - Escalated to C4B',
              `You failed/missed your C4A detention on ${session_date}. Your sanction has been escalated to C4B (30 Minute Detention). Please reschedule with Executive Management.`,
              'WARNING'
            );
          } else {
            // C4B FAILED -> Escalate to C5A (2 Day Suspension)
            const exp = new Date();
            exp.setDate(exp.getDate() + 2); // 2 days suspension

            await updateConsequence(targetCons.id, {
              tier: 'C5A',
              type: 'SUSPENSION',
              reason: `${targetCons.reason} (Escalated to C5A 2-Day Suspension due to failed/missed C4B detention on ${session_date})`,
              escalated_at: new Date().toISOString(),
              expires_at: exp.toISOString(),
              notes: (targetCons.notes || '') + ` | Failed C4B detention on ${session_date}. Escalated to C5A (2 Day Suspension).`,
            });

            // SQLite update
            try {
              const db = getDb();
              db.prepare(`
                UPDATE consequences
                SET tier = 'C5A', type = 'SUSPENSION', reason = ?, expires_at = ?
                WHERE id = ?
              `).run(
                `${targetCons.reason} (Escalated to C5A 2-Day Suspension due to failed/missed C4B detention on ${session_date})`,
                exp.toISOString(),
                targetCons.id
              );
            } catch (e) {}

            await createNotification(
              entry.user_id,
              'Detention Failed - C5A 2-Day Suspension Issued',
              `You failed/missed your C4B detention session on ${session_date}. You have been issued a C5A (2 Day Suspension).`,
              'WARNING'
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, session: newSession }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit detention session' }, { status: 500 });
  }
}
