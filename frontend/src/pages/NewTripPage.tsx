import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Plane } from 'lucide-react';
import { useChatStore, type ChatMessage } from '../stores/chatStore';
import { useTripStore } from '../stores/tripStore';
import { chatApi } from '../lib/api';
import { SuggestionChips } from '../components/Chat/widgets/SuggestionChips';
import { PlanCtaCard } from '../components/Chat/widgets/PlanCtaCard';
import { RouteProposalCard } from '../components/Chat/widgets/RouteProposalCard';
import { QuestionCard } from '../components/Chat/widgets/QuestionCard';
import { ChangeSummaryCard } from '../components/Chat/widgets/ChangeSummaryCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NewTripPage() {
  const navigate = useNavigate();
  const { messages, isLoading, agentStatus, addMessage, setLoading, setAgentStatus, conversationId, setConversationId, reset } = useChatStore();
  const { createTrip } = useTripStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() });
    setInput('');
    setLoading(true);
    setAgentStatus('Analyzing your request...');

    try {
      const res = await chatApi.sendMessage({
        message: text,
        conversationId: conversationId || undefined,
      });

      const data = res.data;
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      addMessage({
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        widgets: data.widgets,
        suggestions: data.suggestions,
        changeSummary: data.changeSummary,
        classification: data.classification,
      });

      if (data.tripState?.itinerary) {
        const trip = await createTrip({
          tripState: data.tripState,
          title: data.tripState.cities?.map((c: any) => c.name).join(' → '),
        });
        if (trip?._id) {
          navigate(`/trip/${trip._id}`);
        }
      }
    } catch (err: any) {
      addMessage({
        role: 'assistant',
        content: "I'm sorry, I couldn't process your request. Please try again.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setAgentStatus(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-[2rem] bg-[var(--sage)] flex items-center justify-center">
          <Plane className="w-8 h-8 text-[var(--peach)]" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--ink)] tracking-tight">
          Plan a new trip
        </h1>
        <p className="text-[var(--muted)] mt-2">
          Tell me where you want to go and I'll handle the rest
        </p>
      </div>

      <div className="rounded-[2rem] bg-[var(--surface)] p-6" style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
        <div className="min-h-[300px] max-h-[500px] overflow-y-auto mb-4">
          {messages.length === 0 ? (
            <div className="space-y-2 py-4">
              {[
                'Plan a 5-day Japan trip visiting Tokyo and Kyoto',
                'I want to explore Paris for a weekend',
                'Help me plan a beach vacation in Bali',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="block w-full py-2.5 px-4 rounded-[1.25rem] bg-[var(--bg)] text-left text-sm text-[var(--ink)] hover:bg-[var(--sage)] transition-colors duration-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} onSend={handleSend} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-4 px-2">
                  <div className="animate-pulse">{agentStatus || 'Thinking...'}</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Describe your dream trip..."
            rows={1}
            className="flex-1 px-4 py-3 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--peach)] resize-none transition-all duration-300"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-12 h-12 rounded-[1.25rem] bg-[var(--peach)] text-white flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition-opacity duration-300"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onSend }: { message: ChatMessage; onSend: (s: string) => void }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          isUser ? 'bg-[var(--lavender)]' : 'bg-[var(--sage)]'
        }`}
      >
        {isUser ? (
          <span className="text-xs font-medium text-[var(--ink)]">You</span>
        ) : (
          <Plane className="w-4 h-4 text-[var(--peach)]" />
        )}
      </div>

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={`rounded-[1.25rem] px-4 py-3 ${
            isUser ? 'bg-[var(--lavender)] text-[var(--ink)]' : 'bg-[var(--sage)] text-[var(--ink)]'
          }`}
          style={{ animation: 'widgetMount 0.4s ease-out forwards' }}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.widgets?.map((widget, i) => (
          <WidgetRenderer key={i} widget={widget} onSend={onSend} />
        ))}

        {message.suggestions && message.suggestions.length > 0 && (
          <SuggestionChips suggestions={message.suggestions} onSelect={onSend} />
        )}
      </div>
      <style>{`
        @keyframes widgetMount {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function WidgetRenderer({ widget, onSend }: { widget: any; onSend: (s: string) => void }) {
  switch (widget.type) {
    case 'route_proposal':
      return <RouteProposalCard data={widget.data} onConfirm={() => onSend('Confirm route and build itinerary')} />;
    case 'plan_cta':
      return (
        <PlanCtaCard
          data={widget.data}
          onPrimary={() => onSend("Let's plan it")}
          onSecondary={() => onSend('Just exploring for now')}
        />
      );
    case 'question_card':
      return <QuestionCard data={widget.data} onAnswer={(answer) => onSend(answer)} />;
    case 'change_summary':
      return <ChangeSummaryCard data={widget.data} />;
    default:
      return null;
  }
}
