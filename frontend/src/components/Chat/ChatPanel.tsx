import { useRef, useState, useEffect } from 'react';
import { ArrowUp, Sparkles, Mic, MoreHorizontal, Share2, Activity } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useTripStore } from '../../stores/tripStore';
import { chatApi } from '../../lib/api';
import { RouteProposalCard } from './widgets/RouteProposalCard';
import { QuestionCard, CompletedQuestion } from './widgets/QuestionCard';

interface ChatPanelProps {
  title?: string;
  tripState?: any;
  onItineraryBuilt?: (tripState: any) => void;
  onTripStateUpdate?: (tripState: any) => void;
  initialMessage?: string;
  emptyStatePrompts?: string[];
}

interface AnsweredQuestion {
  slot: string;
  question: string;
  answer: string;
  answerLabel: string;
}

const SLOT_LABELS: Record<string, Record<string, string>> = {
  dates: { fixed: 'I have specific dates', flexible: "I'm flexible", unsure: 'Not sure yet' },
  travelers: { solo: 'Solo', couple: 'Couple', family: 'Family', friends: 'Friends', group: 'Group' },
  trip_style: { beaches: 'Beaches', culture: 'Culture', wellness: 'Wellness', adventure: 'Adventure', food: 'Food & Drink', city: 'City exploration', balanced: 'Balanced', you_decide: 'You decide' },
  help_with: { itinerary: 'Itinerary', flights: 'Flights', hotels: 'Hotels', things_to_do: 'Things to do', restaurants: 'Restaurants', everything: 'Everything', you_decide: 'You decide' },
};

function getAnswerLabel(slot: string, answer: any): string {
  if (answer === 'you_decide') return 'You decide';
  if (SLOT_LABELS[slot]?.[answer]) return SLOT_LABELS[slot][answer];
  if (Array.isArray(answer)) return answer.map((a) => SLOT_LABELS[slot]?.[a] || a).join(', ');
  return String(answer);
}

