'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { parseFirebaseSnapshot } from '@/lib/realtime-sync';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    const notifRef = ref(database, 'notifications');
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const list = parseFirebaseSnapshot(snapshot);
      if (user) {
        const userNotifs = list
          .filter((n: any) => Number(n.user_id) === Number(user.id))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotifications(userNotifs);
      } else {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotifications(list);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Notifications Center</h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            System updates, report responses, LOA status changes, and flight attendance records.
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="px-4 py-2 bg-white border border-purple-200 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-50 shadow-sm"
        >
          Mark All Read
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 text-xs py-6">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Bell className="w-10 h-10 mx-auto text-purple-300 mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-700">No Notifications</p>
            <p className="text-xs text-slate-400 mt-1">You are all caught up.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                n.is_read ? 'bg-slate-50/60 border-slate-100 opacity-80' : 'bg-purple-50/40 border-purple-100 shadow-sm'
              }`}
            >
              <div className="p-2 bg-white rounded-xl shrink-0 mt-0.5 border border-purple-100 shadow-sm">
                {n.type === 'CONSEQUENCE' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                ) : n.type === 'SUCCESS' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : n.type === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <Info className="w-5 h-5 text-purple-600" />
                )}
              </div>

              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
