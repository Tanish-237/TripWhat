import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import { MessageBubble } from '../components/Chat/MessageBubble.jsx';
import { TypingIndicator } from '../components/Chat/TypingIndicator.jsx';
import { MessageInput } from '../components/Chat/MessageInput.jsx';
import { Map } from '../components/Map.jsx';
import { ItineraryOverlay } from '../components/ItineraryOverlay.jsx';
import { parseItineraryFromMarkdown } from '../utils/itineraryParser.js';
import Navbar from '../components/Navbar.jsx';
import axios from 'axios';
import { Plane, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function Chat() {
  const [conversationId, setConversationId] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Itinerary and Map state
  const [currentItinerary, setCurrentItinerary] = useState(null);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [mapLocations, setMapLocations] = useState([]);

  const { isConnected, agentStatus, lastMessage, lastError, clearLastMessage, clearLastError } = 
    useSocket(conversationId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch conversation history on initial load
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Check if there's a conversation ID in local storage
        const storedId = localStorage.getItem('tripwhat_conversation_id');
        
        if (storedId) {
          setConversationId(storedId);
          
          // Get the message history for this conversation
          const token = localStorage.getItem('tripwhat_token');
          if (token) {
            const response = await axios.get(`${API_URL}/api/chat/history/${storedId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.data.messages && response.data.messages.length > 0) {
              setMessages(response.data.messages);
              
              // Look for any itineraries in the messages
              const botMessages = response.data.messages.filter(m => m.role === 'assistant');
              if (botMessages.length > 0) {
                const lastBotMessage = botMessages[botMessages.length - 1];
                const extractedItinerary = parseItineraryFromMarkdown(lastBotMessage.content);
                if (extractedItinerary) {
                  setCurrentItinerary(extractedItinerary);
                  
                  // Extract locations for the map
                  const locations = [];
                  extractedItinerary.days.forEach(day => {
                    day.activities.forEach(activity => {
                      if (activity.location && activity.coordinates) {
                        locations.push({
                          name: activity.name,
                          description: activity.description,
                          lat: activity.coordinates.lat,
                          lng: activity.coordinates.lng
                        });
                      }
                    });
                  });
                  
                  setMapLocations(locations);
                }
              }
            }
          }
        } else {
          // Create a new conversation
          const token = localStorage.getItem('tripwhat_token');
          if (token) {
            const response = await axios.post(`${API_URL}/api/chat/conversation`, {}, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.data.conversationId) {
              setConversationId(response.data.conversationId);
              localStorage.setItem('tripwhat_conversation_id', response.data.conversationId);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch conversation history:', error);
      }
    };
    
    fetchHistory();
  }, []);

  // Process incoming messages from socket
  useEffect(() => {
    if (lastMessage) {
      // Add the message to the chat
      setMessages(prev => [...prev, { role: 'assistant', content: lastMessage }]);
      
      // Look for itinerary data
      const extractedItinerary = parseItineraryFromMarkdown(lastMessage);
      if (extractedItinerary) {
        setCurrentItinerary(extractedItinerary);
        
        // Extract locations for the map
        const locations = [];
        extractedItinerary.days.forEach(day => {
          day.activities.forEach(activity => {
            if (activity.location && activity.coordinates) {
              locations.push({
                name: activity.name,
                description: activity.description,
                lat: activity.coordinates.lat,
                lng: activity.coordinates.lng
              });
            }
          });
        });
        
        setMapLocations(locations);
      }
      
      clearLastMessage();
      setIsLoading(false);
    }
    
    if (lastError) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error while processing your request. Please try again." 
      }]);
      clearLastError();
      setIsLoading(false);
    }
  }, [lastMessage, lastError, clearLastMessage, clearLastError]);

  const handleSendMessage = async (message) => {
    if (!message.trim() || isLoading) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);
    
    try {
      // Save message to backend
      const token = localStorage.getItem('tripwhat_token');
      await axios.post(`${API_URL}/api/chat/message`, {
        conversationId,
        message,
        role: 'user'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // The socket will handle the response
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I couldn't send your message. Please check your connection and try again." 
      }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Navbar */}
      <Navbar />
      
      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 px-6 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected to chat' : 'Disconnected'}
          </p>
          
          {conversationId && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <MapPin size={16} />
              <span className="hidden sm:inline">Session: {conversationId.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      </div>

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
                Tell me your travel plans and I'll help you create the perfect itinerary with local recommendations.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Try asking:</p>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleSendMessage("Plan a weekend trip to Paris for a couple interested in art and fine dining.")}
                    className="block w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left text-sm text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    "Plan a weekend trip to Paris for a couple interested in art and fine dining."
                  </button>
                  <button 
                    onClick={() => handleSendMessage("I want to take my family to Tokyo for 5 days. We love anime and traditional culture.")}
                    className="block w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left text-sm text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    "I want to take my family to Tokyo for 5 days. We love anime and traditional culture."
                  </button>
                  <button 
                    onClick={() => handleSendMessage("What are the must-visit places in New York City for a first-time visitor?")}
                    className="block w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left text-sm text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    "What are the must-visit places in New York City for a first-time visitor?"
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message.content}
                  isUser={message.role === 'user'}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
          </div>
          
          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <MessageInput 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading}
              isDisabled={!isConnected}
              placeholder={!isConnected ? "Connecting to chat server..." : "Type your message..."}
            />
          </div>
        </div>
        
        {/* Map Panel - 65% */}
        <div className="w-[65%] relative">
          <Map locations={mapLocations} />
          
          {/* Itinerary Overlay Button */}
          {currentItinerary && (
            <button
              onClick={() => setIsItineraryOpen(!isItineraryOpen)}
              className="absolute top-4 right-4 z-10 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isItineraryOpen ? "Hide Itinerary" : "View Itinerary"}
            </button>
          )}
          
          {/* Itinerary Overlay */}
          {currentItinerary && isItineraryOpen && (
            <ItineraryOverlay 
              itinerary={currentItinerary}
              onClose={() => setIsItineraryOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
