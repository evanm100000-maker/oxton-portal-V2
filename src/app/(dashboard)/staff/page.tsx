'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, Crown, ShieldCheck, User } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export default function PublicStaffDirectoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time Firebase listener for users list
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.values(val).filter((u: any) => u && u.status === 'ACTIVE') as any[];
        // Deduplicate by ID
        const uniqueMap = new Map();
        list.forEach((u) => uniqueMap.set(String(u.id), u));
        setUsers(Array.from(uniqueMap.values()));
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.preferred_name.toLowerCase().includes(search.toLowerCase()) ||
    u.roblox_username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-600" />
          Luma Airways Staff Directory
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-0.5">
          View all active staff team members and executive roles across the airline.
        </p>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff by preferred name, Roblox username, or role..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-purple-100 rounded-2xl shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 placeholder-slate-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading staff directory...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 shadow-md border border-purple-100">
          No matching active staff members found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => (
            <div key={u.id} className="bg-white rounded-3xl p-5 shadow-md border border-purple-100 flex items-center justify-between transition-all hover:shadow-lg">
              <div className="flex items-center gap-3.5">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.preferred_name} className="w-12 h-12 rounded-2xl object-cover border border-purple-200 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-bold rounded-2xl flex items-center justify-center text-lg shadow-md">
                    {u.preferred_name.charAt(0)}
                  </div>
                )}

                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                    <span>{u.preferred_name}</span>
                    {/* Role badge explicitly next to name */}
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase tracking-wider ${
                      u.role === 'FOUNDER'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : u.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {u.role}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold">@{u.roblox_username}</p>
                </div>
              </div>

              <div>
                {u.role === 'FOUNDER' ? (
                  <Crown className="w-5 h-5 text-amber-500" />
                ) : u.role === 'ADMIN' ? (
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
