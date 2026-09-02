import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createToken, comparePassword } from '@/lib/auth';
import { getUserSuspension } from '@/lib/server-utils';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const validPassword = comparePassword(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status === 'PENDING') {
      return NextResponse.json({
        error: 'Your account sign-up request is pending approval by an Admin.'
      }, { status: 403 });
    }

    if (user.status === 'DECLINED') {
      return NextResponse.json({
        error: 'Your account sign-up request was declined.'
      }, { status: 403 });
    }

    // Check Suspension
    const suspension = getUserSuspension(user.id);
    if (suspension && user.role !== 'FOUNDER') {
      const expiresFormatted = suspension.expires_at
        ? new Date(suspension.expires_at).toLocaleString()
        : 'Indefinite';

      return NextResponse.json({
        error: `Account Suspended until ${expiresFormatted}. Reason: ${suspension.reason}`,
        suspended: true,
        suspension
      }, { status: 403 });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      preferred_name: user.preferred_name,
      roblox_username: user.roblox_username,
      discord_username: user.discord_username,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        preferred_name: user.preferred_name,
        roblox_username: user.roblox_username,
        role: user.role,
      }
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
