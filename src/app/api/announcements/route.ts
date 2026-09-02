import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const announcements = db.prepare(`
    SELECT a.*, u.preferred_name as author_name, u.role as author_role
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    ORDER BY a.created_at DESC
  `).all();

  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const db = getDb();
    const res = db.prepare(`
      INSERT INTO announcements (author_id, title, content)
      VALUES (?, ?, ?)
    `).run(user.id, title.trim(), content.trim());

    return NextResponse.json({ success: true, id: Number(res.lastInsertRowid) });
  } catch (err) {
    console.error('Announcement creation error:', err);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
