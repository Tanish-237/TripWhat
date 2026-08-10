import React, { useState } from 'react';
import { Calendar, Users, Clock, MapPin } from 'lucide-react';

interface QuestionCardProps {
  data: {
    slot: string;
    question: string;
    type?: 'text' | 'date' | 'number' | 'choice';
    options?: string[];
    placeholder?: string;
  };
  onAnswer: (answer: any) => void;
}

export function QuestionCard({ data, onAnswer }: QuestionCardProps) {
  const [value, setValue] = useState('');
  const slot = data.slot || 'unknown';
  const icon = {
    destination: <MapPin className="w-4 h-4 text-[var(--peach)]" />,
    dates: <Calendar className="w-4 h-4 text-[var(--peach)]" />,
    duration: <Clock className="w-4 h-4 text-[var(--peach)]" />,
    travelers: <Users className="w-4 h-4 text-[var(--peach)]" />,
  }[slot] || <MapPin className="w-4 h-4 text-[var(--peach)]" />;

  const handleSubmit = () => {
    if (value.trim()) {
      onAnswer(value.trim());
      setValue('');
    }
  };

  const handleChoice = (choice: string) => {
    onAnswer(choice);
  };

  return (
    <div
      className="rounded-2xl bg-[var(--surface)] p-5 mt-3"
      style={{
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
        animation: 'widgetMount 0.4s ease-out forwards',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium text-[var(--ink)]">{data.question}</span>
      </div>

      {data.type === 'choice' && data.options ? (
        <div className="flex flex-wrap gap-2">
          {data.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleChoice(opt)}
              className="px-4 py-2 rounded-full bg-[var(--lavender)] text-sm text-[var(--ink)] hover:bg-[var(--peach)] hover:text-white transition-all duration-300"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type={data.type === 'date' ? 'date' : data.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={data.placeholder || 'Type your answer...'}
            className="flex-1 px-4 py-2.5 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--peach)] transition-all duration-300"
          />
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300"
          >
            Send
          </button>
        </div>
      )}
      <style>{`
        @keyframes widgetMount {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
