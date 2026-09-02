import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAnnouncementsList, createAnnouncement, getUsersList } from '@/lib/firebase-db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const list = await getAnnouncementsList();
  const users = await getUsersList();

  const enriched = list.map((a: any) => {
    const author = users.find((usr: any) => Number(usr.id) === Number(a.author_id));
    return {
      ...a,
      author_name: author?.preferred_name || a.author_name || 'Management',
      author_role: author?.role || a.author_role || 'ADMIN'
    };
  });

  return NextResponse.json({ announcements: enriched });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'FOUNDER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    }

    const ann = await createAnnouncement({
      author_id: user.id,
      author_name: user.preferred_name,
      author_role: user.role,
      title,
      content,
    });

    return NextResponse.json({ announcement: ann });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create announcement' }, { status: 500 });
  }
}
