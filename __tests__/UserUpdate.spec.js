const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequilize = require('../src/config/database');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const pt = require('../locales/pt/translation.json');
const fs = require('fs');
const path = require('path');
const config = require('config');
const { uploadDir, profileDir } = config;
const profileDirectory = path.join('.', uploadDir, profileDir);

beforeAll(async () => {
   if(process.env.NODE_ENV === 'test'){
  await sequilize.sync();
  }
});
beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const ActiveUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

const addUser = async (user = { ...ActiveUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};
const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  agent = request(app).put(`/api/1.0/users/${id}`);
  if (options.language) {
    agent.set('accept-language', options.language);
  }
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send(body);
};

const readFileAsBase64 = (file = 'test-png.png') => {
  const filePath = path.join('.', '__tests__', 'resources', file);
  return fs.readFileSync(filePath, { encoding: 'base64' });
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

  it('returns 403 when token is not valid', async () => {
    const response = await putUser(5, null, { token: '123' });
    expect(response.status).toBe(403);
  });
  it('saves de user iamge when update contains image as base64', async () => {
    const fileInBase64 = readFileAsBase64();
    const saveUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });

    const indDBUser = await User.findOne({ where: { id: saveUser.id } });
    expect(indDBUser.image).toBeTruthy();
  });
  it('returns sucess body having only id, username, email and image', async () => {
    const fileInBase64 = readFileAsBase64();
    const saveUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });

    expect(Object.keys(response.body)).toEqual(['id', 'username', 'email', 'image']);
  });

  it('sae the user image to upload folder and stores file name in user when update has image', async () => {
    const fileInBase64 = readFileAsBase64();
    const saveUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });

    const indDBUser = await User.findOne({ where: { id: saveUser.id } });
    const profileImagePath = path.join(profileDirectory, indDBUser.image);

    expect(fs.existsSync(profileImagePath)).toBe(true);
  });

  it('removes the old image after user upload new one', async () => {
    const fileInBase64 = readFileAsBase64();
    const saveUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });
    const firstImage = response.body.image;
    await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });

    const profileImagePath = path.join(profileDirectory, firstImage);

    expect(fs.existsSync(profileImagePath)).toBe(false);
  });

  it.each`
    language | value            | message
    ${'en'}  | ${null}          | ${en.name_null}
    ${'en'}  | ${'u'.repeat(2)} | ${en.name_size}
    ${'en'}  | ${'usr'}         | ${en.name_size}
    ${'pt'}  | ${null}          | ${pt.name_null}
    ${'pt'}  | ${'u'.repeat(2)} | ${pt.name_size}
    ${'pt'}  | ${'usr'}         | ${pt.name_size}
  `(
    'returns bad request with $message when user is update with $value when language is set as $language',
    async ({ language, value, message }) => {
      const saveUser = await addUser();
      const invalidUpdate = { username: value };
      const response = await putUser(saveUser.id, invalidUpdate, {
        auth: { email: saveUser.email, password: 'P4ssword' },
        language: language,
      });
      expect(response.status).toBe(400);
      expect(response.body.validationErrors.username).toBe(message);
    }
  );
  it('returns 200 when image size is exactly 2mb', async () => {
    const testPng = readFileAsBase64();
    const pngByte = Buffer.from(testPng, 'base64').length;
    const twoMB = 1024 * 1024 * 2;
    const filling = 'a'.repeat(twoMB - pngByte);
    const fillBase64 = Buffer.from(filling).toString('base64');
    const saveUser = await addUser();
    const validUpdate = { username: 'updated-user', image: testPng + fillBase64 };
    const response = await putUser(saveUser.id, validUpdate, {
      auth: { email: saveUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });
  it('returns 400 when image size exceeds 2mb', async () => {
    const fileExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(fileExceeding2MB).toString('base64');
    const saveUser = await addUser();
    const invalidUpdate = { username: 'updated-user', image: base64 };
    const response = await putUser(saveUser.id, invalidUpdate, {
      auth: { email: saveUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(400);
  });
  it('keeps the old image aafter user only updates username', async () => {
    const fileInBase64 = readFileAsBase64();
    const saveUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(saveUser.id, validUpdate, { auth: { email: saveUser.email, password: 'P4ssword' } });
    const firstImage = response.body.image;
    await putUser(
      saveUser.id,
      { username: 'user1-updated2' },
      { auth: { email: saveUser.email, password: 'P4ssword' } }
    );

    const profileImagePath = path.join(profileDirectory, firstImage);

    expect(fs.existsSync(profileImagePath)).toBe(true);

    const userInDb = await User.findOne({ where: { id: saveUser.id } });
    expect(userInDb.image).toBe(firstImage);
  });
  it.each`
    language | message
    ${'pt'}  | ${pt.profile_image_size}
    ${'en'}  | ${en.profile_image_size}
  `('returns $message when file size exceeds 2mb when language is $language', async ({ language, message }) => {
    const fileExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(fileExceeding2MB).toString('base64');
    const saveUser = await addUser();
    const invalidUpdate = { username: 'updated-user', image: base64 };
    const response = await putUser(saveUser.id, invalidUpdate, {
      auth: { email: saveUser.email, password: 'P4ssword' },
      language: language,
    });
    expect(response.body.validationErrors.image).toBe(message);
  });
  it.each`
    file              | status
    ${'test-gif.gif'} | ${400}
    ${'test-pdf.pdf'} | ${400}
    ${'test-txt.txt'} | ${400}
    ${'test-png.png'} | ${200}
    ${'test-jpg.jpg'} | ${200}
  `('returns $status when uploading $file as image', async ({ file, status }) => {
    const fileInBase64 = readFileAsBase64(file);
    const saveUser = await addUser();
    const updateBody = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(saveUser.id, updateBody, { auth: { email: saveUser.email, password: 'P4ssword' } });
    expect(response.status).toBe(status);
  });
  it.each`
    file              | language | message
    ${'test-gif.gif'} | ${'pt'}  | ${pt.unsupported_image_file}
    ${'test-gif.gif'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'pt'}  | ${pt.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-txt.txt'} | ${'pt'}  | ${pt.unsupported_image_file}
    ${'test-txt.txt'} | ${'en'}  | ${en.unsupported_image_file}
  `('return $message when upload $file as image when language is $language', async ({ file, language, message }) => {
    const fileInBase64 = readFileAsBase64(file);
    const saveUser = await addUser();
    const updateBody = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(saveUser.id, updateBody, {
      auth: { email: saveUser.email, password: 'P4ssword' },
      language: language,
    });
    expect(response.body.validationErrors.image).toBe(message);
  });
});
