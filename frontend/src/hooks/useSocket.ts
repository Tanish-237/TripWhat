import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SocketEvents {
  'agent:thinking': (data: { status: string; conversationId: string }) => void;
  'agent:response': (data: { message: string; conversationId: string }) => void;
  'agent:error': (data: { error: string }) => void;
}

export function useSocket(conversationId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection once on mount
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Set up agent event listeners
    socket.on('agent:thinking', (data) => {
      console.log('[SOCKET] Received agent:thinking for conversation:', data.conversationId);
      setAgentStatus(data.status);
    });

    socket.on('agent:response', (data) => {
      console.log('[SOCKET] Received agent:response for conversation:', data.conversationId);
      setAgentStatus(null);
      // Store conversationId with the message for filtering
      setLastMessage(JSON.stringify({ message: data.message, conversationId: data.conversationId }));
    });

    socket.on('agent:error', (data) => {
      console.log('[SOCKET] Received agent:error for conversation:', data.conversationId);
      setAgentStatus(null);
      setLastError(JSON.stringify({ error: data.error, conversationId: data.conversationId }));
    });

    // Cleanup only on unmount
    return () => {
      socket.disconnect();
    };
  }, []); // Empty deps - only run once

  // Handle conversation room joining/leaving separately
  useEffect(() => {
    if (!socketRef.current || !conversationId) return;

    const socket = socketRef.current;
    console.log('📝 [SOCKET] Joining conversation room:', conversationId);
    socket.emit('join:conversation', conversationId);

    // Cleanup: leave room when conversationId changes or unmount
    return () => {
      console.log('👋 [SOCKET] Leaving conversation room:', conversationId);
      socket.emit('leave:conversation', conversationId);
    };
  }, [conversationId]);

  // Reset message/error when they're consumed
  const clearLastMessage = useCallback(() => setLastMessage(null), []);
  const clearLastError = useCallback(() => setLastError(null), []);

  return {
    socket: socketRef.current,
    isConnected,
    agentStatus,
    lastMessage,
    lastError,
    clearLastMessage,
    clearLastError,
  };
}
