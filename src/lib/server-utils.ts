import { getDb } from './db';

export interface QuotaInfo {
  requiredQuota: number;
  completedThisWeek: number;
  remaining: number;
  statusBadge: 'ACTIVE' | 'LOA' | 'REDUCED_ACTIVITY';
}

export function getUserActiveLOA(userId: number): { type: string; start_date: string; end_date: string } | null {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT type, start_date, end_date
    FROM loa_requests
    WHERE user_id = ? AND status = 'APPROVED'
      AND start_date <= ? AND end_date >= ?
    ORDER BY id DESC LIMIT 1
  `);

  const activeLoa = stmt.get(userId, today, today) as { type: string; start_date: string; end_date: string } | undefined;
  return activeLoa || null;
}

export function getUserQuotaInfo(userId: number): QuotaInfo {
  const db = getDb();
  const activeLoa = getUserActiveLOA(userId);

  let requiredQuota = 3;
  let statusBadge: 'ACTIVE' | 'LOA' | 'REDUCED_ACTIVITY' = 'ACTIVE';

  if (activeLoa) {
    requiredQuota = 0;
    statusBadge = activeLoa.type === 'REDUCED_ACTIVITY' ? 'REDUCED_ACTIVITY' : 'LOA';
  }

  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM flight_allocations fa
    JOIN flights f ON fa.flight_id = f.id
    WHERE fa.user_id = ? AND fa.attended = 1
      AND f.datetime_utc >= ? AND f.datetime_utc <= ?
  `);

  const res = stmt.get(userId, monday.toISOString(), sunday.toISOString()) as { count: number };
  const completedThisWeek = res?.count || 0;
  const remaining = Math.max(0, requiredQuota - completedThisWeek);

  return {
    requiredQuota,
    completedThisWeek,
    remaining,
    statusBadge
  };
}
