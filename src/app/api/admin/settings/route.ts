import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateSystemSetting, createSystemAlert, resolveSystemAlert } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'toggle_maintenance') {
      const { enabled, message } = body;
      await updateSystemSetting('maintenance_mode', enabled ? '1' : '0');
      if (message) {
        await updateSystemSetting('maintenance_message', message);
      }
      return NextResponse.json({ success: true, enabled, message }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    if (action === 'create_alert') {
      const { title, message, severity } = body;
      if (!title || !message) {
        return NextResponse.json({ error: 'Title and message required' }, { status: 400 });
      }

      await createSystemAlert(title, message, severity || 'WARNING');

      return NextResponse.json({ success: true }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    if (action === 'resolve_alert') {
      const { alert_id } = body;
      await resolveSystemAlert(alert_id);
      return NextResponse.json({ success: true }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Settings API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update system settings' }, { status: 500 });
  }
}
