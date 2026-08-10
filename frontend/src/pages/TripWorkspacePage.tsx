import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MapPin, Plane } from 'lucide-react';
import { useChatStore, type ChatMessage } from '../stores/chatStore';
import { useTripStore } from '../stores/tripStore';
import { useUIStore } from '../stores/uiStore';
import { chatApi } from '../lib/api';
import { SuggestionChips } from '../components/Chat/widgets/SuggestionChips';
import { PlanCtaCard } from '../components/Chat/widgets/PlanCtaCard';
import { RouteProposalCard } from '../components/Chat/widgets/RouteProposalCard';
import { QuestionCard } from '../components/Chat/widgets/QuestionCard';
import { ChangeSummaryCard } from '../components/Chat/widgets/ChangeSummaryCard';
import { TripMap } from '../components/map/TripMap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TripWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { messages, isLoading, agentStatus, addMessage, setLoading, setAgentStatus, conversationId, setConversationId } = useChatStore();
  const { tripState, fetchTrip, connectSocket, disconnectSocket } = useTripStore();
  const { activeTab, setActiveTab, cityFilter, setCityFilter } = useUIStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const socketRef = useRef<any>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setTripLoading(true);
      setTripError(null);
      fetchTrip(id).catch((err) => setTripError(err?.message || 'Failed to load trip')).finally(() => setTripLoading(false));
    }
    connectSocket(conversationId || undefined);

    return () => {
      disconnectSocket();
    };
  }, [id]);

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
        currentItinerary: tripState?.itinerary || null,
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

  const cities = tripState?.cities || [];
  const itinerary = tripState?.itinerary;

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] relative z-10">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(41,37,36,0.06)] bg-[var(--surface)]">
        <button
          onClick={() => navigate('/trips')}
          className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Trips
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--peach)]" />
          <span className="text-sm font-medium text-[var(--ink)]">
            {tripLoading ? 'Loading...' : cities.map((c) => c.name).join(' → ') || 'New trip'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${socketRef.current?.connected ? 'bg-green-500' : 'bg-[var(--muted)]'}`} />
          <span className="text-xs text-[var(--muted)]">
            {socketRef.current?.connected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {tripError && (
        <div className="px-6 py-4 bg-red-50 text-red-600 text-sm text-center">
          {tripError}
        </div>
      )}

      {tripLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-[var(--muted)]">Loading trip...</div>
        </div>
      ) : (
        <>
      {/* Split view: chat (35%) + map/tabs (65%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column */}
        <div className="w-[35%] flex flex-col border-r border-[rgba(41,37,36,0.06)] bg-[var(--surface)]">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-[2rem] bg-[var(--sage)] flex items-center justify-center">
                  <Plane className="w-8 h-8 text-[var(--peach)]" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--ink)] mb-2">
                  Where to next?
                </h2>
                <p className="text-sm text-[var(--muted)] mb-6">
                  Tell me about your dream trip and I'll help you plan it.
                </p>
                <div className="space-y-2">
                  {[
                    'Plan a 5-day Japan trip visiting Tokyo and Kyoto',
                    'What are the best beaches in Bali?',
                    'I want to explore Paris for a weekend',
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

          {/* Input */}
          <div className="border-t border-[rgba(41,37,36,0.06)] p-4">
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
                placeholder="Ask about your trip..."
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

        {/* Map + tabs column */}
        <div className="w-[65%] flex flex-col">
          {/* Map */}
          <div className="flex-1 relative bg-[var(--sage)]">
            {itinerary ? (
              <TripMap itinerary={itinerary} selectedCity={cityFilter} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-[var(--muted)] mx-auto mb-3 opacity-40" />
                  <p className="text-[var(--muted)] text-sm">
                    Your itinerary map will appear here
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Below-map panel with tabs */}
          <div className="h-[40%] border-t border-[rgba(41,37,36,0.06)] bg-[var(--surface)] flex flex-col">
            <div className="flex border-b border-[rgba(41,37,36,0.06)]">
              {(['plan', 'saved', 'bookings'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors duration-300 ${
                    activeTab === t
                      ? 'text-[var(--peach)] border-b-2 border-[var(--peach)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'plan' && (
                <PlanTab itinerary={itinerary} cityFilter={cityFilter} setCityFilter={setCityFilter} cities={cities} />
              )}
              {activeTab === 'saved' && (
                <div className="text-center py-8 text-[var(--muted)] text-sm">
                  Saved places will appear here
                </div>
              )}
              {activeTab === 'bookings' && (
                <div className="text-center py-8 text-[var(--muted)] text-sm">
                  Bookings will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
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
            isUser
              ? 'bg-[var(--lavender)] text-[var(--ink)]'
              : 'bg-[var(--sage)] text-[var(--ink)]'
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

        {/* Widgets */}
        {message.widgets?.map((widget, i) => (
          <WidgetRenderer key={i} widget={widget} onSend={onSend} />
        ))}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <SuggestionChips suggestions={message.suggestions} onSelect={onSend} />
        )}

        <span className="text-xs text-[var(--muted)] mt-1 px-1">
          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
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

function PlanTab({ itinerary, cityFilter, setCityFilter, cities }: any) {
  if (!itinerary || !itinerary.days) {
    return (
      <div className="text-center py-8 text-[var(--muted)] text-sm">
        No itinerary yet. Start chatting to plan your trip.
      </div>
    );
  }

  const filteredDays = cityFilter
    ? itinerary.days.filter((d: any) => d.location === cityFilter)
    : itinerary.days;

  return (
    <div>
      {/* City filter chips */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setCityFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
              !cityFilter ? 'bg-[var(--lavender)] text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-[var(--sage)]'
            }`}
          >
            All
          </button>
          {cities.map((c: any) => (
            <button
              key={c.name}
              onClick={() => setCityFilter(c.name)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
                cityFilter === c.name ? 'bg-[var(--lavender)] text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-[var(--sage)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {filteredDays.map((day: any) => (
          <div key={day.dayNumber} className="rounded-[1.25rem] bg-[var(--bg)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--peach)]">
                Day {day.dayNumber}
              </span>
              {day.location && (
                <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {day.location}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {day.timeSlots?.map((slot: any, i: number) => (
                <div key={i} className="text-sm text-[var(--ink)]">
                  <span className="text-xs text-[var(--muted)] capitalize mr-2">{slot.timeSlot}</span>
                  {slot.activity?.name || slot.activities?.map((a: any) => a.name).join(', ') || 'Free time'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
