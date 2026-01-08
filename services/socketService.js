// eslint-disable-next-line import/no-extraneous-dependencies
const { Server } = require('socket.io');

let io = null;
const userSockets = new Map(); // Map<userId, Set<socketId>>
const socketToUser = new Map(); // Map<socketId, userId> - for faster cleanup
const socketRooms = new Map(); // Map<socketId, Set<roomName>> - track rooms per socket
const AUTH_TIMEOUT = 30000; // 30 seconds to authenticate

/**
 * Initialize Socket.IO server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: [ 'GET', 'POST' ],
      credentials: true,
    },
    transports: [ 'websocket', 'polling' ],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    let authTimeout = null;
    let isAuthenticated = false;

    // Set authentication timeout
    authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log(`Socket ${socket.id} disconnected due to authentication timeout`);
        socket.emit('error', { message: 'Authentication timeout' });
        socket.disconnect(true);
      }
    }, AUTH_TIMEOUT);

    // Handle user authentication and room joining
    socket.on('authenticate', (data) => {
      try {
        const {
          userId, userType, vendorId, branchId,
        } = data;

        if (!userId) {
          socket.emit('error', { message: 'User ID is required' });

          return;
        }

        // Clear authentication timeout
        if (authTimeout) {
          clearTimeout(authTimeout);
          authTimeout = null;
        }

        isAuthenticated = true;

        // Store socket connection for user
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        // Store reverse mapping for faster cleanup
        socketToUser.set(socket.id, userId);

        // Track rooms for this socket
        const rooms = new Set();

        socketRooms.set(socket.id, rooms);

        // Join user-specific room
        socket.join(`user:${userId}`);
        rooms.add(`user:${userId}`);

        // Join vendor room if vendorId provided
        if (vendorId) {
          socket.join(`vendor:${vendorId}`);
          rooms.add(`vendor:${vendorId}`);
        }

        // Join branch room if branchId provided
        if (branchId) {
          socket.join(`branch:${branchId}`);
          rooms.add(`branch:${branchId}`);
        }

        // Join recipient type room
        if (userType) {
          socket.join(`type:${userType}`);
          rooms.add(`type:${userType}`);
        }

        socket.emit('authenticated', {
          message: 'Successfully authenticated',
          userId,
          socketId: socket.id,
        });

        console.log(`User ${userId} authenticated on socket ${socket.id}`);
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);

      // Clear authentication timeout if still pending
      if (authTimeout) {
        clearTimeout(authTimeout);
      }

      // Clean up using reverse mapping (faster)
      const userId = socketToUser.get(socket.id);

      if (userId) {
        // Remove socket from userSockets map
        const socketSet = userSockets.get(userId);

        if (socketSet) {
          socketSet.delete(socket.id);
          if (socketSet.size === 0) {
            userSockets.delete(userId);
          }
        }

        // Remove reverse mapping
        socketToUser.delete(socket.id);
      }

      // Clean up room tracking
      socketRooms.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('Socket.IO server initialized');

  return io;
};

/**
 * Cleanup all socket connections (for graceful shutdown)
 */
const cleanup = () => {
  if (io) {
    console.log('Closing all Socket.IO connections...');
    io.close(() => {
      console.log('Socket.IO server closed');
    });

    // Clear all maps
    userSockets.clear();
    socketToUser.clear();
    socketRooms.clear();
  }
};

/**
 * Get Socket.IO instance
 * @returns {Server|null} Socket.IO server instance
 */
const getIO = () => io;

/**
 * Emit notification to specific user
 * @param {number} userId - User ID
 * @param {Object} notification - Notification data
 */
const emitToUser = (userId, notification) => {
  if (!io) {
    console.warn('Socket.IO not initialized');

    return;
  }

  io.to(`user:${userId}`).emit('notification', notification);
  console.log(`Notification sent to user ${userId}`);
};

/**
 * Emit notification to all users in a vendor
 * @param {number} vendorId - Vendor ID
 * @param {Object} notification - Notification data
 */
const emitToVendor = (vendorId, notification) => {
  if (!io) {
    console.warn('Socket.IO not initialized');

    return;
  }

  io.to(`vendor:${vendorId}`).emit('notification', notification);
  console.log(`Notification sent to vendor ${vendorId}`);
};

/**
 * Emit notification to all users in a branch
 * @param {number} branchId - Branch ID
 * @param {Object} notification - Notification data
 */
const emitToBranch = (branchId, notification) => {
  if (!io) {
    console.warn('Socket.IO not initialized');

    return;
  }

  io.to(`branch:${branchId}`).emit('notification', notification);
  console.log(`Notification sent to branch ${branchId}`);
};

/**
 * Emit notification to all users of a specific type
 * @param {string} recipientType - Recipient type (USER, VENDOR, ADMIN, etc.)
 * @param {Object} notification - Notification data
 */
const emitToRecipientType = (recipientType, notification) => {
  if (!io) {
    console.warn('Socket.IO not initialized');

    return;
  }

  io.to(`type:${recipientType}`).emit('notification', notification);
  console.log(`Notification sent to type ${recipientType}`);
};

/**
 * Emit notification to all connected clients
 * @param {Object} notification - Notification data
 */
const emitToAll = (notification) => {
  if (!io) {
    console.warn('Socket.IO not initialized');

    return;
  }

  io.emit('notification', notification);
  console.log('Notification sent to all clients');
};

/**
 * Get count of connected users
 * @returns {number} Number of connected users
 */
const getConnectedUsersCount = () => userSockets.size;

/**
 * Get count of active sockets
 * @returns {number} Number of active sockets
 */
const getActiveSocketsCount = () => socketToUser.size;

/**
 * Disconnect all sockets for a specific user
 * @param {number} userId - User ID
 * @returns {Object} Disconnect result
 */
const disconnectUser = (userId) => {
  if (!io) {
    console.warn('Socket.IO not initialized');

    return { success: false, message: 'Socket.IO not initialized' };
  }

  const socketSet = userSockets.get(userId);

  if (!socketSet || socketSet.size === 0) {
    return { success: true, message: 'No active sockets found for user', disconnectedCount: 0 };
  }

  let disconnectedCount = 0;
  const socketIds = Array.from(socketSet);

  // Disconnect each socket
  socketIds.forEach((socketId) => {
    const socket = io.sockets.sockets.get(socketId);

    if (socket) {
      socket.emit('logout', { message: 'You have been logged out' });
      socket.disconnect(true);
      disconnectedCount += 1;
    }
  });

  // Clean up maps (disconnect handler will also clean up, but doing it here for safety)
  userSockets.delete(userId);
  socketIds.forEach((socketId) => {
    socketToUser.delete(socketId);
    socketRooms.delete(socketId);
  });

  console.log(`Disconnected ${disconnectedCount} socket(s) for user ${userId}`);

  return { success: true, message: 'User disconnected successfully', disconnectedCount };
};

module.exports = {
  initializeSocket,
  cleanup,
  getIO,
  emitToUser,
  emitToVendor,
  emitToBranch,
  emitToRecipientType,
  emitToAll,
  getConnectedUsersCount,
  getActiveSocketsCount,
  disconnectUser,
};
