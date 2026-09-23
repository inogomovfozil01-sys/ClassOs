const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory active sockets map: userId -> Set of socket IDs
const onlineUsers = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(server, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Attach io to global so API routes can emit events if needed
  global.io = io;

  io.on('connection', (socket) => {
    let currentUserId = null;

    // User authentication / presence
    socket.on('auth', (userId) => {
      if (!userId) return;
      currentUserId = userId;
      socket.join(`user:${userId}`);

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      // Broadcast user online status
      io.emit('user:presence', { userId, isOnline: true });
    });

    // Join conversation room
    socket.on('conversation:join', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conv:${conversationId}`);
    });

    // Leave conversation room
    socket.on('conversation:leave', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
    });

    // Realtime message dispatch
    socket.on('message:send', (payload) => {
      if (!payload || !payload.conversationId) return;
      io.to(`conv:${payload.conversationId}`).emit('message:received', payload);
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId, user }) => {
      socket.to(`conv:${conversationId}`).emit('typing:status', { conversationId, user, isTyping: true });
    });

    socket.on('typing:stop', ({ conversationId, user }) => {
      socket.to(`conv:${conversationId}`).emit('typing:status', { conversationId, user, isTyping: false });
    });

    // Message read receipts
    socket.on('message:read', ({ conversationId, messageId, userId }) => {
      io.to(`conv:${conversationId}`).emit('message:read_update', { conversationId, messageId, userId });
    });

    // Message reactions
    socket.on('reaction:toggle', (data) => {
      io.to(`conv:${data.conversationId}`).emit('reaction:updated', data);
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);
          io.emit('user:presence', { userId: currentUserId, isOnline: false });
        }
      }
    });
  });

  // Persisted reminders survive restarts; each student's next date prevents duplicates.
  const reminderDb = new (require('@prisma/client').PrismaClient)();
  const { runReminders } = require('./lib/emaktab-store.cjs');
  let remindersRunning = false;
  const remind = async () => { if(remindersRunning)return; remindersRunning=true;try{await runReminders(reminderDb)}catch(error){console.error('Access reminders failed:',error.message)}finally{remindersRunning=false} };
  void remind();
  setInterval(remind, 60 * 1000).unref();
  server.listen(port, () => {
    console.log(`> ClassOS ready on http://localhost:${port}`);
  });
});
