import bcrypt from 'bcryptjs';

const FIREBASE_DB_URL = "https://luma-oportal-23434-default-rtdb.europe-west1.firebasedatabase.app";

async function fbFetch(endpoint: string, options?: RequestInit) {
  const url = `${FIREBASE_DB_URL}/${endpoint}.json`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firebase RTDB Error (${res.status}): ${errText}`);
  }
  return res.json();
}

// Seed ONLY the Founder Account if missing. NEVER re-seed deleted flights or announcements.
export async function ensureFounderAccount() {
  try {
    const users = await fbFetch('users');
    if (!users || Object.keys(users).length === 0) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('Michelle11', salt);

      await fbFetch('users/1', {
        method: 'PUT',
        body: JSON.stringify({
          id: 1,
          email: 'evanm.100000@gmail.com',
          password_hash: passwordHash,
          preferred_name: 'Evan (Founder)',
          roblox_username: 'vortex23575',
          discord_username: 'evanm_founder',
          role: 'FOUNDER',
          status: 'ACTIVE',
          created_at: new Date().toISOString()
        })
      });
    }
  } catch (err) {
    console.error('Firebase Founder Seeding Error:', err);
  }
}

// --- USERS ---
export async function getUsersList(): Promise<any[]> {
  await ensureFounderAccount();
  const data = await fbFetch('users');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function getUserByEmail(email: string): Promise<any | null> {
  const users = await getUsersList();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function getUserById(id: number): Promise<any | null> {
  const users = await getUsersList();
  return users.find((u) => Number(u.id) === Number(id)) || null;
}

export async function createUser(userData: any): Promise<any> {
  const users = await getUsersList();
  const nextId = users.length > 0 ? Math.max(...users.map((u) => Number(u.id) || 0)) + 1 : 1;

  const newUser = {
    ...userData,
    id: nextId,
    created_at: new Date().toISOString()
  };

  await fbFetch(`users/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify(newUser)
  });

  return newUser;
}

export async function updateUser(id: number, updates: any): Promise<void> {
  await fbFetch(`users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

// --- FLIGHTS ---
export async function getFlightsList(): Promise<any[]> {
  const data = await fbFetch('flights');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function createFlight(flightData: any): Promise<any> {
  const flights = await getFlightsList();
  const nextId = flights.length > 0 ? Math.max(...flights.map((f) => Number(f.id) || 0)) + 1 : 1;

  const newFlight = {
    ...flightData,
    id: nextId,
    created_at: new Date().toISOString()
  };

  await fbFetch(`flights/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify(newFlight)
  });

  return newFlight;
}

export async function updateFlight(id: number, updates: any): Promise<void> {
  await fbFetch(`flights/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteFlight(id: number): Promise<void> {
  await fbFetch(`flights/${id}`, {
    method: 'DELETE'
  });
}

// --- ALLOCATIONS ---
export async function getAllocationsList(): Promise<any[]> {
  const data = await fbFetch('allocations');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function saveAllocation(flightId: number, userId: number, status: string, attendanceStatus = 'NONE'): Promise<void> {
  const key = `${flightId}_${userId}`;
  await fbFetch(`allocations/${key}`, {
    method: 'PUT',
    body: JSON.stringify({
      flight_id: flightId,
      user_id: userId,
      status,
      attendance_status: attendanceStatus,
      attended: (attendanceStatus === 'PRESENT' || attendanceStatus === 'LATE') ? 1 : 0,
      updated_at: new Date().toISOString()
    })
  });
}

// --- LOA REQUESTS ---
export async function getLOARequestsList(): Promise<any[]> {
  const data = await fbFetch('loa_requests');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function createLOARequest(loaData: any): Promise<any> {
  const list = await getLOARequestsList();
  const nextId = list.length > 0 ? Math.max(...list.map((r) => Number(r.id) || 0)) + 1 : 1;

  const newReq = {
    ...loaData,
    id: nextId,
    created_at: new Date().toISOString()
  };

  await fbFetch(`loa_requests/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify(newReq)
  });

  return newReq;
}

export async function updateLOARequest(id: number, updates: any): Promise<void> {
  await fbFetch(`loa_requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

// --- REPORTS ---
export async function getReportsList(): Promise<any[]> {
  const data = await fbFetch('reports');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function createReport(reportData: any): Promise<any> {
  const list = await getReportsList();
  const nextId = list.length > 0 ? Math.max(...list.map((r) => Number(r.id) || 0)) + 1 : 1;

  const newReport = {
    ...reportData,
    id: nextId,
    created_at: new Date().toISOString()
  };

  await fbFetch(`reports/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify(newReport)
  });

  return newReport;
}

