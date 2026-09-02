'use client';

import { useEffect, useState } from 'react';
import { database } from './firebase';
import { ref, onValue } from 'firebase/database';

export function useFirebasePath<T = any>(path: string, initialData: T | null = null): T | null {
  const [data, setData] = useState<T | null>(initialData);

  useEffect(() => {
    try {
      const dbRef = ref(database, path);
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const list = Object.values(val).filter(Boolean);
          setData(list as any);
        } else {
          setData(val);
        }
      }, (error) => {
        console.error(`Firebase Realtime Error on ${path}:`, error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(`Failed to subscribe to Firebase ${path}:`, err);
    }
  }, [path]);

  return data;
}
