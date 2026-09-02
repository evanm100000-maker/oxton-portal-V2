import { NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, comparePassword } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    const user = await getUserById(currentUser.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'update_profile') {
      const { preferred_name, avatar_url } = body;
      const updates: any = {};
      if (preferred_name) updates.preferred_name = preferred_name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;

      await updateUser(currentUser.id, updates);
      return NextResponse.json({ success: true, message: 'Profile updated successfully' }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    if (action === 'change_password') {
      const { current_password, new_password } = body;

      if (!current_password || !new_password) {
        return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
      }

      if (new_password.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
      }

      const valid = comparePassword(current_password, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }

      const newHash = hashPassword(new_password);
      await updateUser(currentUser.id, { password_hash: newHash });

      return NextResponse.json({ success: true, message: 'Password changed successfully' }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Settings error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
