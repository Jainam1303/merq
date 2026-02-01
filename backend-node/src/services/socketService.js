const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Allow all for dev; restrict in prod
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('Frontend Client Connected:', socket.id);

        // User joins a room based on their User ID for private updates
        socket.on('join_room', (userId) => {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room ${userId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client Disconnected:', socket.id);
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
