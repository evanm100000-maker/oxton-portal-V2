export function formatDateLocal(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (e) {
    return isoString;
  }
}

export function isFlightPast(flight: any): boolean {
  if (!flight) return false;
  if (flight.status === 'COMPLETED' || flight.status === 'PAST') return true;

  if (flight.datetime_utc) {
    try {
      const flightDate = new Date(flight.datetime_utc);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return flightDate < startOfToday;
    } catch (e) {
      return false;
    }
  }
  return false;
}
