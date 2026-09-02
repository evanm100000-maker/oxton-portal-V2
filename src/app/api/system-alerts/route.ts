import { NextResponse } from 'next/server';
import { getSystemSettings, getActiveSystemAlert } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const settings = await getSystemSettings();
  const alert = await getActiveSystemAlert();

  return NextResponse.json({
    maintenance_mode: settings.maintenance_mode === '1',
    maintenance_message: settings.maintenance_message || 'Website is currently under maintenance.',
    alert: alert || null,
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}
