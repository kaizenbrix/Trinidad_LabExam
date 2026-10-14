require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'helpdesk',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(500).json({ status: 'error', message: 'Database connection failed.' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === 'itadmin' && password === 'helpdesk123') {
    return res.json({
      success: true,
      message: 'Login successful',
      username,
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid login credentials.',
  });
});

app.get('/api/tickets', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tickets ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    console.error('Unable to fetch tickets:', error.message);
    return res.status(500).json({ message: 'Unable to fetch tickets.' });
  }
});

app.get('/api/tickets/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Unable to load the ticket:', error.message);
    return res.status(500).json({ message: 'Unable to load the ticket.' });
  }
});

app.post('/api/tickets', async (req, res) => {
  const { requesterName, category, priority, subject, description, status } = req.body || {};

  const trimmedRequester = requesterName?.trim();
  const trimmedCategory = category?.trim();
  const trimmedPriority = priority?.trim();
  const trimmedSubject = subject?.trim();
  const trimmedDescription = description?.trim();
  const ticketStatus = status?.trim() || 'Open';

  if (!trimmedRequester || !trimmedCategory || !trimmedPriority || !trimmedSubject || !trimmedDescription) {
    return res.status(400).json({
      message: 'All ticket fields are required. Please fill in the request form completely.',
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const temporaryTicketNumber = `PENDING-${crypto.randomUUID()}`;
    const [result] = await connection.execute(
      `INSERT INTO tickets (ticket_number, requester_name, issue_category, priority, subject, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [temporaryTicketNumber, trimmedRequester, trimmedCategory, trimmedPriority, trimmedSubject, trimmedDescription, ticketStatus],
    );
    const ticketNumber = `TCK-${result.insertId}`;

    await connection.execute(
      'UPDATE tickets SET ticket_number = ? WHERE id = ?',
      [ticketNumber, result.insertId],
    );
    const [rows] = await connection.execute('SELECT * FROM tickets WHERE id = ?', [result.insertId]);
    await connection.commit();

    return res.status(201).json({
      message: 'Ticket created successfully.',
      ticket: rows[0],
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Unable to save ticket:', error.message);
    return res.status(500).json({ message: 'Unable to save ticket.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/api/tickets/:id', async (req, res) => {
  const { requesterName, category, priority, subject, description, status } = req.body || {};

  const trimmedRequester = requesterName?.trim();
  const trimmedCategory = category?.trim();
  const trimmedPriority = priority?.trim();
  const trimmedSubject = subject?.trim();
  const trimmedDescription = description?.trim();
  const ticketStatus = status?.trim() || 'Open';

  if (!trimmedRequester || !trimmedCategory || !trimmedPriority || !trimmedSubject || !trimmedDescription) {
    return res.status(400).json({
      message: 'All ticket fields are required. Please fill in the request form completely.',
    });
  }

  try {
    const [result] = await db.execute(
      `UPDATE tickets
       SET requester_name = ?, issue_category = ?, priority = ?, subject = ?, description = ?, status = ?
       WHERE id = ?`,
      [trimmedRequester, trimmedCategory, trimmedPriority, trimmedSubject, trimmedDescription, ticketStatus, req.params.id],
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.execute('SELECT id FROM tickets WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Ticket not found.' });
      }
    }

    const [rows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    return res.json({
      message: 'Ticket updated successfully.',
      ticket: rows[0],
    });
  } catch (error) {
    console.error('Unable to update the ticket:', error.message);
    return res.status(500).json({ message: 'Unable to update the ticket.' });
  }
});

app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM tickets WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    return res.json({ message: 'Ticket deleted successfully.' });
  } catch (error) {
    console.error('Unable to delete the ticket:', error.message);
    return res.status(500).json({ message: 'Unable to delete the ticket.' });
  }
});

app.listen(PORT, () => {
  console.log(`Helpdesk API running on http://localhost:${PORT}`);
});
