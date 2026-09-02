import { getDb } from './db';

export function getUserSuspension(userId: number) {
  const db = getDb();
  const nowIso = new Date().toISOString();

  const activeSuspension = db.prepare(`
    SELECT * FROM consequences
    WHERE user_id = ? AND type = 'SUSPENSION'
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, nowIso) as any;

  if (!activeSuspension) return null;

  return {
    is_suspended: true,
    reason: activeSuspension.reason,
    notes: activeSuspension.notes,
    expires_at: activeSuspension.expires_at,
  };
}

export function getUserActiveLOA(userId: number) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const active = db.prepare(`
    SELECT * FROM loa_requests
    WHERE user_id = ? AND status = 'APPROVED'
      AND start_date <= ? AND end_date >= ?
    ORDER BY id DESC
    LIMIT 1
  `).get(userId, today, today) as any;

  return active || null;
}

export function getUserQuotaInfo(userId: number) {
  const db = getDb();

  // Get start of current week in BST (Monday 00:00:00)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 is Sun, 1 is Mon
  const distToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() - distToMon);
  mon.setUTCHours(0, 0, 0, 0);

  const startOfWeekIso = mon.toISOString();

  // Count attended flights this week where attendance_status = PRESENT or LATE or attended = 1
  const attendedCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM flight_allocations fa
    JOIN flights f ON fa.flight_id = f.id
    WHERE fa.user_id = ?
      AND (fa.attended = 1 OR fa.attendance_status IN ('PRESENT', 'LATE'))
      AND f.datetime_utc >= ?
  `).get(userId, startOfWeekIso) as { count: number };

  const completedThisWeek = attendedCount ? attendedCount.count : 0;
  const activeLoa = getUserActiveLOA(userId);

  let requiredQuota = 3;
  let statusBadge = 'ACTIVE';

  if (activeLoa) {
    if (activeLoa.type === 'LOA') {
      requiredQuota = 0;
      statusBadge = 'LOA';
    } else if (activeLoa.type === 'REDUCED_ACTIVITY') {
      requiredQuota = 0;
      statusBadge = 'REDUCED_ACTIVITY';
    }
  }

  const remaining = Math.max(0, requiredQuota - completedThisWeek);
  const isCompliant = completedThisWeek >= requiredQuota || statusBadge !== 'ACTIVE';

  return {
    requiredQuota,
    completedThisWeek,
    remaining,
    statusBadge,
    isCompliant,
    startOfWeekIso,
  };
}
