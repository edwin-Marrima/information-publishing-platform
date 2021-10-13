const request = require('supertest');
const app = require('../src/app');
const en = require('../locales/en/translation.json');
const pt = require('../locales/pt/translation.json');
const User = require('../src/user/User');
const sequilize = require('../src/config/database');
const bcrypt = require('bcrypt');
const SMTPServer = require('smtp-server').SMTPServer;
const config = require('config');
const Token = require('../src/auth/Token');

let lastMail, server;
let simulateSmtpFailure = false;
beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(config.mail.port, 'localhost');
   if(process.env.NODE_ENV === 'test'){
      await sequilize.sync();
   }
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const ActiveUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

const addUser = async (user = { ...ActiveUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};
const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  let agent = request(app).post('/api/1.0./user/password');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send({ email: email });
};
const putPasswordUpdate = (body = {}, options = {}) => {
  let agent = request(app).put('/api/1.0/user/password');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(body);
};

describe('Password Reset Request', () => {
  it('returns 404 when password reset request is set for unknow e-mail', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'pt'}  | ${pt.email_not_inuse}
    ${'en'}  | ${en.email_not_inuse}
  `(
    'returns error body with $message for ubnknow email for password reset when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail.com', { language: language });
      expect(response.body.path).toBe('/api/1.0./user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'pt'}  | ${pt.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400 with validation error response having $message when request doest not have not valid email and language is $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, { language: language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );
  it('returns 200 ok when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'pt'}  | ${pt.password_rest_request_sucess}
    ${'en'}  | ${en.password_rest_request_sucess}
  `(
    'returns sucess response bbody with $message for kkow email for password reset request when language is set as $language',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language: language });
      expect(response.body.message).toBe(message);
    }
  );
  it('creates passwordResetToken when password reset request is sent with know user', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { id: user.id } });
    expect(userInDB.passwordResetToken).toBeTruthy();
  });
  it('sends password reset email with passwodResetToken', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { id: user.id } });
    const passwodResetToken = userInDB.passwordResetToken;
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(passwodResetToken);
  });
  it('returns 502 Bad geteway when sending emial fails', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(502);
  });

  it.each`
    language | message
    ${'pt'}  | ${pt.email_failure}
    ${'en'}  | ${en.email_failure}
  `('returns $message when language is set as $language after email failure', async ({ language, message }) => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email, { language: language });
    expect(response.body.message).toBe(message);
  });
});
describe('Password update', () => {
  it('returns 403 when password update tequest does not have the valid password reset token', async () => {
    const response = await putPasswordUpdate({
      password: 'P4ssword',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'pt'}  | ${pt.unauthroized_password_reset}
    ${'en'}  | ${en.unauthroized_password_reset}
  `(
    'returns error body with $message when language is set to $language after trying to update with invalid token',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putPasswordUpdate(
        {
          password: 'P4ssword',
          passwordResetToken: 'abcd',
        },
        { language: language }
      );
      expect(response.body.path).toBe('/api/1.0/user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
  it('return 403 when password update request with invalid password pattern and reset token is invalid', async () => {
    const response = await putPasswordUpdate({
      password: 'lid',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });
  it('returns 400 when trying to update with invalid password and reset tpken is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const response = await putPasswordUpdate({
      password: 'id',
      passwordResetToken: user.passwordResetToken,
    });
    expect(response.status).toBe(400);
  });

  it.each`
    language | value      | message
    ${'en'}  | ${null}    | ${en.password_null}
    ${'en'}  | ${'p4ssw'} | ${en.password_size}
    ${'pt'}  | ${null}    | ${pt.password_null}
    ${'pt'}  | ${'p4ssw'} | ${pt.password_size}
  `(
    'returns password validation error $message when language is set to $language and the value is $value',
    async ({ language, message, value }) => {
      const user = await addUser();
      user.passwordResetToken = 'test-token';
      await user.save();
      const response = await putPasswordUpdate(
        {
          password: value,
          passwordResetToken: user.passwordResetToken,
        },
        { language: language }
      );
      expect(response.body.validationErrors.password).toBe(message);
    }
  );

  it('returns 200 ok when valid password and valid password reset token are sent ', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const response = await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    expect(response.status).toBe(200);
  });

  it('update the password in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
    expect(userInDB.password).not.toEqual(user.password);
  });
  it('clear the reset token in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
    expect(userInDB.passwordResetToken).toBeFalsy();
  });
  it('activates and clear activation if the account is inactive after valid password reset', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    user.activationToken = 'activation-token';
    user.inactive = true;
    await user.save();
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
    expect(userInDB.activationToken).toBeFalsy();
    expect(userInDB.inactive).toBe(false);
  });
  it('clears all token of user after valid passowrd reset', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    await Token.create({
      token: 'token-1',
      userId: user.id,
      lastUsedAt: Date.now(),
    });
    await putPasswordUpdate({
      password: 'N3w-password',
      passwordResetToken: user.passwordResetToken,
    });
    const tokens = await Token.findAll({ where: { userId: user.id } });
    expect(tokens.length).toBe(0);  
});
});
