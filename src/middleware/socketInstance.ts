import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

interface UserSocketMap {
  [userId: string]: string;
}

let io: SocketIOServer | null = null;
const userSocketMap: UserSocketMap = {};

const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer);

  io.on('connection', (socket: Socket) => {
    console.log('A user connected');

    socket.on('register', (userId: string) => {
      userSocketMap[userId] = socket.id;
      console.log(`User ${userId} connected with socket ID ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
      for (const [userId, id] of Object.entries(userSocketMap)) {
        if (id === socket.id) {
          delete userSocketMap[userId];
          break;
        }
      }
    });
  });

  return io;
};

const getSocketInstance = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

export { initializeSocket, getSocketInstance, userSocketMap };
