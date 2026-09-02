import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { comparePassword, createToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDb();
    const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
    const user = stmt.get(email.trim().toLowerCase()) as any;

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status === 'PENDING') {
      return NextResponse.json({ error: 'Your registration request is pending Admin approval.' }, { status: 403 });
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact management.' }, { status: 403 });
    }

    if (user.status === 'DECLINED') {
      return NextResponse.json({ error: 'Your sign-up request was declined.' }, { status: 403 });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      preferred_name: user.preferred_name,
      roblox_username: user.roblox_username,
      discord_username: user.discord_username
    };

    const token = createToken(payload);

    const response = NextResponse.json({ success: true, user: payload });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax'
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
