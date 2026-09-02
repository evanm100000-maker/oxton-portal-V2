import { getConsequencesList, getLOARequestsList, getAllocationsList, getFlightsList } from './firebase-db';

export async function getUserSuspension(userId: number) {
  const consequences = await getConsequencesList();
  const nowIso = new Date().toISOString();

  const userSuspensions = consequences
    .filter((c: any) => Number(c.user_id) === Number(userId) && c.type === 'SUSPENSION')
    .filter((c: any) => !c.expires_at || c.expires_at > nowIso)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (userSuspensions.length === 0) return null;

  const active = userSuspensions[0];
  return {
    is_suspended: true,
    reason: active.reason,
    notes: active.notes,
    expires_at: active.expires_at,
  };
}

export async function getUserActiveLOA(userId: number) {
  const requests = await getLOARequestsList();
  const today = new Date().toISOString().split('T')[0];

  const active = requests
    .filter((r: any) => Number(r.user_id) === Number(userId) && r.status === 'APPROVED')
    .filter((r: any) => r.start_date <= today && r.end_date >= today)
    .sort((a: any, b: any) => Number(b.id) - Number(a.id));

  return active.length > 0 ? active[0] : null;
}

export async function getUserQuotaInfo(userId: number) {
  const allocations = await getAllocationsList();
  const flights = await getFlightsList();

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const distToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() - distToMon);
  mon.setUTCHours(0, 0, 0, 0);

  const startOfWeekIso = mon.toISOString();

  const userAllocations = allocations.filter(
    (a: any) => Number(a.user_id) === Number(userId) && (a.attended === 1 || ['PRESENT', 'LATE'].includes(a.attendance_status))
  );

  let completedThisWeek = 0;
  for (const alloc of userAllocations) {
    const flight = flights.find((f: any) => Number(f.id) === Number(alloc.flight_id));
    if (flight && flight.datetime_utc >= startOfWeekIso) {
      completedThisWeek++;
    }
  }

  const activeLoa = await getUserActiveLOA(userId);

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
