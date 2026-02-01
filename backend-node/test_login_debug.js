const axios = require('axios');

async function testSpecificUser() {
    const USER = 'JTest1'; // Matches the screenshot case
    const PASS = 'testtest';

    try {
        console.log(`1. Registering ${USER}...`);
        try {
            const regRes = await axios.post('http://localhost:3001/register', {
                username: USER,
                password: PASS
            });
            console.log('   Registration Success:', regRes.data);
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('   User already exists (Expected if run multiple times).');
            } else {
                throw e;
            }
        }

        console.log(`2. Logging in as ${USER}...`);
        const loginRes = await axios.post('http://localhost:3001/login', {
            username: USER,
            password: PASS
        });
        console.log('   Login Success:', loginRes.data);

    } catch (err) {
        console.error('   FAILURE:', err.response ? err.response.data : err.message);
    }
}

testSpecificUser();
