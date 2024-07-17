import { Server as SocketIOServer } from 'socket.io';
import { getSocketInstance, userSocketMap } from './socketInstance';

const notifyUser = (userId: string, message: string) => {
    const io = getSocketInstance();
    const socketId = userSocketMap[userId];
    if (socketId) {
      io.to(socketId).emit('notification', { message });
    } else {
      console.log(`User ${userId} is not connected`);
    }
  };
  
  export { notifyUser };