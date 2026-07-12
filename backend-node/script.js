const { User } = require('./src/models'); User.findOne().then(u => { console.log('TOKEN: ', u.angel_access_token); process.exit(0); });
