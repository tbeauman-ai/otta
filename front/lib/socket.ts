import { io } from "socket.io-client"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://transcendence42-production.up.railway.app';

export const socket = io(BACKEND_URL, {
    transports: ["polling", "websocket"],
});