const { User } = require('./src/models'); User.findAll().then(users => { users.forEach(u => console.log('ID:', u.id, 'Email:', u.email, 'TOKEN: ', u.angel_access_token)); process.exit(0); });
