import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const SUGGESTED_PROMPTS = [
  "Plan a 3-day trip to Paris",
  "Find beaches in Bali",
  "Show me attractions in Tokyo",
  "What can I do in Barcelona?",
];

export function MessageInput({ onSend, disabled, placeholder }) {
  const [message, setMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setMessage(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="border-t border-gray-200/50 bg-white/95 backdrop-blur-sm p-4">
      {/* Suggested Prompts */}
      {showSuggestions && message.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex flex-wrap gap-2"
        >
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-all flex items-center gap-1.5 shadow-sm hover:shadow"
            >
              <Sparkles size={12} />
              {prompt}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input Box */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || "Ask me about your next trip..."}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-shadow focus:shadow-md"
            style={{
              minHeight: "48px",
              maxHeight: "120px",
            }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-gray-600">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-gray-600">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
