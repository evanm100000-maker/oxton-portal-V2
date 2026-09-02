'use client';

import React, { useEffect, useState } from 'react';
import { Plane, Calendar, UserCheck, HelpCircle, UserX, Clock, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle, ClipboardCheck } from 'lucide-react';
import { formatDateLocal } from '@/lib/utils';

export default function AllocationsPage() {
  const [user, setUser] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFlightId, setExpandedFlightId] = useState<number | null>(null);

  // Register Modal State
  const [selectedRegisterFlight, setSelectedRegisterFlight] = useState<any>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, 'PRESENT' | 'LATE' | 'ABSENT'>>({});
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);

  const fetchUserAndFlights = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.user) setUser(meData.user);

      const flightsRes = await fetch('/api/flights');
      const flightsData = await flightsRes.json();
      if (flightsData.flights) setFlights(flightsData.flights);

      if (meData.user && (meData.user.role === 'ADMIN' || meData.user.role === 'FOUNDER')) {
        const usersRes = await fetch('/api/admin/users');
        const usersData = await usersRes.json();
        if (usersData.users) {
          setActiveStaff(usersData.users.filter((u: any) => u.status === 'ACTIVE'));
        }
      }
    } catch (err) {
      console.error('Error fetching allocations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndFlights();
  }, []);

  const handleAllocation = async (flightId: number, status: 'ATTENDING' | 'UNSURE' | 'ABSENT') => {
    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flightId, status }),
      });
      if (res.ok) {
        fetchUserAndFlights();
      }
    } catch (err) {
      console.error('Allocation update error:', err);
    }
  };

  const openRegisterModal = (flight: any) => {
    setSelectedRegisterFlight(flight);
    const initialMap: Record<number, 'PRESENT' | 'LATE' | 'ABSENT'> = {};

    // Initialize map from flight allocations
    activeStaff.forEach((s) => {
      const existingAlloc = flight.allocations.find((a: any) => a.user_id === s.id);
      if (existingAlloc && existingAlloc.attendance_status && existingAlloc.attendance_status !== 'NONE') {
        initialMap[s.id] = existingAlloc.attendance_status;
      } else if (existingAlloc && existingAlloc.status === 'ATTENDING') {
        initialMap[s.id] = 'PRESENT';
      } else {
        initialMap[s.id] = 'ABSENT';
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
        setRegisterMsg('Flight attendance register saved successfully!');
        setTimeout(() => {
          setSelectedRegisterFlight(null);
          setRegisterMsg(null);
          fetchUserAndFlights();
        }, 1000);
      }
    } catch (err) {
      console.error('Register submit error:', err);
    } finally {
      setRegisterSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Weekly Allocations</h1>
        <p className="text-slate-500 font-medium text-sm mt-0.5">
          View upcoming flight schedules and allocate your availability. Times are automatically adjusted to your local timezone.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading flight schedule...</div>
      ) : flights.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 shadow-md border border-purple-100">
          <Plane className="w-12 h-12 mx-auto text-purple-300 mb-3 opacity-60" />
          <p className="text-base font-semibold text-slate-700">No flights currently scheduled.</p>
          <p className="text-xs text-slate-400 mt-1">Check back soon when management updates the flight roster.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => {
            const attending = flight.allocations.filter((a: any) => a.status === 'ATTENDING');
            const unsure = flight.allocations.filter((a: any) => a.status === 'UNSURE');
            const absent = flight.allocations.filter((a: any) => a.status === 'ABSENT');
            const isExpanded = expandedFlightId === flight.id;
            const isAdmin = user?.role === 'ADMIN' || user?.role === 'FOUNDER';

            return (
              <div key={flight.id} className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4 transition-all hover:shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-sm rounded-full border border-purple-200">
                        {flight.flight_code}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                        {flight.status}
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

                  {/* Right Action Cluster: Allocation Buttons + Admin Register Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Attendance Register Trigger next to Flight (For Admins) */}
                    {isAdmin && (
                      <button
                        onClick={() => openRegisterModal(flight)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/20 transition-all mr-2"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        Attendance Register
                      </button>
                    )}

                    <button
                      onClick={() => handleAllocation(flight.id, 'ATTENDING')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        flight.my_status === 'ATTENDING'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      Attending
                    </button>

                    <button
                      onClick={() => handleAllocation(flight.id, 'UNSURE')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        flight.my_status === 'UNSURE'
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Unsure
                    </button>

                    <button
                      onClick={() => handleAllocation(flight.id, 'ABSENT')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        flight.my_status === 'ABSENT'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <UserX className="w-4 h-4" />
                      Absent
                    </button>
                  </div>
                </div>

                {/* Allocated Staff Summary */}
                <div className="border-t border-purple-100 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <span className="text-emerald-700">✓ {attending.length} Attending</span>
                    <span className="text-amber-700">? {unsure.length} Unsure</span>
                    <span className="text-rose-700">✕ {absent.length} Absent</span>
                  </div>

                  <button
                    onClick={() => setExpandedFlightId(isExpanded ? null : flight.id)}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    {isExpanded ? 'Hide Roster' : 'View Staff Roster'}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Roster Breakdown */}
                {isExpanded && (
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Attending Column */}
                    <div>
                      <h4 className="font-bold text-emerald-800 mb-2 border-b border-emerald-200 pb-1">Attending ({attending.length})</h4>
                      {attending.length === 0 ? (
                        <p className="text-slate-400 italic">None</p>
                      ) : (
                        <div className="space-y-1">
                          {attending.map((a: any) => (
                            <div key={a.user_id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-800">{a.preferred_name}</span>
                              <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">{a.role}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unsure Column */}
                    <div>
                      <h4 className="font-bold text-amber-800 mb-2 border-b border-amber-200 pb-1">Unsure ({unsure.length})</h4>
                      {unsure.length === 0 ? (
                        <p className="text-slate-400 italic">None</p>
                      ) : (
                        <div className="space-y-1">
                          {unsure.map((a: any) => (
                            <div key={a.user_id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-800">{a.preferred_name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{a.role}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Absent Column */}
                    <div>
                      <h4 className="font-bold text-rose-800 mb-2 border-b border-rose-200 pb-1">Absent ({absent.length})</h4>
                      {absent.length === 0 ? (
                        <p className="text-slate-400 italic">None</p>
                      ) : (
                        <div className="space-y-1">
                          {absent.map((a: any) => (
                            <div key={a.user_id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-800">{a.preferred_name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{a.role}</span>
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

      {/* ATTENDANCE REGISTER MODAL (PRESENT, LATE, ABSENT) */}
      {selectedRegisterFlight && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-purple-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Attendance Register: {selectedRegisterFlight.flight_code}</h3>
                <p className="text-xs text-slate-500">Mark staff members as Present, Late, or Absent for this flight.</p>
              </div>
              <button onClick={() => setSelectedRegisterFlight(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {registerMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                {registerMsg}
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeStaff.map((u) => {
                const currentStatus = attendanceMap[u.id] || 'ABSENT';
                return (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-purple-50/40 rounded-xl border border-purple-100 gap-2">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{u.preferred_name} (@{u.roblox_username})</div>
                      <div className="text-slate-500 text-[10px]">{u.role}</div>
                    </div>

                    {/* Present / Late / Absent Radio Group */}
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
              })}
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
