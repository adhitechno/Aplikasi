import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import { format } from 'date-fns';

const db = new Database('attendance.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfid_uid TEXT UNIQUE,
    nis TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    parent_phone TEXT,
    photo_url TEXT,
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time_in TEXT,
    time_out TEXT,
    status TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE(student_id, date)
  );
`);

// Seed initial data if empty
const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get() as { count: number };
if (classCount.count === 0) {
  const insertClass = db.prepare('INSERT INTO classes (name) VALUES (?)');
  insertClass.run('X IPA 1');
  insertClass.run('X IPA 2');
  insertClass.run('XI IPS 1');
  
  const insertStudent = db.prepare('INSERT INTO students (rfid_uid, nis, name, class_id, parent_phone, photo_url) VALUES (?, ?, ?, ?, ?, ?)');
  insertStudent.run('A1B2C3D4', '1001', 'Budi Santoso', 1, '081234567890', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi');
  insertStudent.run('E5F6G7H8', '1002', 'Siti Aminah', 1, '081234567891', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti');
  insertStudent.run('I9J0K1L2', '1003', 'Andi Wijaya', 2, '081234567892', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andi');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // SSE Clients
  let clients: express.Response[] = [];

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // SSE Endpoint for realtime scan updates
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);

    req.on('close', () => {
      clients = clients.filter(client => client !== res);
    });
  });

  const notifyClients = (data: any) => {
    clients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
  };

  // RFID Scan Endpoint (Called by NodeMCU/ESP8266)
  app.post('/api/rfid/scan', (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID is required' });

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm:ss');

    const student = db.prepare(`
      SELECT s.*, c.name as class_name 
      FROM students s 
      JOIN classes c ON s.class_id = c.id 
      WHERE s.rfid_uid = ?
    `).get(uid) as any;

    if (!student) {
      notifyClients({ type: 'UNKNOWN_CARD', uid, time: now });
      return res.status(404).json({ error: 'Student not found' });
    }

    const attendance = db.prepare('SELECT * FROM attendance WHERE student_id = ? AND date = ?').get(student.id, today) as any;

    let scanType = 'IN';
    if (!attendance) {
      // First scan = Masuk (In)
      db.prepare('INSERT INTO attendance (student_id, date, time_in, status) VALUES (?, ?, ?, ?)').run(student.id, today, now, 'hadir');
    } else if (!attendance.time_out) {
      // Second scan = Pulang (Out)
      db.prepare('UPDATE attendance SET time_out = ? WHERE id = ?').run(now, attendance.id);
      scanType = 'OUT';
    } else {
      // Already scanned out
      scanType = 'ALREADY_OUT';
    }

    const eventData = {
      type: 'SCAN',
      student,
      scanType,
      time: now,
      date: today
    };

    notifyClients(eventData);
    res.json(eventData);
  });

  // Dashboard Stats
  app.get('/api/dashboard/stats', (req, res) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const totalStudents = (db.prepare('SELECT COUNT(*) as count FROM students').get() as any).count;
    const present = (db.prepare('SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = ?').get(today, 'hadir') as any).count;
    const permitted = (db.prepare('SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = ?').get(today, 'izin') as any).count;
    const absent = totalStudents - present - permitted;

    const recentScans = db.prepare(`
      SELECT a.*, s.name, s.photo_url, c.name as class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE a.date = ?
      ORDER BY COALESCE(a.time_out, a.time_in) DESC
      LIMIT 10
    `).all(today);

    res.json({
      totalStudents,
      present,
      permitted,
      absent,
      recentScans
    });
  });

  // CRUD Classes
  app.get('/api/classes', (req, res) => {
    const classes = db.prepare('SELECT * FROM classes').all();
    res.json(classes);
  });

  app.post('/api/classes', (req, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare('INSERT INTO classes (name) VALUES (?)').run(name);
      res.json({ id: result.lastInsertRowid, name });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // CRUD Students
  app.get('/api/students', (req, res) => {
    const students = db.prepare(`
      SELECT s.*, c.name as class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.id
    `).all();
    res.json(students);
  });

  app.post('/api/students', (req, res) => {
    const { rfid_uid, nis, name, class_id, parent_phone, photo_url } = req.body;
    try {
      const result = db.prepare(
        'INSERT INTO students (rfid_uid, nis, name, class_id, parent_phone, photo_url) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(rfid_uid, nis, name, class_id, parent_phone, photo_url);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  
  app.put('/api/students/:id', (req, res) => {
    const { rfid_uid, nis, name, class_id, parent_phone, photo_url } = req.body;
    try {
      db.prepare(
        'UPDATE students SET rfid_uid = ?, nis = ?, name = ?, class_id = ?, parent_phone = ?, photo_url = ? WHERE id = ?'
      ).run(rfid_uid, nis, name, class_id, parent_phone, photo_url, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/students/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Reports
  app.get('/api/reports', (req, res) => {
    const { month, class_id } = req.query; // month format: YYYY-MM
    
    let query = `
      SELECT a.*, s.name, s.nis, s.parent_phone, c.name as class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE a.date LIKE ?
    `;
    const params: any[] = [`${month}%`];

    if (class_id) {
      query += ' AND s.class_id = ?';
      params.push(class_id);
    }
    
    query += ' ORDER BY a.date DESC, s.name ASC';

    const reports = db.prepare(query).all(...params);
    res.json(reports);
  });

  // WhatsApp Integration
  app.post('/api/whatsapp/send', async (req, res) => {
    const { phone, message } = req.body;
    
    if (!process.env.FONNTE_TOKEN) {
      // Fallback to mock if no token is provided
      console.log(`[WhatsApp Mock] Sending to ${phone}: ${message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.json({ success: true, message: 'Pesan WhatsApp berhasil dikirim (Mock - Token tidak diatur)' });
    }

    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': process.env.FONNTE_TOKEN
        },
        body: new URLSearchParams({
          target: phone,
          message: message
        })
      });

      const data = await response.json();
      
      if (data.status) {
        res.json({ success: true, message: 'Pesan WhatsApp berhasil dikirim' });
      } else {
        res.status(400).json({ success: false, message: data.reason || 'Gagal mengirim pesan' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
