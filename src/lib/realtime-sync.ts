'use client';

import { database } from './firebase';
import { ref, onValue } from 'firebase/database';

export function deduplicateConsequences(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, any>();
  for (const item of list) {
    if (!item) continue;
    const timeKey = item.created_at ? Math.floor(new Date(item.created_at).getTime() / 60000) : 'notime';
    const sig = `${item.user_id}_${item.tier || item.type}_${(item.reason || '').trim().toLowerCase()}_${timeKey}`;
    if (!map.has(sig)) {
      map.set(sig, item);
    }
  }
  return Array.from(map.values());
}

export function parseFirebaseSnapshot<T = any>(snapshot: any): T[] {
  const val = snapshot.val();
  if (!val) return [];
  const list = Object.values(val).filter(Boolean) as any[];

  // Deduplicate by ID if ID exists
  const map = new Map<string, any>();
  list.forEach((item, index) => {
    const key = item.id != null ? String(item.id) : `idx_${index}`;
    map.set(key, item);
  });

  return Array.from(map.values());
}

export function subscribeToFirebaseNode<T = any>(
  path: string,
  callback: (data: T[]) => void
) {
  try {
    const dbRef = ref(database, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const parsed = parseFirebaseSnapshot<T>(snapshot);
      callback(parsed);
    }, (err) => {
      console.error(`Realtime listener error on path [${path}]:`, err);
    });
    return unsubscribe;
  } catch (err) {
    console.error(`Failed to attach Firebase listener on [${path}]:`, err);
    return () => {};
  }
}
