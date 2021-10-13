const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequilize = require('../src/config/database');
const emailService = require('../src/email/EmailService');
const SMTPServer = require('smtp-server').SMTPServer;
const en = require('../locales/en/translation.json');
const pt = require('../locales/pt/translation.json');
const config = require('config')

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
  await User.destroy({ truncate: {cascade:true} });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const validUser = {
  username: 'user1',
  email: 'user1@gmail.com',
  password: 'p4ssword',
};
const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('accept-language', options.language);
  }
  return agent.send(user);
};
describe('User registration', () => {
  it('returns 200 OK when signup is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns sucess message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_create_sucess);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    //expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    // expect(savedUser.username).toBe('user1');
    // expect(savedUser.email).toBe('user1@gmail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('p4ssword');
  });
  it('returns 400 when username is null', async () => {
    const result = await postUser({
      username: null,
      email: 'user1@gmail.com',
      password: 'p4ssword',
    });
    expect(result.status).toBe(400);
  });
  it('returns validation Erro field in response body when validation error occcurs', async () => {
    const result = await postUser({
      username: null,
      email: 'user1@gmail.com',
      password: 'p4ssword',
    });
    const body = result.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('returns error for both when username and email are null', async () => {
    const result = await postUser({
      username: null,
      email: null,
      password: 'p4ssword',
    });
    const body = result.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  // let name_null = 'Username cannot be null';
  // let name_size = 'Must have min 4 and max 32 characters';
  // let email_null = 'Email cannot be null';
  // let email_invalid = 'Email is not valid';
  // let password_null = 'Password cannot be null';
  // let password_size = 'Password must be at least 6 characters';
  // let email_inuse = 'Email in use';
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${en.name_null}
    ${'username'} | ${'u'.repeat(2)}   | ${en.name_size}
    ${'email'}    | ${null}            | ${en.email_null}
    ${'email'}    | ${'mail.com'}      | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${en.email_invalid}
    ${'password'} | ${null}            | ${en.password_null}
    ${'password'} | ${'p4ssw'}         | ${en.password_size}
  `('returns $expectedMessage when field $field is $value', async ({ field, expectedMessage, value }) => {
    const user = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'p4ssword',
    };
    user[field] = value;
    const result = await postUser(user);
    const body = result.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it(`returns ${en.email_inuse} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser });
    expect(response.body.validationErrors.email).toBe(en.email_inuse);
  });

  it('return error for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: 'user1@gmail.com',
      password: 'P4ssword',
    });
    const body = response.body;

    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user im inactiva mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates user im inactiva mode ewven the request body contains inactive as false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates an activation token for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends Account activation email with activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@gmail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('return 502 Bad gateaway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it('return Email failure message when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(en.email_failure);
  });

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });
  it('its return validation Failure message in error response body when validation fails', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@gmail.com',
      password: 'P4ssword',
    });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${pt.name_null}
    ${'username'} | ${'u'.repeat(2)}   | ${pt.name_size}
    ${'email'}    | ${null}            | ${pt.email_null}
    ${'email'}    | ${'mail.com'}      | ${pt.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${pt.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${pt.email_invalid}
    ${'password'} | ${null}            | ${pt.password_null}
    ${'password'} | ${'p4ssw'}         | ${pt.password_size}
  `(
    'returns $expectedMessage when field $field is $value when language is portuguese',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'p4ssword',
      };
      user[field] = value;
      const result = await postUser(user, { language: 'pt' });
      const body = result.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${pt.email_inuse} when same email is already in use when language is portuguese`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'pt' });
    expect(response.body.validationErrors.email).toBe(pt.email_inuse);
  });

  it(`returns sucess message of ${pt.user_create_sucess} when signup request is valid and language is set as portuguese`, async () => {
    const response = await postUser({ ...validUser }, { language: 'pt' });
    expect(response.body.message).toBe(pt.user_create_sucess);
  });

  it(`return ${pt.email_failure} message when sending email fails when language is set as portugues`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'pt' });
    expect(response.body.message).toBe(pt.email_failure);
  });
  it(`its return ${pt.validation_failure} message in error response body when validation fails`, async () => {
    const response = await postUser(
      {
        username: null,
        email: 'user1@gmail.com',
        password: 'P4ssword',
      },
      { language: 'pt' }
    );
    expect(response.body.message).toBe(pt.validation_failure);
  });
});

describe('Account activation', function () {
  it('activates the account when corret token is sent ', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table after sucessful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });
  it('doest active de account when token is wrong', async () => {
    await postUser();
    const token = 'falsetoken';

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });
  it('its returns  bad request when token is wrong', async () => {
    await postUser();
    const token = 'falsetoken';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'pt'}  | ${'wrong'}   | ${pt.account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'pt'}  | ${'correct'} | ${pt.account_activation_success}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
  `(
    `return $message when wrong toekn is $tokenStatus and language is $language`,
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'falsetoken';
      if (tokenStatus === 'correct') {
        users = await User.findAll();
        token = users[0].activationToken;
      }
      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .set('accept-language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns path, timestamp, message and validationError in Response when validation failure', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it('returns path, timestamp and message in response when request fails other than validation Error', async () => {
    const token = 'falsetoken';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns path in error body', async () => {
    const token = 'falsetoken';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.body.path).toEqual('/api/1.0/users/token/' + token);
  });

  it('returns timestam in milliseconds within 5 seconds value in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveScondsLater = nowInMillis + 5 * 1000;
    const token = 'falsetoken';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
    expect(response.body.timestamp).toBeLessThan(fiveScondsLater);
  });
});
