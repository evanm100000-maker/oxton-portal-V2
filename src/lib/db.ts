import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import bcrypt from 'bcryptjs';

// On Vercel serverless functions, process.cwd() is read-only. Use os.tmpdir() (/tmp)
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const dbDir = isVercel ? os.tmpdir() : process.cwd();
const dbPath = path.join(dbDir, 'data.db');

if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {
    // Already exists
  }
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      preferred_name TEXT NOT NULL,
      roblox_username TEXT NOT NULL,
      discord_username TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STAFF',
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flight_code TEXT NOT NULL,
      host_name TEXT NOT NULL,
      aircraft TEXT NOT NULL,
      datetime_utc TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS flight_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flight_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNSURE',
      attendance_status TEXT DEFAULT 'NONE',
      attended INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(flight_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS loa_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      target_username TEXT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS consequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      issuer_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration helper for attendance_status column
  try {
    db.exec(`ALTER TABLE flight_allocations ADD COLUMN attendance_status TEXT DEFAULT 'NONE';`);
  } catch (e) {
    // Column already exists
  }

  // Seed Founder Account if missing
  const founderStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  const founder = founderStmt.get('evanm.100000@gmail.com');

  if (!founder) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Michelle11', salt);
    db.prepare(`
      INSERT INTO users (email, password_hash, preferred_name, roblox_username, discord_username, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'evanm.100000@gmail.com',
      passwordHash,
      'Evan (Founder)',
      'vortex23575',
      'evanm_founder',
      'FOUNDER',
      'ACTIVE'
    );
  }

  // Seed Sample Announcements if empty
  const annCountStmt = db.prepare(`SELECT COUNT(*) as count FROM announcements`);
  const annCount = annCountStmt.get() as { count: number };
  if (annCount && annCount.count === 0) {
    db.prepare(`
      INSERT INTO announcements (author_id, title, content)
      VALUES (?, ?, ?)
    `).run(
      1,
      'Welcome to Luma Airways Staff Portal',
      'Welcome all staff to the official Luma Airways eCrew portal! Please ensure you allocate your flight availability weekly and check the announcements channel.'
    );
  }

  // Seed Sample Flight if empty
  const flightCountStmt = db.prepare(`SELECT COUNT(*) as count FROM flights`);
  const flightCount = flightCountStmt.get() as { count: number };
  if (flightCount && flightCount.count === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    db.prepare(`
      INSERT INTO flights (flight_code, host_name, aircraft, datetime_utc, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'LM-104',
      'Capt. Evan',
      'Boeing 787-9 Dreamliner',
      tomorrow.toISOString(),
      'UPCOMING'
    );
  }
}
