const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequilize = require('../src/config/database');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const pt = require('../locales/pt/translation.json');
const Token = require('../src/auth/Token');

beforeAll(async () => {
   if(process.env.NODE_ENV === 'test'){
  await sequilize.sync();
  }
});
beforeEach(async() => {
  await User.destroy({ truncate: {cascade:true} });
});

const ActiveUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

const addUser = async (user = { ...ActiveUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};
const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};
const deleteUser = async (id = 5, options = {}) => {
  let agent = request(app).delete(`/api/1.0/users/${id}`);
  if (options.language) {
    agent.set('accept-language', options.language);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('User Delete', () => {
  it('returns forbidden when request send unauthorized', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'pt'}  | ${pt.unauthroized_user_delete}
    ${'en'}  | ${en.unauthroized_user_delete}
  `(
    'returns error body with $message for unauthroized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteUser(5, { language: language });
      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden when  update request is send with correct credential but for diferent user', async () => {
    await addUser();
    const userToBeDelete = await addUser({ ...ActiveUser, username: 'user2', email: 'user2@mail.com' });
    const token = await auth({ auth: { email: 'user1@mail,com', password: 'P4ssword' } });
    const response = await deleteUser(userToBeDelete.id, { token: token });
    expect(response.status).toBe(403);
  });
  it('returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: '123' });
    expect(response.status).toBe(403);
  });
  it('returns 200 ok when delete request send form authorized user', async () => {
    const saveUser = await addUser();
    const token = await auth({ auth: { email: saveUser.email, password: 'P4ssword' } });
    const response = await deleteUser(saveUser.id, { token: token });
    expect(response.status).toBe(200);
  });
  it('delete user from databse when  request sent from aauthorized user', async () => {
    const saveUser = await addUser();
    const token = await auth({ auth: { email: saveUser.email, password: 'P4ssword' } });
    await deleteUser(saveUser.id, { token: token });
    const indDBUser = await User.findOne({ where: { id: saveUser.id } });
    expect(indDBUser).toBeNull();
  });
  it('delete token from database when delete request sent from authorizad user', async () => {
    const saveUser = await addUser();
    const token = await auth({ auth: { email: saveUser.email, password: 'P4ssword' } });
    await deleteUser(saveUser.id, { token: token });

    const tokenInDB = await Token.findOne({ where: {token: token } });
    expect(tokenInDB).toBeNull();
  });

  it('delete all tokens from database when delete request sent from authorizad user', async () => {
    const saveUser = await addUser();
    const token1 = await auth({ auth: { email: saveUser.email, password: 'P4ssword' } });
    const token2 = await auth({ auth: { email: saveUser.email, password: 'P4ssword' } });
    await deleteUser(saveUser.id, { token: token1 });
    const tokenInDB = await Token.findOne({ where: {token: token2 } });
    expect(tokenInDB).toBeNull();
  });
});
 