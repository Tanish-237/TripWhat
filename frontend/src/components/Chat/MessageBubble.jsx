import { motion } from 'framer-motion';
import { User, Bot, Calendar } from 'lucide-react';
import { containsItinerary } from '../../utils/itineraryParser';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MessageBubble({ role, content, timestamp, onViewItinerary }) {
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
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
          isUser
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
        }`}
      >
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1.5 px-1">
          {new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>

        {/* View Itinerary Button */}
        {hasItinerary && onViewItinerary && (
          <button
            onClick={onViewItinerary}
            className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105 active:scale-95 text-sm font-medium shadow-md"
          >
            <Calendar size={16} />
            View on Map
          </button>
        )}
      </div>
    </motion.div>
  );
}