export async function updateReport(id: number, updates: any): Promise<void> {
  await fbFetch(`reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

// --- SUPPORT TICKETS ---
export async function getTicketsList(): Promise<any[]> {
  const data = await fbFetch('tickets');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function createTicket(ticketData: any, initialMessage: string, senderName: string, senderRole: string): Promise<any> {
  const list = await getTicketsList();
  const nextId = list.length > 0 ? Math.max(...list.map((t) => Number(t.id) || 0)) + 1 : 1;

  const newTicket = {
    ...ticketData,
    id: nextId,
    messages: [
      {
        id: 1,
        sender_id: ticketData.user_id,
        sender_name: senderName,
        sender_role: senderRole,
        message: initialMessage,
        created_at: new Date().toISOString()
      }
    ],
    created_at: new Date().toISOString()
  };

  await fbFetch(`tickets/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify(newTicket)
  });

  return newTicket;
}

export async function addTicketMessage(ticketId: number, senderId: number, senderName: string, senderRole: string, message: string): Promise<void> {
  const ticket = await fbFetch(`tickets/${ticketId}`);
  if (!ticket) return;

  const messages = ticket.messages || [];
  const nextMsgId = messages.length + 1;

  messages.push({
    id: nextMsgId,
    sender_id: senderId,
    sender_name: senderName,
    sender_role: senderRole,
    message,
    created_at: new Date().toISOString()
  });

  await fbFetch(`tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify({ messages })
  });
}

export async function updateTicket(id: number, updates: any): Promise<void> {
  await fbFetch(`tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

// --- CONSEQUENCES ---
export async function getConsequencesList(): Promise<any[]> {
  const data = await fbFetch('consequences');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function createConsequence(consData: any): Promise<any> {
  const list = await getConsequencesList();
  const nextId = list.length > 0 ? Math.max(...list.map((c) => Number(c.id) || 0)) + 1 : 1;

  const newCons = {
    ...consData,
    id: nextId,
    created_at: new Date().toISOString()
  };

  await fbFetch(`consequences/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify(newCons)
  });

  return newCons;
}

// --- ANNOUNCEMENTS ---
export async function getAnnouncementsList(): Promise<any[]> {
  const data = await fbFetch('announcements');
  if (!data) return [];
  return Object.values(data).filter(Boolean);
}

export async function createAnnouncement(annData: any): Promise<any> {
  const list = await getAnnouncementsList();
  const nextId = list.length > 0 ? Math.max(...list.map((a) => Number(a.id) || 0)) + 1 : 1;

  const newAnn = {
    ...annData,
    id: nextId,
    created_at: new Date().toISOString()
  };

  await fbFetch(`announcements/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify(newAnn)
  });

  return newAnn;
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await fbFetch(`announcements/${id}`, {
    method: 'DELETE'
  });
}

// --- NOTIFICATIONS ---
export async function getNotificationsList(userId?: number): Promise<any[]> {
  const data = await fbFetch('notifications');
  if (!data) return [];
  const list = Object.values(data).filter(Boolean);
  if (userId) {
    return list.filter((n: any) => Number(n.user_id) === Number(userId));
  }
  return list;
}

export async function createNotification(userId: number, title: string, message: string, type = 'INFO'): Promise<void> {
  const list = await getNotificationsList();
  const nextId = list.length > 0 ? Math.max(...list.map((n) => Number(n.id) || 0)) + 1 : 1;

  await fbFetch(`notifications/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: nextId,
      user_id: userId,
      title,
      message,
      type,
      is_read: 0,
      created_at: new Date().toISOString()
    })
  });
}

export async function markNotificationsAsRead(userId: number): Promise<void> {
  const list = await getNotificationsList(userId);
  for (const n of list) {
    if (!n.is_read) {
      await fbFetch(`notifications/${n.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_read: 1 })
      });
    }
  }
}

// --- SETTINGS & ALERTS ---
export async function getSystemSettings(): Promise<any> {
  const data = await fbFetch('settings');
  return data || { maintenance_mode: '0', maintenance_message: 'Luma Airways portal is currently under scheduled maintenance.' };
}

export async function updateSystemSetting(key: string, value: string): Promise<void> {
  await fbFetch(`settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify(value)
  });
}

export async function getActiveSystemAlert(): Promise<any | null> {
  const data = await fbFetch('alerts');
  if (!data) return null;
  const list = Object.values(data).filter(Boolean) as any[];
  const active = list.filter((a) => a.is_active === 1).sort((a, b) => b.id - a.id);
  return active.length > 0 ? active[0] : null;
}

export async function createSystemAlert(title: string, message: string, severity = 'WARNING'): Promise<void> {
  const data = await fbFetch('alerts');
  const list = data ? Object.values(data).filter(Boolean) as any[] : [];
  const nextId = list.length > 0 ? Math.max(...list.map((a) => Number(a.id) || 0)) + 1 : 1;

  for (const a of list) {
    if (a.is_active) {
      await fbFetch(`alerts/${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: 0 })
      });
    }
  }

  await fbFetch(`alerts/${nextId}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: nextId,
      title,
      message,
      severity,
      is_active: 1,
      created_at: new Date().toISOString()
    })
  });
}

export async function resolveSystemAlert(alertId?: number): Promise<void> {
  if (alertId) {
    await fbFetch(`alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ severity: 'RESOLVED' })
    });
  } else {
    const alert = await getActiveSystemAlert();
    if (alert) {
      await fbFetch(`alerts/${alert.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: 0 })
      });
    }
  }
}
