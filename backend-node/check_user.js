const { Sequelize } = require('sequelize');

async function checkUser() {
    const sequelize = new Sequelize('merq', 'postgres', 'postgres', {
        host: 'localhost',
        dialect: 'postgres',
        logging: false
    });

    try {
        await sequelize.authenticate();
        // Assume users table exists (Sequelize pluralizes by default to 'Users')
        // Or I can use raw query.
        const [results] = await sequelize.query("SELECT * FROM \"Users\" WHERE username = 'Aagam789';");
        if (results.length > 0) {
            console.log('User found:', results[0].username, results[0].email);
        } else {
            console.log('User Aagam789 NOT found.');
        }
    } catch (error) {
        console.error('Error checking user:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkUser();
