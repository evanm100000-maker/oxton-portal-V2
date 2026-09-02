'use client';

import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

export default function ConsequencesPage() {
  const [consequences, setConsequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/consequences')
      .then((res) => res.json())
      .then((data) => {
        if (data.consequences) setConsequences(data.consequences);
        setLoading(false);
      });
  }, []);

  const totalActions = consequences.length;
  const warningsCount = consequences.filter((c) => c.type === 'INFORMAL_SANCTION').length;
  const infractionsCount = consequences.filter((c) => c.type === 'INFRACTION').length;
  const suspensionsCount = consequences.filter((c) => c.type === 'SUSPENSION').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header matching reference image */}
      <div>
        <div className="flex items-center gap-2.5 text-slate-800">
          <Shield className="w-6 h-6 text-purple-700" />
          <h1 className="text-2xl font-extrabold tracking-tight">My Disciplinary Record</h1>
        </div>
        <p className="text-slate-500 text-xs mt-1 font-medium">
          View all disciplinary actions issued to you.
        </p>
      </div>

      {/* 4 Summary Stat Cards across top */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-800">{totalActions}</span>
          <span className="text-xs font-bold text-slate-500 mt-1">Total Actions</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-amber-500">{warningsCount}</span>
          <span className="text-xs font-bold text-slate-500 mt-1">Warnings</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-rose-600">{infractionsCount}</span>
          <span className="text-xs font-bold text-slate-500 mt-1">Infractions</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-md border border-purple-100 text-center flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-red-700">{suspensionsCount}</span>
          <span className="text-xs font-bold text-slate-500 mt-1">Suspensions</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl p-8 shadow-md border border-purple-100 min-h-[260px] flex items-center justify-center">
        {loading ? (
          <p className="text-slate-400 text-xs">Loading disciplinary records...</p>
        ) : consequences.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Clean Record</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">You have no disciplinary actions on file.</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 mb-2">Detailed Action Log</h3>
            {consequences.map((c) => (
              <div key={c.id} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 font-extrabold rounded-full ${
                    c.type === 'SUSPENSION'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : c.type === 'INFRACTION'
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {c.type.replace('_', ' ')}
                  </span>
                  <span className="text-slate-400 font-semibold">
                    Issued: {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{c.reason}</h4>
                  <p className="text-slate-500 mt-0.5">Issued by Admin: <strong className="text-slate-700">{c.issuer_name}</strong></p>
                </div>

                {c.notes && (
                  <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-600 italic">
                    Notes: {c.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
