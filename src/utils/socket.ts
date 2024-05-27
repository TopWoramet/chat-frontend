import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "";
const token =
  typeof window !== "undefined" ? localStorage.getItem("token") : "";

const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token,
  },
});

export default socket;
