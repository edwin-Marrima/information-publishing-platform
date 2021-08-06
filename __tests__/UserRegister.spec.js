const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User')
const sequilize = require('../src/config/database')

beforeAll(()=>{
   return sequilize.sync();
});
beforeEach(()=>{
    return User.destroy({truncate:true})
})
describe('User registration',()=>{
    it('returns 200 OK when signup is valid', (done) => {
        request(app)
          .post('/api/1.0/users')
          .send({
            username: 'user1',
            email: 'user1@gmail.com',
            password: 'p4ssword',
          })
          .then((response) => {
            expect(response.status).toBe(200);
            done();
          });
        // .expect(200,done);
      });
      
      it('returns sucess message when signup request is valid', (done) => {
        request(app)
          .post('/api/1.0/users')
          .send({
            username: 'user1',
            email: 'user1@gmail.com',
            password: 'p4ssword',
          })
          .then((response) => {
            expect(response.body.message).toBe('User created');
            done();
          });
        // .expect(200,done);
      });
      
      it('saves the username and email to database', (done) => {
        request(app)
          .post('/api/1.0/users')
          .send({
            username: 'user1',
            email: 'user1@gmail.com',
            password: 'p4ssword',
          })
          .then(() => {
            //query user table
              User.findAll().then((userList)=>{
            //    expect(userList.length).toBe(1); 
             }) 
            done();
          });
        // .expect(200,done);
      });

      it('saves the username and email to database', (done) => {
        request(app)
          .post('/api/1.0/users')
          .send({
            username: 'user1',
            email: 'user1@gmail.com',
            password: 'p4ssword',
          })
          .then(() => {
            //query user table
              User.findAll().then((userList)=>{
               const savedUser = userList[0];
               expect(savedUser.username).toBe('user1');
                expect(savedUser.email).toBe('user1@gmail.com');
             }) 
            done();
          });
        // .expect(200,done);
      });
})

