import { useRef, useState, useEffect } from 'react';
import { ArrowUp, Sparkles, Mic, MoreHorizontal, Share2, Activity } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useTripStore } from '../../stores/tripStore';
import { chatApi } from '../../lib/api';
import { QuestionCard, CompletedQuestion } from './widgets/QuestionCard';
import { ItinerarySummary } from './widgets/ItinerarySummary';
import { SearchResults } from './widgets/SearchResults';
import { FormattedText } from './widgets/HighlightedText';

interface ChatPanelProps {
  title?: string;
  tripState?: any;
  onItineraryBuilt?: (tripState: any) => void;
  onTripStateUpdate?: (tripState: any) => void;
  onSelectPlace?: (placeId: string) => void;
  initialMessage?: string;
  emptyStatePrompts?: string[];
}

type ChatEntry =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string; widgets?: any[] }
  | { kind: 'answered'; question: string; answerLabel: string };

export function ChatPanel({
  title = 'New trip',
  tripState,
  onItineraryBuilt,
  onTripStateUpdate,
  onSelectPlace,
  initialMessage,
  emptyStatePrompts = [
    'Plan a 5-day Japan trip visiting Tokyo and Kyoto',
    'I want to explore Paris for a weekend',
    'Help me plan a beach vacation in Bali',
  ],
}: ChatPanelProps) {
  const {
    conversationId, isLoading, agentStatus, streamingText,
    setConversationId, setLoading, setAgentStatus, setStreamingText, reset,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [assistantText, setAssistantText] = useState<string>('');
  const [itinerarySummary, setItinerarySummary] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasSentInitial = useRef(false);

  // On mount: restore from chatStore if messages exist
  useEffect(() => {
    const msgs = useChatStore.getState().messages;
    if (msgs && msgs.length > 0) {
      const entries: ChatEntry[] = msgs.map((m) =>
        m.role === 'user'
          ? { kind: 'user', text: m.content }
          : { kind: 'assistant', text: m.content, widgets: m.widgets }
      );
      if (entries.length > 0) {
        setChatEntries(entries);
        setHasStarted(true);
        const lastAssistant = [...entries].reverse().find((e) => e.kind === 'assistant');
        if (lastAssistant && lastAssistant.kind === 'assistant') {
          setAssistantText(lastAssistant.text);
        }
      }
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialMessage && !hasSentInitial.current && !hasStarted) {
      hasSentInitial.current = true;
      handleSend(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, hasStarted]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatEntries, activeWidget, assistantText, isLoading, streamingText]);

  // Keep a ref of conversationId so Socket.IO handlers always see the latest
  // value without needing to re-register on every change (avoids race condition
  // where the first agent:response arrives before the state update lands).
  const conversationIdRef = useRef<string | null>(null);
  conversationIdRef.current = conversationId;

  // Store processResponse in a ref so the Socket.IO handler (registered once)
  // always calls the LATEST version, not a stale closure from the first render.
  // The assignment happens after processResponse is defined (see below).
  const processResponseRef = useRef<(data: any) => void>(() => {});

  // Listen for agent:widget events (from ask_question tool)
  useEffect(() => {
    const socket = useTripStore.getState().socket;
    if (!socket) return;

    const handleWidget = (data: any) => {
      // Only filter when we have a conversationId to compare against.
      // On the first turn, conversationId is null — allow the event through.
      if (data.conversationId && conversationIdRef.current && data.conversationId !== conversationIdRef.current) return;
      if (data.widget) {
        setActiveWidget(data.widget);
      }
    };

    socket.on('agent:widget', handleWidget);
    return () => { socket.off('agent:widget', handleWidget); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for final agent:response via Socket.IO
  useEffect(() => {
    const socket = useTripStore.getState().socket;
    if (!socket) return;

    const handleAgentResponse = (data: any) => {
      // Only filter when we have a conversationId to compare against.
      // On the first turn, conversationId is null — allow the event through
      // so processResponse can set it and populate searchResults/widgets.
      if (data.conversationId && conversationIdRef.current && data.conversationId !== conversationIdRef.current) return;
      processResponseRef.current(data);
      setStreamingText('');
      setLoading(false);
      setAgentStatus(null);
    };

    socket.on('agent:response', handleAgentResponse);
    return () => { socket.off('agent:response', handleAgentResponse); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processResponse = (data: any) => {
    if (data.conversationId && !conversationId) {
      setConversationId(data.conversationId);
    }

    if (data.tripState && onTripStateUpdate) {
      onTripStateUpdate(data.tripState);
    }

    const widgets = data.widgets || [];
    const qWidget = widgets.find((w: any) => w.type === 'question_card');
    const sWidget = widgets.find((w: any) => w.type === 'itinerary_summary');
    const srWidget = widgets.find((w: any) => w.type === 'search_results');

    // Update activeWidget based on whether this turn called ask_question.
    // The backend includes the question_card widget in the response payload
    // so we know whether to keep or clear the widget. This handles stale
    // agent:widget events from previous turns that might re-set activeWidget.
    if (qWidget) {
      setActiveWidget(qWidget);
    } else {
      setActiveWidget(null);
    }

    if (sWidget) {
      setItinerarySummary(sWidget.data);
    }

    // For search results, store them per-message instead of as a singleton.
    if (srWidget) {
      setSearchResults(srWidget.data);
    } else {
      setSearchResults(null);
    }

    // Always set assistantText — the rendering hides it when activeWidget
    // is set (via the !activeWidget check), so no duplication with the widget.
    setAssistantText(data.message || '');

    if (data.message) {
      // Store ALL widgets with the assistant entry (including question_card)
      // so the rendering can skip question-turn entries in the history.
      const entryWidgets = widgets.filter((w: any) =>
        w.type === 'search_results' || w.type === 'itinerary_summary' || w.type === 'question_card'
      );
      setChatEntries((prev) => [...prev, { kind: 'assistant', text: data.message, widgets: entryWidgets }]);
    }

    if (data.message) {
      useChatStore.getState().addMessage({
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        widgets: data.widgets,
        suggestions: data.suggestions,
        changeSummary: data.changeSummary,
        classification: data.classification,
      });
    }

    if (data.tripState?.itinerary && onItineraryBuilt) {
      onItineraryBuilt(data.tripState);
    }
  };

  // Update the ref every render so the Socket.IO handler always calls
  // the latest processResponse (with current state/props, not stale ones).
  processResponseRef.current = processResponse;

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setChatEntries((prev) => [...prev, { kind: 'user', text: text.trim() }]);
    setInput('');
    setHasStarted(true);
    setLoading(true);
    setAgentStatus('Thinking...');
    setStreamingText('');
    setSearchResults(null);
    setActiveWidget(null);

    useChatStore.getState().addMessage({
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    });

    try {
      const res = await chatApi.sendMessage({
        message: text,
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
      setActiveWidget(null);
      setLoading(false);
      setAgentStatus(null);
    }
  };

  const handleAnswer = async (answer: any) => {
    if (!activeWidget || isLoading) return;

    const question = activeWidget.data.question;
    const answerLabel = typeof answer === 'string' ? answer : String(answer);

    setChatEntries((prev) => [...prev, { kind: 'answered', question, answerLabel }]);
    setActiveWidget(null);
    setAssistantText('');

    setLoading(true);
    setAgentStatus('Thinking...');
    setStreamingText('');

    useChatStore.getState().addMessage({
      role: 'user',
      content: answerLabel,
      timestamp: new Date().toISOString(),
    });

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

      {/* Chat area */}
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
              {/* Chat history — all entries rendered in order */}
              {chatEntries.map((entry, i) => {
                if (entry.kind === 'user') {
                  return (
                    <div key={i} className="flex justify-end mb-2">
                      <div className="bg-[var(--lavender)] rounded-xl px-3 py-2 max-w-[80%]">
                        <p className="text-xs text-[var(--ink)] leading-relaxed">{entry.text}</p>
                      </div>
                    </div>
                  );
                }
                if (entry.kind === 'answered') {
                  return (
                    <CompletedQuestion key={i} question={entry.question} answer={entry.answerLabel} />
                  );
                }
                // assistant entry — only render text here if it's NOT the latest one
                const isLastAssistant =
                  i === chatEntries.length - 1 && entry.kind === 'assistant';
                if (isLastAssistant) return null; // rendered below with widgets
                // Skip question-turn entries — CompletedQuestion represents them
                const hasQuestionCard = entry.widgets?.some((w: any) => w.type === 'question_card');
                if (hasQuestionCard) return null;
                // Render inline widgets (search results) for this message
                const entrySrWidget = entry.widgets?.find((w: any) => w.type === 'search_results');
                return (
                  <div key={i} className="mt-2 mb-3">
                    {entrySrWidget ? (
                      <SearchResults
                        data={entrySrWidget.data}
                        text={entry.text}
                        onSelectPlace={onSelectPlace}
                      />
                    ) : (
                      <FormattedText
                        text={entry.text}
                        className="text-sm text-[var(--ink)] leading-relaxed space-y-1.5"
                      />
                    )}
                  </div>
                );
              })}

              {/* Streaming text (live token-by-token) */}
              {streamingText && (
                <div className="mt-2 mb-3">
                  <FormattedText
                    text={streamingText}
                    className="text-sm text-[var(--ink)] leading-relaxed space-y-1.5"
                  />
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

              {/* Active question card (from ask_question tool) */}
              {activeWidget && activeWidget.type === 'question_card' && !isLoading && (
                <QuestionCard data={activeWidget.data} onAnswer={handleAnswer} />
              )}

              {/* Itinerary summary — shown after itinerary is built */}
              {itinerarySummary && !activeWidget && !isLoading && (
                <ItinerarySummary data={itinerarySummary} onSelectPlace={onSelectPlace} />
              )}

              {/* Search results — shown after a search/recommendation turn */}
              {searchResults && !itinerarySummary && !activeWidget && !isLoading && !streamingText && (
                <SearchResults data={searchResults} text={assistantText} onSelectPlace={onSelectPlace} />
              )}

              {/* Latest assistant text (when no widget, no streaming) */}
              {assistantText && !searchResults && !activeWidget && !isLoading && !streamingText && (
                <div className="mt-2 mb-3">
                  <FormattedText
                    text={assistantText}
                    className="text-sm text-[var(--ink)] leading-relaxed space-y-1.5"
                  />
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
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--sage)] transition-colors" title="Voice">
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--ink)] text-white disabled:opacity-30 hover:bg-[#292524] transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
