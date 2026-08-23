import { useState } from 'react';
import { Check, ArrowRight, Pencil } from 'lucide-react';

interface QuestionOption {
  label: string;
  value: string | number;
}

interface QuestionCardProps {
  data: {
    question: string;
    options?: QuestionOption[] | null;
    allowCustom?: boolean;
    allowMultiSelect?: boolean;
    placeholder?: string;
  };
  onAnswer: (answer: any) => void;
}

export function QuestionCard({ data, onAnswer }: QuestionCardProps) {
  const [selectedValues, setSelectedValues] = useState<(string | number)[]>([]);
  const [textValue, setTextValue] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const isMulti = data.allowMultiSelect ?? false;
  const options = data.options || [];
  const allowCustom = data.allowCustom ?? true;
  const hasOptions = options.length > 0;

  const toggleOption = (value: string | number) => {
    if (isMulti) {
      setSelectedValues((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      setSelectedValues([value]);
    }
  };

  const handleNext = () => {
    if (selectedValues.length > 0) {
      onAnswer(isMulti ? selectedValues : selectedValues[0]);
    } else if (textValue.trim()) {
      onAnswer(textValue.trim());
    }
  };

  const handleLetDecide = () => {
    onAnswer('you_decide');
  };

  const handleTextSubmit = () => {
    if (textValue.trim()) {
      onAnswer(textValue.trim());
    }
  };

  const hasAnswer = selectedValues.length > 0 || textValue.trim().length > 0;

  return (
    <div
      className="rounded-xl bg-white border border-[var(--border)] p-4"
      style={{ animation: 'widgetMount 0.3s ease-out forwards' }}
    >
      {/* Question text */}
      <p className="text-sm font-medium text-[var(--ink)] mb-3">{data.question}</p>

      {/* Multi-select label */}
      {isMulti && hasOptions && (
        <p className="text-xs text-[var(--muted)] mb-2">Select all that apply</p>
      )}

      {/* Options as numbered rows */}
      {hasOptions && !showTextInput ? (
        <div className="space-y-1.5">
          {options.map((opt, i) => {
            const isSelected = selectedValues.includes(opt.value);
            return (
              <button
                key={String(opt.value)}
                onClick={() => toggleOption(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-[var(--border)] bg-white hover:bg-[var(--sage)]'
                }`}
              >
                <span className={`text-[10px] font-mono w-4 text-center ${isSelected ? 'text-blue-500' : 'text-[var(--muted)]'}`}>
                  {i + 1}
                </span>
                <span className="text-sm text-[var(--ink)] flex-1">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
              </button>
            );
          })}

          {/* Type something else */}
          {allowCustom && (
            <button
              onClick={() => setShowTextInput(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                showTextInput
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-[var(--border)] bg-white hover:bg-[var(--sage)]'
              }`}
            >
              <span className="text-[10px] font-mono w-4 text-center text-[var(--muted)]">
                {options.length + 1}
              </span>
              <span className="text-sm text-[var(--muted)] flex-1">{data.placeholder || 'Type something else...'}</span>
              <Pencil className="w-3 h-3 text-[var(--muted)]" />
            </button>
          )}
        </div>
      ) : null}

      {/* Text input (for text-only questions or "type something else") */}
      {(!hasOptions || showTextInput) && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder={data.placeholder || 'Type your answer...'}
            autoFocus
            className="flex-1 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-blue-300 transition-colors"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textValue.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--ink)] text-white disabled:opacity-30 hover:bg-[#292524] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom controls */}
      {hasOptions && !showTextInput && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={handleLetDecide}
            className="px-3 py-1.5 rounded-md text-xs text-[var(--muted)] hover:bg-[var(--sage)] transition-colors"
          >
            Let TripWhat decide
          </button>
          <button
            onClick={handleNext}
            disabled={!hasAnswer}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--ink)] text-white text-xs font-medium disabled:opacity-30 hover:bg-[#292524] transition-colors"
          >
            Next
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

interface CompletedQuestionProps {
  question: string;
  answer: string;
}

export function CompletedQuestion({ question, answer }: CompletedQuestionProps) {
  return (
    <div className="flex items-start gap-2 py-1.5 px-1">
      <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
      <p className="text-xs text-[var(--ink)] leading-relaxed">
        <span className="text-[var(--muted)]">{question} </span>
        <span className="font-medium">{answer}</span>
      </p>
    </div>
  );
}
