const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'grudge-ledger-dev-secret';
const TOKEN_TTL = process.env.JWT_TTL || '30d';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarSeed: user.avatarSeed || user.id,
    createdAt: user.createdAt
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      sub: user.id,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function validateRegistration({ name, email, password }) {
  const errors = [];

  if (!name || !String(name).trim()) {
    errors.push('name is required');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
    errors.push('valid email is required');
  }

  if (!password || String(password).length < 6) {
    errors.push('password must be at least 6 characters');
  }

  return errors;
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const errors = validateRegistration({ name, email, password });

    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const normalizedEmail = normalizeEmail(email);
    const users = await db.getUsers();

    if (users.some((user) => user.email === normalizedEmail)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      avatarSeed: crypto.randomBytes(4).toString('hex'),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await db.saveUsers(users);

    res.status(201).json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const users = await db.getUsers();
    const user = users.find((candidate) => candidate.email === normalizeEmail(email));

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;