const axios = require('axios');

async function testAuth() {
    try {
        console.log('Testing Registration with Username Only...');
        const regRes = await axios.post('http://localhost:3001/register', {
            username: 'user_only_' + Date.now(),
            password: 'password123'
        });
        console.log('Registration Response:', regRes.data);

        console.log('Testing Login with Username Only...');
        const usernameToLogin = JSON.parse(regRes.config.data).username; // Get what we sent
        console.log('Logging in as:', usernameToLogin);

        const loginRes = await axios.post('http://localhost:3001/login', {
            username: usernameToLogin,
            password: 'password123'
        });
        console.log('Login Response:', loginRes.data);
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

testAuth();
