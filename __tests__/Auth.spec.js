const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequilize = require('../src/config/database');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const pt = require('../locales/pt/translation.json');


beforeAll(async () => {
  await sequilize.sync();
});
beforeEach(() => {
  return User.destroy({ truncate: true });
});

const ActiveUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

const addUser = async (user = { ...ActiveUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};
const postAuthentication = async (credentials, options = {}) => {
  let agent = request(app).post('/api/1.0/auth');
  if (options.language) {
    agent.set('accept-language', options.language);
  }
  return await agent.send(credentials);
};
describe('User Authentication', () => {
  it('return 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(200);
  });
  it('return only id and username when login sucess', async () => {
    const user = await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
  });
  it('return 401 when user does not exists', async () => {
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(401);
  });

  it('returns proper error body when authentication fails', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
  it.each`
    language | message
    ${'pt'}  | ${pt.authentication_failure}
    ${'en'}  | ${en.authentication_failure}
  `('returns $message when authentication fails and language is set as $language', async ({ language, message }) => {
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' }, { language });
    expect(response.body.message).toBe(message);
  });

  it('return 401 when password is wrong', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'Paa4ssword' });
    expect(response.status).toBe(401);
  });
  it('returns 403 when logging in with an inactive account', async () => {
    await addUser({ ...ActiveUser, inactive: true });
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(403);
  });
  it('returns proper error body when inactive authentication fails', async () => {
    await addUser({ ...ActiveUser, inactive: true });
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'pt'}  | ${pt.inactive_authentication_failure}
    ${'en'}  | ${en.inactive_authentication_failure}
  `(
    'returns $message when authentication fails for inactive account and language is set as $language',
    async ({ language, message }) => {
      await addUser({ ...ActiveUser, inactive: true });
      const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' }, { language });
      expect(response.body.message).toBe(message);
    }
  );
  it('returns 401 when email is not valid', async () => {
    const response = await postAuthentication({ password: 'P4ssword' });
    expect(response.status).toBe(401);
  });
  it('returns 401 when PASSWORD is not valid', async () => {
    const response = await postAuthentication({  email: 'user1@mail.com' });
    expect(response.status).toBe(401);
  });
});
