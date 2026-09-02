import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const db = getDb();
    const body = await request.json();
    const { action } = body;

    if (action === 'toggle_maintenance') {
      const { enabled, message } = body;
      db.prepare(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('maintenance_mode', ?)`).run(enabled ? '1' : '0');
      if (message) {
        db.prepare(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('maintenance_message', ?)`).run(message);
      }
      return NextResponse.json({ success: true, enabled, message });
    }

    if (action === 'create_alert') {
      const { title, message, severity } = body;
      if (!title || !message) {
        return NextResponse.json({ error: 'Title and message required' }, { status: 400 });
      }

      // Deactivate older active alerts
      db.prepare(`UPDATE system_alerts SET is_active = 0`).run();

      db.prepare(`
        INSERT INTO system_alerts (title, message, severity, is_active)
        VALUES (?, ?, ?, 1)
      `).run(title, message, severity || 'WARNING');

      return NextResponse.json({ success: true });
    }

    if (action === 'resolve_alert') {
      const { alert_id } = body;
      if (alert_id) {
        db.prepare(`UPDATE system_alerts SET severity = 'RESOLVED' WHERE id = ?`).run(alert_id);
      } else {
        db.prepare(`UPDATE system_alerts SET is_active = 0`).run();
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Settings API error:', err);
    return NextResponse.json({ error: 'Failed to update system settings' }, { status: 500 });
  }
}
