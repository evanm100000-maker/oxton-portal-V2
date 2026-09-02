'use client';

import { database } from './firebase';
import { ref, onValue } from 'firebase/database';

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
