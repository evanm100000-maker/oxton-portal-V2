'use client';

import React, { useEffect, useState } from 'react';
import { Settings, User, Lock, Camera, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function UserSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [preferredName, setPreferredName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setPreferredName(data.user.preferred_name || '');
          setAvatarUrl(data.user.avatar_url || '');
        }
        setLoading(false);
      });
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          preferred_name: preferredName,
          avatar_url: avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileMsg('Profile updated successfully!');
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPassword(true);
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg('Error: New password and confirm password do not match.');
      setSubmittingPassword(false);
      return;
    }

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPasswordMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg(`Error: ${err.message}`);
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-purple-600" />
          Account Settings
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-0.5">
          Update your preferred name, profile picture, and account security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" /> Profile Information
          </h3>

          {profileMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              profileMsg.startsWith('Error') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {profileMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Preferred Display Name</label>
              <input
                type="text"
                required
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g. Capt. Alex"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Profile Picture Image URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Paste a direct image link for your custom avatar.</p>
            </div>

            {avatarUrl && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-2xl border border-purple-100">
                <img src={avatarUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-purple-200" />
                <span className="text-xs font-bold text-purple-900">Avatar Preview</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submittingProfile}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {submittingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-purple-100 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" /> Security & Password
          </h3>

          {passwordMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              passwordMsg.startsWith('Error') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {passwordMsg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submittingPassword}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {submittingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
