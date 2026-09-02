import { NextResponse } from 'next/server';
import { getUserByEmail, createUser } from '@/lib/firebase-db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, preferred_name, roblox_username, discord_username } = await request.json();

    if (!email || !password || !preferred_name || !roblox_username || !discord_username) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    await createUser({
      email,
      password_hash: passwordHash,
      preferred_name,
      roblox_username,
      discord_username,
      role: 'STAFF',
      status: 'PENDING',
    });

    return NextResponse.json({
      message: 'Registration request submitted successfully! An admin will review your application.'
    });
  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