export function ChatPanel({
  title = 'New trip',
  tripState,
  onItineraryBuilt,
  onTripStateUpdate,
  initialMessage,
  emptyStatePrompts = [
    'Plan a 5-day Japan trip visiting Tokyo and Kyoto',
    'I want to explore Paris for a weekend',
    'Help me plan a beach vacation in Bali',
  ],
}: ChatPanelProps) {
  const {
    conversationId, isLoading, agentStatus, streamingText, pendingInterrupt,
    setConversationId, setLoading, setAgentStatus, setStreamingText, setPendingInterrupt, reset,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [userBubbles, setUserBubbles] = useState<string[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [assistantText, setAssistantText] = useState<string>('');
  const [routeProposal, setRouteProposal] = useState<any>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasSentInitial = useRef(false);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (initialMessage && !hasSentInitial.current && !hasStarted) {
      hasSentInitial.current = true;
      handleSend(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, hasStarted]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userBubbles, answeredQuestions, activeWidget, assistantText, isLoading, streamingText, pendingInterrupt]);

  // Listen for final agent:response via Socket.IO (streaming mode)
  useEffect(() => {
    const socket = useTripStore.getState().socket;
    if (!socket) return;

    const handleAgentResponse = (data: any) => {
      if (data.conversationId && data.conversationId !== conversationId) return;
      processResponse(data);
      setStreamingText('');
      setPendingInterrupt(null);
      setLoading(false);
      setAgentStatus(null);
    };

    socket.on('agent:response', handleAgentResponse);
    return () => { socket.off('agent:response', handleAgentResponse); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const processResponse = (data: any) => {
    if (data.conversationId && !conversationId) {
      setConversationId(data.conversationId);
    }

    if (data.tripState && onTripStateUpdate) {
      onTripStateUpdate(data.tripState);
    }

    const widgets = data.widgets || [];
    const qWidget = widgets.find((w: any) => w.type === 'question_card');
    const rWidget = widgets.find((w: any) => w.type === 'route_proposal');

    setActiveWidget(qWidget || null);

    if (rWidget) {
      setRouteProposal(rWidget.data);
    } else if (data.tripState?.itinerary) {
      setRouteProposal(null);
    }

    setAssistantText(data.message || '');

    if (data.tripState?.itinerary && onItineraryBuilt) {
      onItineraryBuilt(data.tripState);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setUserBubbles((prev) => [...prev, text.trim()]);
    setInput('');
    setHasStarted(true);
    setLoading(true);
    setAgentStatus('Thinking...');
    setStreamingText('');

    try {
      const res = await chatApi.sendMessage({
        message: text,
        conversationId: conversationId || undefined,
        currentItinerary: tripState?.itinerary || null,
      });

      // Streaming mode: API returns immediately with { status: 'streaming' }
      // The response will come via Socket.IO events (agent:token, agent:response, etc.)
      if (res.data?.status === 'streaming') {
        if (res.data.conversationId && !conversationId) {
          setConversationId(res.data.conversationId);
        }
        // Don't setLoading(false) here — it will be set false by agent:response event
      } else {
        // Fallback: non-streaming response
        processResponse(res.data);
        setLoading(false);
        setAgentStatus(null);
      }
    } catch (err: any) {
      setAssistantText("I'm sorry, I couldn't process your request. Please try again.");
      setActiveWidget(null);
      setLoading(false);
      setAgentStatus(null);
    }
  };

  const handleAnswer = async (answer: any) => {
    if (!activeWidget || isLoading) return;

    const slot = activeWidget.data.slot;
    const question = activeWidget.data.question;
    const answerLabel = getAnswerLabel(slot, answer);

    setAnsweredQuestions((prev) => [...prev, { slot, question, answer: String(answer), answerLabel }]);
    setActiveWidget(null);

    setLoading(true);
    setAgentStatus('Thinking...');
    setStreamingText('');

    try {
      const res = await chatApi.sendMessage({
        message: answerLabel,
        conversationId: conversationId || undefined,
        currentItinerary: tripState?.itinerary || null,
      });

      if (res.data?.status === 'streaming') {
        if (res.data.conversationId && !conversationId) {
          setConversationId(res.data.conversationId);
        }
      } else {
        processResponse(res.data);
        setLoading(false);
        setAgentStatus(null);
      }
    } catch (err: any) {
      setAssistantText("I'm sorry, I couldn't process your request. Please try again.");
      setLoading(false);
      setAgentStatus(null);
    }
  };

  const handleResume = async (decision: string) => {
    if (!conversationId || isLoading) return;

    setPendingInterrupt(null);
    setLoading(true);
    setAgentStatus('Processing...');
    setStreamingText('');

    try {
      await chatApi.resumeAgent({
        message: decision,
        conversationId,
      });
      // Response will come via Socket.IO events
    } catch (err: any) {
      setAssistantText("I'm sorry, I couldn't process your request. Please try again.");
      setLoading(false);
      setAgentStatus(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      {/* Slim header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] shrink-0">
        <span className="text-sm font-medium text-[var(--ink)] truncate">{title}</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--sage)] transition-colors" title="Share">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--sage)] transition-colors" title="Activity">
            <Activity className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--sage)] transition-colors" title="More">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progressive question flow */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-[480px] mx-auto">
          {!hasStarted ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--sage)] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--peach)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--ink)] mb-1">
                Where to next?
              </h2>
              <p className="text-xs text-[var(--muted)] mb-6 max-w-[240px]">
                Tell me about your dream trip and I'll help you plan it.
              </p>
              <div className="space-y-1.5 w-full max-w-[320px]">
                {emptyStatePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="block w-full py-2.5 px-3 rounded-lg bg-[var(--bg)] text-left text-xs text-[var(--ink)] hover:bg-[var(--sage)] transition-colors border border-[var(--border)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* User message bubbles */}
              {userBubbles.map((msg, i) => (
                <div key={i} className="flex justify-end mb-2">
                  <div className="bg-[var(--lavender)] rounded-xl px-3 py-2 max-w-[80%]">
                    <p className="text-xs text-[var(--ink)] leading-relaxed">{msg}</p>
                  </div>
                </div>
              ))}

              {/* Completed questions (collapsed) */}
              {answeredQuestions.map((qa, i) => (
                <CompletedQuestion key={i} question={qa.question} answer={qa.answerLabel} />
              ))}

              {/* Streaming text (live token-by-token) */}
              {streamingText && !pendingInterrupt && (
                <div className="mt-2 mb-3">
                  <p className="text-sm text-[var(--ink)] leading-relaxed">{streamingText}</p>
                </div>
              )}

              {/* Loading indicator (when no streaming text yet) */}
              {isLoading && !streamingText && (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-3 px-1 py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{agentStatus || 'Thinking...'}</span>
                </div>
              )}

              {/* Active question card (expanded) */}
              {activeWidget && activeWidget.type === 'question_card' && !isLoading && (
                <QuestionCard data={activeWidget.data} onAnswer={handleAnswer} />
              )}

              {/* Interrupt card (route confirmation from agent) */}
              {pendingInterrupt && pendingInterrupt.type === 'route_confirmation' && (
                <div className="mt-2 mb-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <p className="text-sm text-[var(--ink)] mb-2">{pendingInterrupt.message}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResume('confirm')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--ink)] text-white text-xs font-medium hover:bg-[#292524] transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleResume('reject')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--ink)] text-xs font-medium border border-[var(--border)] hover:bg-[var(--sage)] transition-colors"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              )}

              {/* Route proposal (from widget) */}
              {routeProposal && !activeWidget && !isLoading && !pendingInterrupt && (
                <div className="mt-2">
                  <RouteProposalCard data={routeProposal} onConfirm={() => handleSend('Confirm route and build itinerary')} />
                </div>
              )}

              {/* Assistant text (when no widget, no streaming, no interrupt) */}
              {assistantText && !activeWidget && !isLoading && !routeProposal && !streamingText && !pendingInterrupt && (
                <div className="mt-2 mb-3">
                  <p className="text-sm text-[var(--ink)] leading-relaxed">{assistantText}</p>
                </div>
              )}

              <div ref={scrollRef} />
            </>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--border)] p-3 shrink-0">
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-end gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 focus-within:border-[var(--muted)] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Message TripWhat…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none resize-none leading-relaxed"
              style={{ minHeight: '24px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--sage)] transition-colors" title="Voice input">
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSend(input)}
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--ink)] text-white disabled:opacity-30 hover:bg-[#292524] transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--muted)] text-center mt-1.5">
            TripWhat can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
