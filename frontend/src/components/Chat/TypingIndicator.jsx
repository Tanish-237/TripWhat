import { motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';

export function TypingIndicator({ status }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 mb-4"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md">
        <Bot size={20} />
      </div>

      {/* Typing Animation */}
      <div className="flex flex-col items-start">
        <div className="rounded-2xl px-4 py-3 bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <span className="text-sm text-gray-600">
              {status || 'Thinking...'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
