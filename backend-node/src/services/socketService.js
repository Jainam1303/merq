const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'https://merq.vercel.app',
                'https://merqprime.in',
                'https://www.merqprime.in',
                process.env.FRONTEND_URL
            ].filter(Boolean),
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
        pingTimeout: 30000,
        pingInterval: 25000,
        upgradeTimeout: 20000,
        allowUpgrades: true
    });

    io.on('connection', (socket) => {
        console.log('Frontend Client Connected:', socket.id);

        // User joins a room based on their User ID for private updates
        socket.on('join_room', (userId) => {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room ${userId}`);
        });

        socket.on('error', (error) => {
            console.log('Socket error:', error);
        });

        socket.on('disconnect', (reason) => {
            console.log('Client Disconnected:', socket.id, 'Reason:', reason);
        });
    });
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Helper to broadcast event to specific user
const sendUserUpdate = (userId, eventName, data) => {
    try {
        const ioInstance = getIo();
        ioInstance.to(userId).emit(eventName, data);
        console.log(`Event [${eventName}] sent to User [${userId}]`);
    } catch (error) {
        console.error('Socket Send Error:', error.message);
    }
};

module.exports = { initSocket, getIo, sendUserUpdate };
