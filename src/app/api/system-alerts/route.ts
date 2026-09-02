import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  // Maintenance setting
  const maintRow = db.prepare(`SELECT value FROM system_settings WHERE key = 'maintenance_mode'`).get() as any;
  const msgRow = db.prepare(`SELECT value FROM system_settings WHERE key = 'maintenance_message'`).get() as any;

  const maintenanceMode = maintRow?.value === '1';
  const maintenanceMessage = msgRow?.value || 'Website is currently under maintenance.';

  // Active Alert Banner
  const alertRow = db.prepare(`
    SELECT * FROM system_alerts
    WHERE is_active = 1
    ORDER BY id DESC
    LIMIT 1
  `).get() as any;

  return NextResponse.json({
    maintenance_mode: maintenanceMode,
    maintenance_message: maintenanceMessage,
    alert: alertRow || null,
  });
}
