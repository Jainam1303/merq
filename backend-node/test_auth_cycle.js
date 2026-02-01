const axios = require('axios');

async function testAuthCycle() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post('http://localhost:3001/login', {
            username: 'JTest1',
            password: 'testtest'
        });

        const cookie = loginRes.headers['set-cookie'];
        console.log("Login Success! Cookie received:", cookie ? cookie[0].substring(0, 50) + "..." : "NONE");

        if (!cookie) {
            console.error("FAIL: No cookie returned from login");
            return;
        }

        console.log("\n2. Checking Auth with cookie...");
        const authRes = await axios.get('http://localhost:3001/check_auth', {
            headers: { 'Cookie': cookie[0] }
        });

        console.log("Auth Check Response:", JSON.stringify(authRes.data, null, 2));

        if (authRes.data.authenticated) {
            console.log("\nSUCCESS: User is authenticated via cookie!");
        } else {
            console.log("\nFAIL: User is NOT authenticated via cookie");
        }

    } catch (error) {
        console.error("Error during test:", error.response ? error.response.data : error.message);
    }
}

testAuthCycle();
