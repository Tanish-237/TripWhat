import { motion } from 'framer-motion';
import { User, Bot, Calendar } from 'lucide-react';
import { containsItinerary } from '../../utils/itineraryParser';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  onViewItinerary?: () => void;
}

export function MessageBubble({ role, content, timestamp, onViewItinerary }: MessageBubbleProps) {
  const isUser = role === 'user';
  const hasItinerary = !isUser && containsItinerary(content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
        
        {/* Timestamp */}
        <span className="text-xs text-gray-500 mt-1 px-1">
          {new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>

        {/* View Itinerary Button */}
        {hasItinerary && onViewItinerary && (
          <button
            onClick={onViewItinerary}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
          >
            <Calendar size={16} />
            View Itinerary
          </button>
        )}
      </div>
    </motion.div>
  );
}
