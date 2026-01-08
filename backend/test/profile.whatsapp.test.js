import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';

let mongo;
let app;

const makeToken = (user) => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    { _id: user._id.toString(), role: user.role || 'employee' },
    secret,
    { expiresIn: '1h' }
  );
};

before(async () => {
  process.env.JWT_SECRET = 'test-secret';

  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();

  await mongoose.connect(process.env.MONGODB_URI);

  // Ensure indexes (including unique whatsappNumber) exist for duplicate test
  await User.syncIndexes();

  const mod = await import('../api/index.js');
  app = mod.default;
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

test('PUT /api/profile updates whatsappNumber and whatsappPreferences', async () => {
  const companyId = new mongoose.Types.ObjectId();
  const user = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 't1@example.com',
    password: 'hashed',
    role: 'employee',
    company: companyId,
  });

  const token = makeToken(user);

  const res = await request(app)
    .put('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      whatsappNumber: '14583092310',
      whatsappPreferences: {
        enabled: true,
        taskAssigned: false,
        taskUpdates: true,
        reminders: false,
      },
    })
    .expect(200);

  assert.equal(res.body?.user?.whatsappNumber, '+14583092310');
  assert.equal(res.body?.user?.whatsappPreferences?.enabled, true);
  assert.equal(res.body?.user?.whatsappPreferences?.taskAssigned, false);
  assert.equal(res.body?.user?.whatsappPreferences?.taskUpdates, true);
  assert.equal(res.body?.user?.whatsappPreferences?.reminders, false);

  const fresh = await User.findById(user._id).lean();
  assert.equal(fresh.whatsappNumber, '+14583092310');
});

test('PUT /api/profile rejects duplicate whatsappNumber', async () => {
  const companyId = new mongoose.Types.ObjectId();

  const u1 = await User.create({
    firstName: 'A',
    lastName: 'One',
    email: 'a1@example.com',
    password: 'hashed',
    role: 'employee',
    company: companyId,
    whatsappNumber: '+14583092310',
  });

  const u2 = await User.create({
    firstName: 'B',
    lastName: 'Two',
    email: 'b2@example.com',
    password: 'hashed',
    role: 'employee',
    company: companyId,
  });

  // Keep lint happy: u1 is used to ensure the number exists
  assert.ok(u1._id);

  const token = makeToken(u2);

  const res = await request(app)
    .put('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ whatsappNumber: '+14583092310' })
    .expect(400);

  assert.equal(res.body?.message, 'WhatsApp number already exists');
});

test('PUT /api/profile can clear whatsappNumber', async () => {
  const companyId = new mongoose.Types.ObjectId();
  const user = await User.create({
    firstName: 'Clear',
    lastName: 'Me',
    email: 'c@example.com',
    password: 'hashed',
    role: 'employee',
    company: companyId,
    whatsappNumber: '+14583092310',
  });

  const token = makeToken(user);

  await request(app)
    .put('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ whatsappNumber: '' })
    .expect(200);

  const fresh = await User.findById(user._id).lean();
  assert.ok(!fresh.whatsappNumber);
});
