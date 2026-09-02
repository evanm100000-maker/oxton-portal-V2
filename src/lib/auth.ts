import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserById } from './firebase-db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'luma-portal-super-secret-key-2026';

export interface UserPayload {
  id: number;
  email: string;
  role: 'FOUNDER' | 'ADMIN' | 'STAFF';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DECLINED';
  preferred_name: string;
  roblox_username: string;
  discord_username: string;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const freshUser = await getUserById(payload.id);
  if (!freshUser || freshUser.status !== 'ACTIVE') {
    return null;
  }

  return {
    id: Number(freshUser.id),
    email: freshUser.email,
    role: freshUser.role,
    status: freshUser.status,
    preferred_name: freshUser.preferred_name,
    roblox_username: freshUser.roblox_username,
    discord_username: freshUser.discord_username,
  };
}
