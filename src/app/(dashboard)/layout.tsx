'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Clock, 
  Flag, 
  LifeBuoy, 
  AlertTriangle, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Bell, 
  Plane,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  AlertOctagon,
  XCircle
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // System states
  const [suspension, setSuspension] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
  const [systemAlert, setSystemAlert] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.suspended) {
          setSuspension(data.suspension);
          setUser(data.user);
        } else if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
      });

    // Check system alerts & maintenance mode
    fetch('/api/system-alerts')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setMaintenance({ active: data.maintenance_mode, message: data.maintenance_message });
          setSystemAlert(data.alert);
        }
      });
  }, []);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (user && !suspension) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user, suspension]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      const tzMatch = now.toTimeString().match(/\((.+)\)$/);
      setTimeZone(tzMatch ? tzMatch[1] : 'Local');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const markNotificationsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    });
    setUnreadCount(0);
    fetchNotifications();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f3ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-purple-900 font-bold text-sm">Loading Luma Staff Portal...</p>
        </div>
      </div>
    );
  }

  // SUSPENSION LOCKOUT SCREEN
  if (suspension && user?.role !== 'FOUNDER') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-rose-800 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-950/80 border border-rose-700 rounded-2xl flex items-center justify-center mx-auto text-rose-400 shadow-lg">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-rose-400 tracking-tight">Account Suspended</h2>

          <div className="space-y-2 bg-slate-900/80 p-4 rounded-2xl border border-slate-700 text-xs text-slate-300">
            <p className="font-semibold text-slate-100">Reason: {suspension.reason}</p>
            <p>Access Restored: <strong className="text-amber-400">{suspension.expires_at ? new Date(suspension.expires_at).toLocaleString() : 'Indefinite'}</strong></p>
            {suspension.notes && <p className="text-slate-400 italic">Notes: {suspension.notes}</p>}
          </div>

          <p className="text-xs text-slate-400">
            You cannot access the staff portal during your suspension period. If you believe this is an error, contact Executive Management on Discord.
          </p>

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // WEBSITE MAINTENANCE MODE SCREEN (Non-Admin / Non-Founder)
  if (maintenance.active && user?.role !== 'ADMIN' && user?.role !== 'FOUNDER') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-950 to-purple-950 text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center space-y-5">
          <div className="w-20 h-20 bg-purple-600/30 rounded-3xl flex items-center justify-center mx-auto text-purple-300 border border-purple-400/40 shadow-xl">
            <Wrench className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">System Under Maintenance</h2>
            <p className="text-purple-200 text-xs font-semibold mt-1">LUMA AIRWAYS eCREW PORTAL</p>
          </div>

          <p className="text-sm text-purple-100/90 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
            {maintenance.message}
          </p>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all border border-white/20"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Allocations', href: '/allocations', icon: CalendarDays },
    { label: 'LOA / Reduced', href: '/loa', icon: Clock },
    { label: 'Reports', href: '/reports', icon: Flag },
    { label: 'Support', href: '/support', icon: LifeBuoy },
    { label: 'Consequences', href: '/consequences', icon: AlertTriangle },
    { label: 'Flight Roster', href: '/roster', icon: Users },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'FOUNDER') {
    navItems.push({ label: 'Admin Panel', href: '/admin', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen flex bg-[#f0f3ff] text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-700 via-indigo-800 to-purple-900 text-white flex flex-col justify-between shadow-2xl fixed inset-y-0 left-0 z-30">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-white/15">
            <div className="w-10 h-10 bg-white text-purple-700 rounded-xl flex items-center justify-center font-bold shadow-lg">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black tracking-tight text-lg leading-tight text-white">LUMA</h2>
              <p className="text-xs text-purple-200 font-medium">Airways Roblox eCrew</p>
            </div>
          </div>

          <div className="px-3 py-6">
            <div className="px-4 text-[10px] font-bold text-purple-200 uppercase tracking-wider mb-2">MAIN NAVIGATION</div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      isActive ? 'bg-white/20 text-white shadow-md border-l-4 border-purple-400 font-bold' : 'hover:bg-white/10 text-purple-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/15">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-purple-200 hover:text-white rounded-xl hover:bg-white/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-purple-100/80 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 text-slate-800 font-bold text-sm">
            <LayoutDashboard className="w-4 h-4 text-purple-600" />
            <span>Luma Staff Portal</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-purple-50 rounded-full border border-purple-200 text-xs font-semibold text-purple-900 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>{currentTime} {timeZone}</span>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (unreadCount > 0) markNotificationsRead();
                }}
                className="relative p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 z-40">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                    <Link href="/notifications" className="text-xs text-purple-600 font-semibold hover:underline">
                      View All
                    </Link>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No notifications yet</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className="p-2.5 bg-purple-50/50 rounded-xl text-xs border border-purple-100/60">
                          <div className="font-semibold text-slate-800">{n.title}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-3 pl-3 border-l border-purple-100">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                {user?.preferred_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>@{user?.roblox_username}</span>
                  <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md ${
                    user?.role === 'FOUNDER'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : user?.role === 'ADMIN'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {user?.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {user?.preferred_name}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* FORTNITE-STYLE SYSTEM WARNING BANNER (Matching uploaded screenshot) */}
        {systemAlert && systemAlert.is_active === 1 && (
          <div className="mx-8 mt-6">
            <div className={`rounded-xl shadow-xl overflow-hidden flex border text-white ${
              systemAlert.severity === 'SEVERE'
                ? 'bg-rose-950 border-rose-600'
                : systemAlert.severity === 'RESOLVED'
                ? 'bg-emerald-950 border-emerald-600'
                : 'bg-[#1b2b4e] border-yellow-400/80'
            }`}>
              {/* Left Large Icon Block */}
              <div className={`w-20 md:w-24 shrink-0 flex items-center justify-center border-r p-3 ${
                systemAlert.severity === 'SEVERE'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : systemAlert.severity === 'RESOLVED'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-yellow-400 text-slate-950 border-yellow-500'
              }`}>
                {systemAlert.severity === 'SEVERE' ? (
                  <AlertOctagon className="w-12 h-12" />
                ) : systemAlert.severity === 'RESOLVED' ? (
                  <CheckCircle2 className="w-12 h-12" />
                ) : (
                  <AlertTriangle className="w-12 h-12 stroke-[2.5]" />
                )}
              </div>

              {/* Banner Right Text Container */}
              <div className="p-4 flex-1 flex flex-col justify-center space-y-1">
                {/* Yellow Header Pill Bar */}
                <div className="inline-block self-start px-2.5 py-0.5 font-black text-xs uppercase tracking-wider rounded-sm shadow-sm ${
                  systemAlert.severity === 'SEVERE'
                    ? 'bg-rose-500 text-white'
                    : systemAlert.severity === 'RESOLVED'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-yellow-300 text-slate-950'
                }">
                  {systemAlert.title}
                </div>

                {/* Banner Message Body */}
                <p className="text-xs font-semibold leading-snug tracking-wide opacity-95">
                  {systemAlert.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-8">
          {children}
        </main>

        <footer className="py-4 px-8 border-t border-purple-100 text-center text-xs text-slate-400 bg-white/60">
          LUMA AIRWAYS is a non-affiliated recreation. Created for staff & eCrew operations.
        </footer>
      </div>
    </div>
  );
}
