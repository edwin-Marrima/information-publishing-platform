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
const putUser = (id = 5, body = null, options = {}) => {
  const agent = request(app).put(`/api/1.0/users/${id}`);
  if (options.language) {
    agent.set('accept-language', options.language);
  }
  if (options.auth) {
    const { email, password } = options.auth;
    agent.auth(email, password);
    // const merged = `${email}:${password}`;
    // const base64 = Buffer.from(merged).toString('base64');
    // agent.set('Authorization', `Basic ${base64}`);
  }
  return agent.send(body);
};

describe('User update', () => {
  it('returns forbidden when request send without basic authorization', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'pt'}  | ${pt.unauthroized_user_update}
    ${'en'}  | ${en.unauthroized_user_update}
  `(
    'returns error body with $message for unauthroized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putUser(5, null, { language: language });
      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden when request send with incorrect email in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: 'user3438@mail,com', password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });
  it('returns forbidden when request send with incorrect password in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, { auth: { email: 'user1@mail,com', password: 'P4assword' } });
    expect(response.status).toBe(403);
  });
  it('returns forbidden when  update request is send with correct credential but for diferent user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({ ...ActiveUser, username: 'user2', email: 'user2@mail.com' });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: 'user1@mail,com', password: 'P4ssword' },
    });
    expect(response.status).toBe(403);
  });
  it('returns forbidden when when update request is send by inactive user with correct credentials for ists own user', async () => {
    const inactiveUser = await addUser({ ...ActiveUser, inactive: true });
    const response = await putUser(inactiveUser.id, null, { auth: { email: 'user1@mail,com', password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when valid update request sebd form authorized user', async () => {
    const saveUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });
    expect(response.status).toBe(200);
  });
  it('update username in databse when  valid update request send form authorized user', async () => {
    const saveUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });
    const indDBUser = await User.findOne({ where: { id: saveUser.id } });
    expect(indDBUser.username).toBe(validUpdate.username);
  });
});
