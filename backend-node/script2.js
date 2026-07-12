const { User } = require('./src/models'); User.findAll().then(users => { users.forEach(u => console.log(u.email, 'TOKEN: ', u.angel_access_token)); process.exit(0); });
