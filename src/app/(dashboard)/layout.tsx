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
  Plane
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

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
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
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
