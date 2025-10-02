import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { TypingIndicator } from '../components/Chat/TypingIndicator';
import { MessageInput } from '../components/Chat/MessageInput';
import axios from 'axios';
import { Plane, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Chat() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, agentStatus, lastMessage, lastError, clearLastMessage, clearLastError } = 
    useSocket(conversationId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentStatus]);

  // Handle new messages from Socket.io
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        // Process if: (1) no conversationId yet (first message), OR (2) matches our conversationId
        const shouldProcess = !conversationId || data.conversationId === conversationId;
        
        if (shouldProcess) {
          console.log('[CHAT] Adding assistant message to UI');
          
          // Set conversationId if we don't have one yet
          if (!conversationId && data.conversationId) {
            setConversationId(data.conversationId);
          }
          
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: data.message,
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[CHAT] Failed to parse message:', e);
      }
      clearLastMessage();
    }
  }, [lastMessage, conversationId, clearLastMessage]);

  // Handle errors from Socket.io
  useEffect(() => {
    if (lastError) {
      try {
        const data = JSON.parse(lastError);
        // Process if: (1) no conversationId yet (first message), OR (2) matches our conversationId
        const shouldProcess = !conversationId || data.conversationId === conversationId;
        
        if (shouldProcess) {
          console.error('[CHAT] Adding error message to UI');
          
          // Set conversationId if we don't have one yet
          if (!conversationId && data.conversationId) {
            setConversationId(data.conversationId);
          }
          
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Sorry, I encountered an error: ${data.error}`,
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[CHAT] Failed to parse error:', e);
      }
      clearLastError();
    }
  }, [lastError, conversationId, clearLastError]);

  const handleSendMessage = async (message: string) => {
    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send to backend
      const response = await axios.post(`${API_URL}/api/chat`, {
        message,
        conversationId,
      });

      // Set conversation ID if this is the first message
      if (!conversationId && response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

      // Note: AI response will come via Socket.io
      // The axios response is just for confirmation

    } catch (error) {
      console.error('Send message error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I had trouble processing your message. Please try again.',
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Plane className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                TripWhat
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          
          {conversationId && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <MapPin size={16} />
              <span className="hidden sm:inline">Session: {conversationId.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages Container */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Plane className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Where would you like to go?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                I'm your AI travel assistant. Ask me about destinations, plan trips, or get recommendations!
              </p>
            </div>
          ) : (
            // Messages
            <>
              {messages.map((msg, index) => (
                <MessageBubble
                  key={index}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
            </>
          )}

          {/* Typing Indicator */}
          {(isLoading || agentStatus) && <TypingIndicator status={agentStatus} />}

          {/* Scroll Anchor */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={isLoading || !isConnected}
        placeholder={
          isConnected
            ? 'Ask me about your next trip...'
            : 'Connecting to server...'
        }
      />
    </div>
  );
}
