'use client';

import React, { useEffect, useState } from 'react';
import { 
  CalendarDays, 
  Plane, 
  Clock, 
  UserCheck, 
  HelpCircle, 
  UserX, 
  Users, 
  Search, 
  ChevronRight
} from 'lucide-react';
import { formatDateLocal } from '@/lib/utils';

export default function RosterCalendarPage() {
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'DIRECTORY'>('CALENDAR');
  const [flights, setFlights] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedFlight, setSelectedFlight] = useState<any>(null);

  const fetchFlightsAndUsers = () => {
    fetch('/api/flights')
      .then((res) => res.json())
      .then((data) => {
        if (data.flights) setFlights(data.flights);
        setLoading(false);
      });

    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      });
  };

  useEffect(() => {
    fetchFlightsAndUsers();
    // Live Auto Refresh Polling every 3 seconds
    const interval = setInterval(fetchFlightsAndUsers, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAllocation = async (flightId: number, status: 'ATTENDING' | 'UNSURE' | 'ABSENT') => {
    // Optimistic Immediate UI Update
    setFlights((prev) =>
      prev.map((f) => {
        if (f.id === flightId) {
          return { ...f, my_status: status };
        }
        return f;
      })
    );

    if (selectedFlight && selectedFlight.id === flightId) {
      setSelectedFlight({ ...selectedFlight, my_status: status });
    }

    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flightId, status }),
      });
      if (res.ok) {
        fetchFlightsAndUsers();
      }
    } catch (err) {
      console.error('Allocation update error:', err);
    }
  };

  const calendarDays = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date();
    d.setDate(d.getDate() + index);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = index === 0;

    const dayFlights = flights.filter((f) => {
      const flightDateStr = new Date(f.datetime_utc).toISOString().split('T')[0];
      return flightDateStr === dateStr;
    });

    return {
      date: d,
      dateStr,
      isToday,
      dayName: isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
      formattedDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      flights: dayFlights,
    };
  });

  const filteredUsers = users.filter((u) =>
    u.preferred_name.toLowerCase().includes(search.toLowerCase()) ||
    u.roblox_username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-purple-600" />
            7-Day Flight Roster & Schedule
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            Click on any flight card in the 7-day schedule to allocate your attendance in real time.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-purple-100 shadow-sm shrink-0">
          <button
            onClick={() => setViewMode('CALENDAR')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              viewMode === 'CALENDAR' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            7-Day Calendar
          </button>

          <button
            onClick={() => setViewMode('DIRECTORY')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              viewMode === 'DIRECTORY' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Directory
          </button>
        </div>
      </div>

      {/* VIEW 1: 7-DAY CALENDAR */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {calendarDays.map((day) => (
              <div
                key={day.dateStr}
                className={`bg-white rounded-3xl p-3 border flex flex-col justify-start min-h-[360px] shadow-md transition-all ${
                  day.isToday ? 'border-purple-500 ring-2 ring-purple-400/30 bg-purple-50/20' : 'border-purple-100'
                }`}
              >
                {/* Day Header */}
                <div className={`p-2.5 rounded-2xl text-center border mb-3 ${
                  day.isToday ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500 shadow-md' : 'bg-purple-50/60 text-slate-800 border-purple-100'
                }`}>
                  <div className="text-xs font-black uppercase tracking-wider">{day.dayName}</div>
                  <div className="text-[11px] font-semibold opacity-90">{day.formattedDate}</div>
                </div>

                {/* Day Flights List */}
                <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                  {day.flights.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[11px] text-slate-400 font-medium italic text-center py-8">
                      No flights scheduled
                    </div>
                  ) : (
                    day.flights.map((flight) => (
                      <div
                        key={flight.id}
                        onClick={() => setSelectedFlight(flight)}
                        className="p-3 bg-purple-50/40 hover:bg-purple-100/50 rounded-2xl border border-purple-100 hover:border-purple-300 transition-all cursor-pointer space-y-2 group shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-md">
                            {flight.flight_code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {new Date(flight.datetime_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-slate-800 text-xs truncate group-hover:text-purple-800 transition-colors">
                            {flight.aircraft}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            Host: {flight.host_name}
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between border-t border-purple-100">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            flight.my_status === 'ATTENDING'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : flight.my_status === 'UNSURE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : flight.my_status === 'ABSENT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {flight.my_status || 'Unallocated'}
                          </span>
                          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: STAFF DIRECTORY */}
      {viewMode === 'DIRECTORY' && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by Roblox username, name, or role..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-purple-100 rounded-2xl shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-3xl p-5 shadow-md border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-bold rounded-2xl flex items-center justify-center text-base shadow-md">
                    {u.preferred_name.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {u.preferred_name}
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                        u.role === 'FOUNDER' ? 'bg-purple-100 text-purple-800 border border-purple-200' : u.role === 'ADMIN' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">@{u.roblox_username}</p>
                  </div>
                </div>

                <div className="text-right">
                  {u.quota?.statusBadge === 'LOA' ? (
                    <span className="px-2.5 py-1 text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 rounded-full">
                      LOA
                    </span>
                  ) : u.quota?.statusBadge === 'REDUCED_ACTIVITY' ? (
                    <span className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full">
                      Reduced Activity
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLIGHT ALLOCATION MODAL */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-5 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 font-extrabold text-xs rounded-md">
                    {selectedFlight.flight_code}
                  </span>
                  <span className="text-xs font-bold text-slate-500">({selectedFlight.status})</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{selectedFlight.aircraft}</h3>
              </div>
              <button onClick={() => setSelectedFlight(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Date & Time: <strong>{formatDateLocal(selectedFlight.datetime_utc)}</strong></span>
              </div>
              <div>Host: <strong className="text-slate-800">{selectedFlight.host_name}</strong></div>
            </div>

            {/* Attendance Choice Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Allocate Your Availability
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAllocation(selectedFlight.id, 'ATTENDING')}
                  className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    selectedFlight.my_status === 'ATTENDING'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Attending
                </button>

                <button
                  onClick={() => handleAllocation(selectedFlight.id, 'UNSURE')}
                  className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    selectedFlight.my_status === 'UNSURE'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" /> Unsure
                </button>

                <button
                  onClick={() => handleAllocation(selectedFlight.id, 'ABSENT')}
                  className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    selectedFlight.my_status === 'ABSENT'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <UserX className="w-4 h-4" /> Absent
                </button>
              </div>
            </div>

            {/* Roster List for this Flight */}
            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-bold text-xs text-slate-700 mb-2">Allocated Staff Roster</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedFlight.allocations && selectedFlight.allocations.length > 0 ? (
                  selectedFlight.allocations.map((a: any) => (
                    <div key={a.user_id} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-800">{a.preferred_name} (@{a.roblox_username})</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        a.status === 'ATTENDING' ? 'bg-emerald-100 text-emerald-800' : a.status === 'UNSURE' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No staff allocations submitted yet for this flight.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedFlight(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
