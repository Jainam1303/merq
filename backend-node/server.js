const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { initSocket } = require('./src/services/socketService');
const http = require('http');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
