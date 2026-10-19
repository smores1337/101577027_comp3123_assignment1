// Separate file so the auth limiter can be configured with a tiny limit
process.env.AUTH_RATE_LIMIT_MAX = '3';
const request = require('supertest');
const { startDB, stopDB } = require('./setup');
const app = require('../src/app');

beforeAll(startDB);
afterAll(stopDB);

test('login is rate limited and returns 429', async () => {
  const body = { username: 'nobody', password: 'WrongPass1' };
  const statuses = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    statuses.push((await request(app).post('/api/v1/user/login').send(body)).status);
  }
  expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
  expect(statuses[3]).toBe(429);
  expect(statuses[4]).toBe(429);
});
