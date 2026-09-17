import React, { useState } from 'react';
import { MealDrop } from '../types';
import {
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Send,
  MessageSquare,
  Sparkles,
  HeartHandshake,
} from 'lucide-react';
import { submitFeedback, trackEvent } from '../services/tracker';

interface FeedbackScreenProps {
  type: 'conversion' | 'abandonment';
  drop?: MealDrop;
  onFinished: () => void;
}

const CONVERSION_OPTIONS = [
  'Trusted home cook',
  'Good neighbour reviews',
  'Food looked good',
  'Price',
  'Nearby location',
  'Free pickup',
  'Delivery convenience',
  'Cheaper shared delivery',
  'Neighbours already joined',
  'Convenient timing',
];

const ABANDONMENT_OPTIONS = [
  "I don't know the cook",
  'Not enough reviews',
  'Too expensive',
  'Delivery fee too high',
  'Pickup too far',
  'Wrong timing',
  'Food not appealing',
  'Just browsing',
  'Other',
];

export const FeedbackScreen: React.FC<FeedbackScreenProps> = ({
  type,
  drop,
  onFinished,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isConversion = type === 'conversion';
  const options = isConversion ? CONVERSION_OPTIONS : ABANDONMENT_OPTIONS;

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    trackEvent('feedback_option_selected', {
      mealDropId: drop?.id,
      mealName: drop?.mealName,
      metadata: { type, selectedOption: option },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    submitFeedback({
      type,
      mealDropId: drop?.id,
      mealName: drop?.mealName,
      selectedOption,
      comment,
    });

    trackEvent('feedback_submitted', {
      mealDropId: drop?.id,
      mealName: drop?.mealName,
      metadata: { type, selectedOption, hasComment: Boolean(comment.trim()) },
    });

    if (comment.trim()) {
      trackEvent('comment_submitted', {
        mealDropId: drop?.id,
        mealName: drop?.mealName,
        metadata: { type, commentLength: comment.length },
      });
    }

    setSubmitted(true);
    setTimeout(() => {
      onFinished();
    }, 1200);
  };

  const handleSkip = () => {
    trackEvent('order_abandoned', {
      mealDropId: drop?.id,
      mealName: drop?.mealName,
      metadata: { feedbackSkipped: true, type },
    });
    onFinished();
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-stone-200 shadow-lg space-y-5">
        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-['Outfit']">
              Feedback Recorded!
            </h2>
            <p className="text-xs text-stone-600 max-w-xs mx-auto">
              Thank you for contributing to the CoMeal SG Human-AI behavioral research study.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="space-y-1.5 text-center">
              {isConversion ? (
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2">
                  <HeartHandshake className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center mx-auto mb-2">
                  <HelpCircle className="w-6 h-6" />
                </div>
              )}

              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                {isConversion ? 'Order Intent Registered' : 'Quick Question'}
              </span>

              <h2 className="text-xl font-bold text-stone-950 font-['Outfit'] pt-1">
                {isConversion
                  ? 'What mattered most in your decision?'
                  : 'What stopped you from joining?'}
              </h2>

              <p className="text-xs text-stone-600">
                {isConversion
                  ? drop
                    ? `You joined ${drop.cookName}'s batch`
                    : 'Help us understand your ordering choice.'
                  : drop
                  ? `Viewing ${drop.cookName}'s batch`
                  : 'Your honest feedback directly guides the research experiment.'}
              </p>
            </div>

            {/* Option Pills */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Select primary factor:
                </p>
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {options.map((opt) => {
                    const isSelected = selectedOption === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        id={`btn-feedback-opt-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => handleSelectOption(opt)}
                        className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Open Comment */}
              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor="input-qualitative-comment"
                  className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider"
                >
                  Anything else? (Optional)
                </label>
                <textarea
                  id="input-qualitative-comment"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    isConversion
                      ? 'e.g. Living close to Blk 318 makes pickup super easy!'
                      : 'e.g. Would join if delivery was available after 8pm.'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 bg-stone-50 text-stone-900 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id="btn-skip-feedback"
                  onClick={handleSkip}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={!selectedOption}
                  id="btn-submit-feedback"
                  className="flex-2 py-2.5 rounded-xl bg-stone-900 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Submit Response</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
