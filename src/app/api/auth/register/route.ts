import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, preferred_name, roblox_username, discord_username } = await request.json();

    if (!email || !password || !preferred_name || !roblox_username || !discord_username) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (email, password_hash, preferred_name, roblox_username, discord_username, role, status, staff_points)
      VALUES (?, ?, ?, ?, ?, 'STAFF', 'PENDING', 0)
    `).run(
      email.trim().toLowerCase(),
      passwordHash,
      preferred_name.trim(),
      roblox_username.trim(),
      discord_username.trim()
    );

    return NextResponse.json({
      success: true,
      message: 'Registration request submitted successfully! An Admin will review your request shortly.'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to process registration' }, { status: 500 });
  }
}
