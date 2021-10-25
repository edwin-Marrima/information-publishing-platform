# ***Information Publishing Platform***


This project followed the test-driven development model
- [X] WRITE A TEST FOR EXPECTED BEHAVIOR
- [X] WRITE THE CODE FOR THE TEST TO PASS
- [X] CLEANUP THE CODE (*REFACTOR*)
- [X] :ok_hand:

this is a **RESTfull API** that meets all the necessary requirements. Being that it allows user authentication (using JWT and basic auth) listing, update, delete, user activation token, etc...
## Instalation
***Use the javascript package manager npm***
```bash
npm install
```
## BASIC DETAILS
"" | -
---|---|
Database ORM| Sequelize
BACKEND TECH| Nodejs (Express)
WEBSERVICE (*API*)|REST
UNIT TEST| JEST
LANGUAGE| Portuguese and English
STRING VALIDATOR|express-validator package

## BASIC ENDPOINTS
ENDPOINT | METHOD | -
---|---|---|
/api/1.0/users| post|Create user
/api/1.0/users/token/:token| post | account activation
/api/1.0/users| get| pagination
/api/1.0/users/:id|get| retrieve specific user
/api/1.0/users/:id|put|update user
/api/1.0/user/password|put|update password
/api/1.0/user/password|put|update password
/api/1.0./user/password|put|generate password reset token
/api/1.0/users/:id|delete|delete user
/api/1.0/auth|post|User authentication
/api/1.0/logout|post|user logout

## API RESPONSE
 In case of an unsuccessful request the error message is shown below
```json
{
    "path": "/api/1.0/auth",
    "timestamp": 1629934665181,
    "message": "Incorret credentials"
}
```
```json
{
    "path": "/api/1.0/users/token/sasasadfytht",
    "timestamp": 1629935113373,
    "message": "This account is either active or the token is invalid"
}
```
 User listing sucessful response
```json
{
    "content": [
        {
            "id": 1,
            "username": "user1",
            "email": "user1@mail.com"
        },
        {
            "id": 2,
            "username": "user2",
            "email": "user2@mail.com"
        }
    ],
    "page": 0,
    "size": 2,
    "totalPages": 13
}
```

 When the language is declared as ***pt*** in https protocol header, the response is:
```json
{
    "path": "/api/1.0/auth",
    "timestamp": 1629934725108,
    "message": "Credenciais incorrtas"
}
```
```json
{
    "path": "/api/1.0/users/token/sasasadfytht",
    "timestamp": 1629935069934,
    "message": "Essa conta esta activa ou o token eh invalido"
}
```
[API error response](https://drive.google.com/file/d/1dQxiOdtXRcR9_y5feJQBmE33v1CHXlrc/view?usp=sharing)
### Example: ***/api/1.0/users***
where:
- 1.0  - is the api version


###LICENSE


[Edwin Fernando Marrima](https://mz.linkedin.com/in/edwin-marrima-18046019b/)
