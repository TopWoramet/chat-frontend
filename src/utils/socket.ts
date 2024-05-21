import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || ""; // Adjust the URL to your server's URL

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });
  }

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
