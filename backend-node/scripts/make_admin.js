const { sequelize, User } = require('../src/models');

const username = process.argv[2];

if (!username) {
    console.error('Usage: node scripts/make_admin.js <username>');
    process.exit(1);
}

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const user = await User.findOne({ where: { username } });
        if (!user) {
            console.error(`User '${username}' not found.`);
            process.exit(1);
        }

        user.is_admin = true;
        await user.save();

        console.log(`User '${username}' is now an admin.`);
        process.exit(0);
    } catch (error) {
        console.error('Error promoting user:', error);
        process.exit(1);
    }
})();
