import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDetentionSessionsList, createDetentionSession, getConsequencesList, updateConsequence, createNotification, createConsequence } from '@/lib/firebase-db';
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
  const user = await getUserFromToken();
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
      created_by_name: user.preferred_name,
      notes: notes || '',
      entries,
      created_at: new Date().toISOString(),
    };

    const newSession = await createDetentionSession(sessionData);

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
            // Already C4B -> Record failure note
            await updateConsequence(targetCons.id, {
              notes: (targetCons.notes || '') + ` | Failed C4B detention on ${session_date}.`,
            });

            await createNotification(
              entry.user_id,
              'Detention Failed (C4B)',
              `You failed/missed your C4B detention on ${session_date}. Please contact Executive Management immediately.`,
              'WARNING'
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
