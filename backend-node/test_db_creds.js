const { Sequelize } = require('sequelize');

async function testConn(pass) {
    const sequelize = new Sequelize('merq', 'postgres', pass, {
        host: 'localhost',
        dialect: 'postgres',
        logging: false
    });
    try {
        await sequelize.authenticate();
        console.log(`SUCCESS: Password '${pass}' works!`);
        return true;
    } catch (error) {
        console.log(`FAILED: Password '${pass}' - ${error.message}`);
        return false;
    } finally {
        await sequelize.close();
    }
}

(async () => {
    console.log("Testing credentials...");
    await testConn('postgres');
    await testConn('admin');
    await testConn('root');
    await testConn('');
})();
