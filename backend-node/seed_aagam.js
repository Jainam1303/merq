const { User, sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function seedUser() {
    try {
        await sequelize.authenticate();
        console.log('Database Connected.');

        const username = 'Aagam789';
        const rawPass = 'aagam@123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPass, salt);

        const [user, created] = await User.findOrCreate({
            where: { username },
            defaults: {
                password: hashedPassword,
                email: 'aagam@example.com',
                role: 'user',
                phone: '1234567890'
            }
        });

        if (created) {
            console.log(`User ${username} created.`);
        } else {
            // Update password just in case
            user.password = hashedPassword;
            await user.save();
            console.log(`User ${username} updated with new password.`);
        }

    } catch (error) {
        console.error('Seed User Error:', error);
    } finally {
        await sequelize.close();
    }
}

seedUser();
