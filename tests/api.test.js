const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { startDB, stopDB } = require('./setup');
const app = require('../src/app');
const User = require('../src/models/User');

const alice = { username: 'alice', email: 'alice@example.com', password: 'Passw0rd123' };
const bob = { username: 'bob', email: 'bob@example.com', password: 'Secret456pw' };
const employee = {
  first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', position: 'Software Engineer',
  salary: 85000, date_of_joining: '2024-01-15', department: 'Engineering',
};

let aliceToken; let bobToken; let aliceEmpId; let bobEmpId;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(startDB);
afterAll(stopDB);

describe('General', () => {
  test('GET /health returns 200 with DB status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: true, database: 'connected' });
  });

  test('Helmet security headers are present', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('Unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe(false);
  });

  test('Malformed JSON returns 400', async () => {
    const res = await request(app).post('/api/v1/user/signup')
      .set('Content-Type', 'application/json').send('{"username": "x",');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Malformed JSON/);
    expect(res.body.stack).toBeUndefined();
  });
});

describe('POST /api/v1/user/signup', () => {
  test('creates a user (201) and never returns the password', async () => {
    const res = await request(app).post('/api/v1/user/signup').send(alice);
    expect(res.status).toBe(201);
    expect(res.body.user_id).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  test('password is stored hashed', async () => {
    const u = await User.findOne({ username: 'alice' }).select('+password');
    expect(u.password).not.toBe(alice.password);
    expect(u.password).toMatch(/^\$2[aby]\$/);
  });

  test('duplicate email returns 409', async () => {
    const res = await request(app).post('/api/v1/user/signup').send({ ...alice, username: 'alice2' });
    expect(res.status).toBe(409);
  });

  test('duplicate username returns 409', async () => {
    const res = await request(app).post('/api/v1/user/signup').send({ ...alice, email: 'other@example.com' });
    expect(res.status).toBe(409);
  });

  test('missing fields return 400 with field errors', async () => {
    const res = await request(app).post('/api/v1/user/signup').send({});
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['username', 'email', 'password']));
  });

  test('invalid email and weak password return 400', async () => {
    const res = await request(app).post('/api/v1/user/signup')
      .send({ username: 'carl', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  test('second user can sign up', async () => {
    const res = await request(app).post('/api/v1/user/signup').send(bob);
    expect(res.status).toBe(201);
  });
});

describe('POST /api/v1/user/login', () => {
  test('login with username returns JWT (200)', async () => {
    const res = await request(app).post('/api/v1/user/login')
      .send({ username: alice.username, password: alice.password });
    expect(res.status).toBe(200);
    expect(res.body.jwt_token).toBeDefined();
    aliceToken = res.body.jwt_token;
  });

  test('login with email returns JWT (200)', async () => {
    const res = await request(app).post('/api/v1/user/login')
      .send({ email: bob.email, password: bob.password });
    expect(res.status).toBe(200);
    bobToken = res.body.jwt_token;
  });

  test('wrong password returns 401', async () => {
    const res = await request(app).post('/api/v1/user/login')
      .send({ username: alice.username, password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  test('unknown user returns 401', async () => {
    const res = await request(app).post('/api/v1/user/login')
      .send({ username: 'ghost', password: 'WhateverPass1' });
    expect(res.status).toBe(401);
  });

  test('missing identifier/password returns 400', async () => {
    const res = await request(app).post('/api/v1/user/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('JWT protection', () => {
  test('no token returns 401', async () => {
    const res = await request(app).get('/api/v1/emp/employees');
    expect(res.status).toBe(401);
  });

  test('malformed header returns 401', async () => {
    const res = await request(app).get('/api/v1/emp/employees').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  test('invalid token returns 401', async () => {
    const res = await request(app).get('/api/v1/emp/employees').set(auth('not.a.jwt'));
    expect(res.status).toBe(401);
  });

  test('expired token returns 401', async () => {
    const u = await User.findOne({ username: 'alice' });
    const expired = jwt.sign({ sub: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/v1/emp/employees').set(auth(expired));
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('token signed with another secret returns 401', async () => {
    const forged = jwt.sign({ sub: new mongoose.Types.ObjectId().toString() }, 'wrong-secret');
    const res = await request(app).get('/api/v1/emp/employees').set(auth(forged));
    expect(res.status).toBe(401);
  });
});

describe('Employee CRUD', () => {
  test('POST creates employee owned by caller (201)', async () => {
    const res = await request(app).post('/api/v1/emp/employees').set(auth(aliceToken)).send(employee);
    expect(res.status).toBe(201);
    expect(res.body.employee_id).toBeDefined();
    aliceEmpId = res.body.employee_id;
    const me = await User.findOne({ username: 'alice' });
    expect(res.body.employee.user).toBe(me._id.toString());
  });

  test('POST ignores/rejects client-supplied owner (400)', async () => {
    const res = await request(app).post('/api/v1/emp/employees').set(auth(aliceToken))
      .send({ ...employee, email: 'x@example.com', user: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(400);
  });

  test('POST validation: missing fields, negative salary, bad date (400)', async () => {
    const res = await request(app).post('/api/v1/emp/employees').set(auth(aliceToken))
      .send({ first_name: 'A', email: 'bad', salary: -5, date_of_joining: '2024-13-45' });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['last_name', 'email', 'position', 'department', 'salary', 'date_of_joining']));
  });

  test('POST duplicate employee email for same user (409)', async () => {
    const res = await request(app).post('/api/v1/emp/employees').set(auth(aliceToken)).send(employee);
    expect(res.status).toBe(409);
  });

  test('Bob can create his own employee', async () => {
    const res = await request(app).post('/api/v1/emp/employees').set(auth(bobToken))
      .send({ ...employee, first_name: 'Jane', email: 'jane@example.com' });
    expect(res.status).toBe(201);
    bobEmpId = res.body.employee_id;
  });

  test('GET list returns only caller\'s employees (200)', async () => {
    const res = await request(app).get('/api/v1/emp/employees').set(auth(aliceToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].employee_id).toBe(aliceEmpId);
  });

  test('GET by id (200)', async () => {
    const res = await request(app).get(`/api/v1/emp/employees/${aliceEmpId}`).set(auth(aliceToken));
    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('John');
  });

  test('GET by invalid ObjectId (400)', async () => {
    const res = await request(app).get('/api/v1/emp/employees/123').set(auth(aliceToken));
    expect(res.status).toBe(400);
  });

  test('GET non-existent employee (404)', async () => {
    const res = await request(app).get(`/api/v1/emp/employees/${new mongoose.Types.ObjectId()}`).set(auth(aliceToken));
    expect(res.status).toBe(404);
  });

  test('PUT updates employee (200)', async () => {
    const res = await request(app).put(`/api/v1/emp/employees/${aliceEmpId}`).set(auth(aliceToken))
      .send({ position: 'Senior Software Engineer', salary: 95000 });
    expect(res.status).toBe(200);
    expect(res.body.employee.position).toBe('Senior Software Engineer');
    expect(res.body.employee.salary).toBe(95000);
  });

  test('PUT with empty body (400)', async () => {
    const res = await request(app).put(`/api/v1/emp/employees/${aliceEmpId}`).set(auth(aliceToken)).send({});
    expect(res.status).toBe(400);
  });

  test('PUT with invalid salary (400)', async () => {
    const res = await request(app).put(`/api/v1/emp/employees/${aliceEmpId}`).set(auth(aliceToken)).send({ salary: 'abc' });
    expect(res.status).toBe(400);
  });

  test('PUT non-existent employee (404)', async () => {
    const res = await request(app).put(`/api/v1/emp/employees/${new mongoose.Types.ObjectId()}`)
      .set(auth(aliceToken)).send({ position: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('Access control / data ownership', () => {
  test('Alice cannot read Bob\'s employee (403)', async () => {
    const res = await request(app).get(`/api/v1/emp/employees/${bobEmpId}`).set(auth(aliceToken));
    expect(res.status).toBe(403);
  });

  test('Alice cannot update Bob\'s employee (403) and data is unchanged', async () => {
    const res = await request(app).put(`/api/v1/emp/employees/${bobEmpId}`).set(auth(aliceToken)).send({ position: 'Hacked' });
    expect(res.status).toBe(403);
    const check = await request(app).get(`/api/v1/emp/employees/${bobEmpId}`).set(auth(bobToken));
    expect(check.body.position).toBe('Software Engineer');
  });

  test('Alice cannot delete Bob\'s employee (403)', async () => {
    const res = await request(app).delete(`/api/v1/emp/employees?eid=${bobEmpId}`).set(auth(aliceToken));
    expect(res.status).toBe(403);
  });

  test('Bob only sees his own employees', async () => {
    const res = await request(app).get('/api/v1/emp/employees').set(auth(bobToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].employee_id).toBe(bobEmpId);
  });
});

describe('DELETE /api/v1/emp/employees?eid=xxx', () => {
  test('missing eid (400)', async () => {
    const res = await request(app).delete('/api/v1/emp/employees').set(auth(aliceToken));
    expect(res.status).toBe(400);
  });

  test('invalid eid (400)', async () => {
    const res = await request(app).delete('/api/v1/emp/employees?eid=abc').set(auth(aliceToken));
    expect(res.status).toBe(400);
  });

  test('deletes own employee (204)', async () => {
    const res = await request(app).delete(`/api/v1/emp/employees?eid=${aliceEmpId}`).set(auth(aliceToken));
    expect(res.status).toBe(204);
  });

  test('deleting again returns 404', async () => {
    const res = await request(app).delete(`/api/v1/emp/employees?eid=${aliceEmpId}`).set(auth(aliceToken));
    expect(res.status).toBe(404);
  });
});
