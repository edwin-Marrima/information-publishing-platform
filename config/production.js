module.exports = {
  "database": {
       "database": "hoaxify",
       "username":"my-db-user",
       "password": "db-p4ss",
       "dialect": "sqlite",
       "storage": "./prod-db.sqlite",
       "logging" : false
  },
   "mail": {
      service: 'gmail',
      host: 'smtp.gmail.com',
      auth: {
        user: 'moz100lixo@gmail.com',
        pass: 'Ed840233'
      }
  },
  uploadDir:'uploads-production',
  profileDir:'profile'
}
