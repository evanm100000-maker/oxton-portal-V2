'use client';

import React, { useEffect, useState } from 'react';
import { Plane, Calendar, UserCheck, UserX, Clock, ChevronDown, ChevronUp, History, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { formatDateLocal, isFlightPast } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { parseFirebaseSnapshot } from '@/lib/realtime-sync';

export default function PreviousFlightsPage() {
  const [user, setUser] = useState<any>(null);
  const [rawFlights, setRawFlights] = useState<any[]>([]);
  const [rawAllocations, setRawAllocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFlightId, setExpandedFlightId] = useState<number | null>(null);

  // Register Modal State
  const [selectedRegisterFlight, setSelectedRegisterFlight] = useState<any>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, 'PRESENT' | 'LATE' | 'ABSENT'>>({});
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/me?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    const unsubFlights = onValue(ref(database, 'flights'), (snapshot) => {
      setRawFlights(parseFirebaseSnapshot(snapshot));
      setLoading(false);
    });

    const unsubAlloc = onValue(ref(database, 'allocations'), (snapshot) => {
      const val = snapshot.val();
      setRawAllocations(val ? Object.values(val).filter(Boolean) : []);
    });

    const unsubUsers = onValue(ref(database, 'users'), (snapshot) => {
      setUsers(parseFirebaseSnapshot(snapshot));
    });

    return () => {
      unsubFlights();
      unsubAlloc();
      unsubUsers();
    };
  }, []);

  const activeStaff = users.filter((u) => u.status === 'ACTIVE');

  // Compute enriched previous flights
  const allFlights = rawFlights.map((flight) => {
    const flightAllocations = rawAllocations.filter((a: any) => Number(a.flight_id) === Number(flight.id));

    const enrichedAllocations = flightAllocations.map((alloc: any) => {
      const u = users.find((usr: any) => Number(usr.id) === Number(alloc.user_id));
      return {
        ...alloc,
        preferred_name: u?.preferred_name || 'Staff Member',
        roblox_username: u?.roblox_username || 'Unknown',
        role: u?.role || 'STAFF'
      };
    });

    const myAlloc = flightAllocations.find((a: any) => Number(a.user_id) === Number(user?.id));

    return {
      ...flight,
      my_status: myAlloc ? myAlloc.status : 'UNALLOCATED',
      allocations: enrichedAllocations
    };
  });

  const previousFlights = allFlights
    .filter((f) => isFlightPast(f))
    .sort((a, b) => new Date(b.datetime_utc).getTime() - new Date(a.datetime_utc).getTime());

  const openRegisterModal = (flight: any) => {
    setSelectedRegisterFlight(flight);
    const initialMap: Record<number, 'PRESENT' | 'LATE' | 'ABSENT'> = {};

    const registerStaff = activeStaff.filter((s) => {
      const existingAlloc = flight.allocations?.find((a: any) => Number(a.user_id) === Number(s.id));
      return existingAlloc && (existingAlloc.status === 'ATTENDING' || (existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE'));
    });

    registerStaff.forEach((s) => {
      const existingAlloc = flight.allocations?.find((a: any) => Number(a.user_id) === Number(s.id));
      if (existingAlloc && existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE') {
        initialMap[s.id] = existingAlloc.attendance_status;
      } else {
        initialMap[s.id] = 'PRESENT';
      }
    });

    setAttendanceMap(initialMap);
  };

  const handleCompleteRegister = async () => {
    if (!selectedRegisterFlight) return;
    setRegisterSubmitting(true);
    setRegisterMsg(null);

    try {
      const res = await fetch('/api/admin/register-flight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight_id: selectedRegisterFlight.id,
          attendance_map: attendanceMap,
        }),
      });

      if (res.ok) {
        setRegisterMsg('Flight attendance register updated successfully!');
        setTimeout(() => {
          setSelectedRegisterFlight(null);
          setRegisterMsg(null);
        }, 600);
      }
    } catch (err) {
      console.error('Register submit error:', err);
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-3 text-slate-800">
          <History className="w-8 h-8 text-purple-700" />
          <h1 className="text-3xl font-black tracking-tight">Previous Flights Archive</h1>
        </div>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Complete archive of past and completed flights. The day after a flight takes place, it is automatically saved here along with attendance registers.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading previous flight records...</div>
      ) : previousFlights.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 shadow-md border border-purple-100">
          <Plane className="w-12 h-12 mx-auto text-purple-300 mb-3 opacity-60" />
          <p className="text-base font-semibold text-slate-700">No previous flights on record.</p>
          <p className="text-xs text-slate-400 mt-1">Past flights will automatically appear here after their scheduled day ends.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {previousFlights.map((flight) => {
            const presentStaff = flight.allocations?.filter((a: any) => a.attendance_status === 'PRESENT' || a.attendance_status === 'LATE' || a.attended === 1) || [];
            const absentStaff = flight.allocations?.filter((a: any) => a.attendance_status === 'ABSENT') || [];
            const isExpanded = expandedFlightId === flight.id;

            return (
              <div key={flight.id} className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4 transition-all hover:shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-sm rounded-full border border-purple-200">
                        {flight.flight_code}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 uppercase">
                        {flight.status === 'COMPLETED' ? 'COMPLETED' : 'PAST FLIGHT'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{flight.aircraft}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        {formatDateLocal(flight.datetime_utc)}
                      </span>
                      <span>• Host: <strong className="text-slate-700">{flight.host_name}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => openRegisterModal(flight)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-xl text-xs transition-all"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        Edit Register
                      </button>
                    )}
                  </div>
                </div>

                {/* Attendance Summary */}
                <div className="border-t border-purple-100 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> {presentStaff.length} Present / Late (+1 Quota)
                    </span>
                    <span className="text-rose-700 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5" /> {absentStaff.length} Absent (C4A Issued)
                    </span>
                  </div>

                  <button
                    onClick={() => setExpandedFlightId(isExpanded ? null : flight.id)}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    {isExpanded ? 'Hide Register' : 'View Full Register'}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Register Details */}
                {isExpanded && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-emerald-800 mb-2 border-b border-emerald-200 pb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Attended / Present ({presentStaff.length})
                      </h4>
                      {presentStaff.length === 0 ? (
                        <p className="text-slate-400 italic">No staff recorded present.</p>
                      ) : (
                        <div className="space-y-1">
                          {presentStaff.map((a: any) => (
                            <div key={a.user_id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-800">{a.preferred_name}</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                                {a.attendance_status || 'PRESENT'} (+1 Quota)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-rose-800 mb-2 border-b border-rose-200 pb-1 flex items-center gap-1">
                        <UserX className="w-3.5 h-3.5" /> Absent ({absentStaff.length})
                      </h4>
                      {absentStaff.length === 0 ? (
                        <p className="text-slate-400 italic">No absent staff recorded.</p>
                      ) : (
                        <div className="space-y-1">
                          {absentStaff.map((a: any) => (
                            <div key={a.user_id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-800">{a.preferred_name}</span>
                              <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold uppercase">
                                ABSENT (C4A)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ATTENDANCE REGISTER MODAL */}
      {selectedRegisterFlight && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Attendance Register: {selectedRegisterFlight.flight_code}</h3>
                <p className="text-xs text-slate-500">Update attendance register status for this past flight.</p>
              </div>
              <button onClick={() => setSelectedRegisterFlight(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {registerMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                {registerMsg}
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(() => {
                const attendingStaff = activeStaff.filter((s) => {
                  const existingAlloc = selectedRegisterFlight?.allocations?.find((a: any) => Number(a.user_id) === Number(s.id));
                  return existingAlloc && (existingAlloc.status === 'ATTENDING' || (existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE'));
                });

                if (attendingStaff.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 space-y-1">
                      <p className="font-bold text-slate-700 text-sm">No Staff Members Marked Attending</p>
                    </div>
                  );
                }

                return attendingStaff.map((u) => {
                  const currentStatus = attendanceMap[u.id] || 'PRESENT';
                  return (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-purple-50/40 rounded-xl border border-purple-100 gap-2">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{u.preferred_name} (@{u.roblox_username})</div>
                        <div className="text-slate-500 text-[10px]">{u.role}</div>
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setAttendanceMap({ ...attendanceMap, [u.id]: 'PRESENT' })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
                          }`}
                        >
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceMap({ ...attendanceMap, [u.id]: 'LATE' })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                            currentStatus === 'LATE'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
                          }`}
                        >
                          Late
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendanceMap({ ...attendanceMap, [u.id]: 'ABSENT' })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                            currentStatus === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setSelectedRegisterFlight(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteRegister}
                disabled={registerSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50"
              >
                {registerSubmitting ? 'Saving...' : 'Save Attendance Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
