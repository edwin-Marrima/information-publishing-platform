
#information-publishing-platform

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
##BASIC DETAILS
USED TECH | -
---|---|
Database ORM| Sequelize
BACKEND TECH| Nodejs (Express)
API|REST
UNIT TEST| JEST
|
##BASIC ENDPOINTS
USED TECH | METHOD | -
---|---|---|
/api/1.0/users| post|Create user
/api/1.0/users/token/:token| post | account activation
/api/1.0/users| get| pagination
/api/1.0/users/:id|get| retrieve specific user
/api/1.0/users/:id|put|update user
|
####Example: ***/api/1.0/users***
where: 
- 1.0  - is the api version


###LICENSE


[Edwin Fernando Marrima](https://mz.linkedin.com/in/edwin-marrima-18046019b/)
