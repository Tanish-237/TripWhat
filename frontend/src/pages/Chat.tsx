import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { TypingIndicator } from '../components/Chat/TypingIndicator';
import { MessageInput } from '../components/Chat/MessageInput';
import { Map } from '../components/Map';
import { ItineraryOverlay } from '../components/ItineraryOverlay';
import type { Itinerary, Activity } from '../types/itinerary';
import { parseItineraryFromMarkdown } from '../utils/itineraryParser';
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
  
  // Itinerary and Map state
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [mapLocations, setMapLocations] = useState<Array<{lat: number; lon: number; name: string; description?: string}>>([]);

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

  // Parse itinerary when assistant message arrives
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const parsed = parseItineraryFromMarkdown(lastMessage.content);
      if (parsed) {
        console.log('[CHAT] Parsed itinerary:', parsed);
        setCurrentItinerary(parsed);
        
        // Extract locations for map
        const allActivities = parsed.days.flatMap(day =>
          day.timeSlots.flatMap(slot => slot.activities)
        );
        
        const locations = allActivities
          .filter(activity => activity.location.lat !== 0 && activity.location.lon !== 0)
          .map(activity => ({
            lat: activity.location.lat,
            lon: activity.location.lon,
            name: activity.name,
            description: activity.category
          }));
        
        if (locations.length > 0) {
          setMapLocations(locations);
        }
      }
    }
  }, [messages]);

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
      // Get auth token
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated. Please log in.');
      }

      // Send to backend
      const response = await axios.post(`${API_URL}/api/chat`, {
        message,
        conversationId,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Set conversation ID if this is the first message
      if (!conversationId && response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

      // Note: AI response will come via Socket.io
      // The axios response is just for confirmation

    } catch (error) {
      console.error('Send message error:', error);
      
      let errorMessage = 'Sorry, I had trouble processing your message. Please try again.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          errorMessage = 'Please log in to continue chatting.';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
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

      {/* Split View: Chat + Map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel - 35% */}
        <div className="w-[35%] flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex-1 overflow-y-auto px-6 py-6">
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
                  onViewItinerary={() => {
                    const parsed = parseItineraryFromMarkdown(msg.content);
                    if (parsed) {
                      setCurrentItinerary(parsed);
                      setIsItineraryOpen(true);
                    }
                  }}
                />
              ))}
            </>
          )}

          {/* Typing Indicator */}
          {(isLoading || agentStatus) && <TypingIndicator status={agentStatus} />}

          {/* Scroll Anchor */}
          <div ref={messagesEndRef} />
          </div>

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

        {/* Map Panel - 65% */}
        <div className="w-[65%] relative bg-gray-50 dark:bg-gray-900">
          <Map locations={mapLocations} />
        </div>
      </div>

      {/* Itinerary Overlay */}
      <ItineraryOverlay
        itinerary={currentItinerary}
        isOpen={isItineraryOpen}
        onClose={() => setIsItineraryOpen(false)}
        onActivityClick={(activity) => {
          // Center map on selected activity
          setMapLocations([{
            lat: activity.location.lat,
            lon: activity.location.lon,
            name: activity.name,
            description: activity.description
          }]);
        }}
      />
    </div>
  );
}
