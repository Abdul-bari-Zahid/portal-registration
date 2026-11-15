const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Admin = require('../models/Admin');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const config = require('../config/config');

let mongoServer;
let adminCookie;
let approvedRegistrationId;
let approvedTicketRawToken;
let rejectedRegistrationId;

// 1x1 PNG image buffer with genuine magic bytes (89 50 4E 47 0D 0A 1A 0A)
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Fake image buffer (plain text disguised with .png extension)
const fakeImageBuffer = Buffer.from('This is a text file, not a real PNG image!');

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed single initial admin
  const admin = new Admin({
    email: config.admin.email,
    passwordHash: config.admin.initialPassword,
    role: 'ADMIN',
  });
  await admin.save();
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('1. Public Registration Security & Validation', () => {
  it('Scenario 1: User submits valid registration with authentic image proof', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .field('fullName', 'Alice Johnson')
      .field('email', 'alice.johnson@techuniv.edu')
      .field('department', 'CS')
      .field('phoneNumber', '+1 (555) 123-4567')
      .attach('paymentProof', validPngBuffer, {
        filename: 'receipt.png',
        contentType: 'image/png',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(
      res.body.message,
      'Your registration has been submitted successfully. Your payment is pending verification by the administrator.'
    );
    assert.match(res.body.data.registrationId, /^REG-\d{4}-[A-Z0-9]+$/);
    assert.strictEqual(res.body.data.ticket, undefined); // MUST NOT generate ticket immediately!

    approvedRegistrationId = res.body.data.registrationId;
  });

  it('Scenario 2: Invalid email address is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .field('fullName', 'Bob Smith')
      .field('email', 'not-an-email-address')
      .field('department', 'BS')
      .field('phoneNumber', '+1 (555) 987-6543')
      .attach('paymentProof', validPngBuffer, {
        filename: 'receipt.png',
        contentType: 'image/png',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  it('Scenario 3: Missing required fields are rejected with 400', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .field('fullName', '')
      .field('email', 'bob@test.com')
      .attach('paymentProof', validPngBuffer, {
        filename: 'receipt.png',
        contentType: 'image/png',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  it('Scenario 4: Fake image file (extension spoofing) is rejected by binary inspection', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .field('fullName', 'Mallory Malicious')
      .field('email', 'mallory@exploit.com')
      .field('department', 'CS')
      .field('phoneNumber', '+1 (555) 000-1111')
      .attach('paymentProof', fakeImageBuffer, {
        filename: 'payload.png',
        contentType: 'image/png',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('File security verification failed'));
  });

  it('Submit a second valid registration for rejection testing', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .field('fullName', 'Charlie Davis')
      .field('email', 'charlie.davis@corp.com')
      .field('department', 'BBA')
      .field('phoneNumber', '+1 (555) 444-5555')
      .attach('paymentProof', validPngBuffer, {
        filename: 'payment_slip.png',
        contentType: 'image/png',
      });

    assert.strictEqual(res.status, 201);
    rejectedRegistrationId = res.body.data.registrationId;
  });
});

describe('2. Authentication & Admin Authorization Boundaries', () => {
  it('Scenario 16: Unauthenticated visitors cannot access admin registrations API', async () => {
    const res = await request(app).get('/api/registrations');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('Scenario 18: Private payment images cannot be accessed publicly without admin session', async () => {
    const reg = await Registration.findOne({ registrationId: approvedRegistrationId });
    const res = await request(app).get(`/api/registrations/${reg._id}/payment-proof`);
    assert.strictEqual(res.status, 401);
  });

  it('Scenario 7 & 4: Admin login succeeds and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: config.admin.email,
        password: config.admin.initialPassword,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.admin.email, config.admin.email);

    // Save cookie for subsequent admin requests
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    adminCookie = cookies.find((c) => c.startsWith('admin_auth_token='));
    assert.ok(adminCookie);
  });

  it('Single admin constraint: Attempt to create a second admin is strictly rejected', async () => {
    try {
      const secondAdmin = new Admin({
        email: 'attacker@intruder.com',
        passwordHash: 'AnotherPass123!',
      });
      await secondAdmin.save();
      assert.fail('Should have rejected creation of second admin');
    } catch (err) {
      assert.ok(err.message.includes('Strict Admin Constraint: Only ONE admin account is permitted'));
    }
  });
});

describe('3. Registration & Payment Verification Management', () => {
  it('Scenario 5: Registration appears in admin registrations data table', async () => {
    const res = await request(app)
      .get('/api/registrations')
      .set('Cookie', [adminCookie]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.length >= 2);
    const found = res.body.data.find((r) => r.registrationId === approvedRegistrationId);
    assert.ok(found);
    assert.strictEqual(found.fullName, 'Alice Johnson');
    assert.strictEqual(found.paymentStatus, 'PENDING');
  });

  it('Scenario 6: Payment screenshot is viewable by authenticated admin', async () => {
    const reg = await Registration.findOne({ registrationId: approvedRegistrationId });
    const res = await request(app)
      .get(`/api/registrations/${reg._id}/payment-proof`)
      .set('Cookie', [adminCookie]);

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('image/'));
  });

  it('Scenario 7 & 8: Admin approves payment; QR ticket is generated only after approval', async () => {
    const reg = await Registration.findOne({ registrationId: approvedRegistrationId });

    // Ticket must not exist prior to approval
    const preTicket = await Ticket.findOne({ registrationId: reg._id });
    assert.strictEqual(preTicket, null);

    const res = await request(app)
      .post(`/api/payments/registrations/${reg._id}/approve`)
      .set('Cookie', [adminCookie]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.registration.paymentStatus, 'APPROVED');
    assert.ok(res.body.data.ticket);
    assert.strictEqual(res.body.data.ticket.ticketStatus, 'ISSUED');
    assert.match(res.body.data.ticket.ticketId, /^TCK-\d{4}-[A-Z0-9]+$/);
    assert.ok(res.body.data.rawToken);

    approvedTicketRawToken = res.body.data.rawToken;
  });

  it('Repeated approval on already-approved registration is prevented', async () => {
    const reg = await Registration.findOne({ registrationId: approvedRegistrationId });
    const res = await request(app)
      .post(`/api/payments/registrations/${reg._id}/approve`)
      .set('Cookie', [adminCookie]);

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('already approved'));
  });

  it('Scenario 9: Admin downloads ticket PDF', async () => {
    const reg = await Registration.findOne({ registrationId: approvedRegistrationId });
    const ticket = await Ticket.findOne({ registrationId: reg._id });

    const res = await request(app)
      .get(`/api/tickets/${ticket._id}/download-pdf`)
      .set('Cookie', [adminCookie]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    assert.ok(res.body);
  });

  it('Scenario 10 & 11: Admin rejects a payment; no ticket is generated and rejected user cannot enter', async () => {
    const reg = await Registration.findOne({ registrationId: rejectedRegistrationId });

    const res = await request(app)
      .post(`/api/payments/registrations/${reg._id}/reject`)
      .set('Cookie', [adminCookie])
      .send({ reason: 'Transaction reference not found on bank statement.' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.registration.paymentStatus, 'REJECTED');
    assert.ok(res.body.data.registration.rejectionReason.includes('Transaction reference not found'));

    // Confirm no ticket was created
    const rejectedTicket = await Ticket.findOne({ registrationId: reg._id });
    assert.strictEqual(rejectedTicket, null);
  });
});

describe('4. Atomic One-Time QR Code Verification & Gate Scanning', () => {
  it('Scenario 15: Invalid QR code is rejected with INVALID QR CODE', async () => {
    const res = await request(app)
      .post('/api/scanner/verify')
      .set('Cookie', [adminCookie])
      .send({ token: 'completely-non-existent-random-token-12345678' });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.status, 'INVALID');
    assert.strictEqual(res.body.message, 'INVALID QR CODE');
  });

  it('Scenario 12: First QR scan succeeds with ENTRY SUCCESSFUL', async () => {
    const res = await request(app)
      .post('/api/scanner/verify')
      .set('Cookie', [adminCookie])
      .send({ token: approvedTicketRawToken });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'SUCCESS');
    assert.strictEqual(res.body.message, 'ENTRY SUCCESSFUL');
    assert.strictEqual(res.body.data.userName, 'Alice Johnson');
    assert.strictEqual(res.body.data.registrationId, approvedRegistrationId);
    assert.strictEqual(res.body.data.department, 'CS');
    assert.ok(res.body.data.entryTime);

    // Verify DB state updated
    const ticketInDb = await Ticket.findOne({ ticketId: res.body.data.ticketId });
    assert.strictEqual(ticketInDb.isScanned, true);
    assert.strictEqual(ticketInDb.ticketStatus, 'SCANNED');
  });

  it('Scenario 13: Second QR scan fails with ALREADY SCANNED and returns original timestamp', async () => {
    const res = await request(app)
      .post('/api/scanner/verify')
      .set('Cookie', [adminCookie])
      .send({ token: approvedTicketRawToken });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.status, 'ALREADY_SCANNED');
    assert.strictEqual(res.body.message, 'ALREADY SCANNED');
    assert.strictEqual(res.body.description, 'This QR code has already been used.');
    assert.ok(res.body.data.originalEntryTime);
  });

  it('Scenario 14: Race Condition Protection - Simultaneous scans allow only ONE entry', async () => {
    // Generate a fresh registration and ticket for concurrent testing
    const freshReg = new Registration({
      fullName: 'Concurrent Scan Tester',
      email: 'concurrent@tester.org',
      department: 'A&C',
      phoneNumber: '+1 555 999 8888',
      paymentScreenshotStorageKey: 'dummy.png',
      registrationId: 'REG-2026-RACE01',
      paymentStatus: 'APPROVED',
    });
    await freshReg.save();

    const crypto = require('crypto');
    const freshToken = crypto.randomBytes(32).toString('hex');
    const freshTokenHash = crypto.createHash('sha256').update(freshToken).digest('hex');

    const freshTicket = new Ticket({
      ticketId: 'TCK-2026-RACE01',
      registrationId: freshReg._id,
      qrTokenHash: freshTokenHash,
      ticketStatus: 'ISSUED',
      isScanned: false,
    });
    await freshTicket.save();

    // Fire TWO simultaneous scan requests concurrently
    const [scan1, scan2] = await Promise.all([
      request(app).post('/api/scanner/verify').set('Cookie', [adminCookie]).send({ token: freshToken }),
      request(app).post('/api/scanner/verify').set('Cookie', [adminCookie]).send({ token: freshToken }),
    ]);

    const statuses = [scan1.status, scan2.status].sort();
    // Exactly one must be 200 (SUCCESS) and one must be 409 (ALREADY_SCANNED)
    assert.deepStrictEqual(statuses, [200, 409]);

    const successRes = scan1.status === 200 ? scan1 : scan2;
    const failureRes = scan1.status === 409 ? scan1 : scan2;

    assert.strictEqual(successRes.body.status, 'SUCCESS');
    assert.strictEqual(failureRes.body.status, 'ALREADY_SCANNED');
  });
});

describe('5. Session Termination & Audit Reporting', () => {
  it('Scenario 17: Admin logout successfully terminates session', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [adminCookie]);

    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.success, true);

    // Verify session cookie is invalidated/cleared
    const clearCookieHeader = logoutRes.headers['set-cookie'];
    assert.ok(clearCookieHeader);

    // Verify subsequent requests without auth session are denied
    const testMeRes = await request(app).get('/api/auth/me');
    assert.strictEqual(testMeRes.status, 401);
  });
});
