import React from 'react';
import { Activity, Sparkles, MapPin, Beaker } from 'lucide-react';

interface NavbarProps {
  onOpenAnalytics: () => void;
  eventCount: number;
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  onHomeClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAnalytics,
  eventCount,
  selectedLocation,
  onHomeClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Research & Demo Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium truncate">
          <Beaker className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
          <span className="truncate">PS3 Research Study • Human-AI Collaboration • Demo Prototype</span>
        </div>
        <button
          onClick={onOpenAnalytics}
          id="btn-research-tracker-badge"
          className="flex items-center gap-1 text-[11px] bg-amber-200/80 hover:bg-amber-300 text-amber-900 px-2 py-0.5 rounded-full font-semibold transition-colors flex-shrink-0 cursor-pointer ml-2"
          title="Open Experiment Event Log & Behavioral Hypotheses"
        >
          <Activity className="w-3 h-3 text-amber-800 animate-pulse" />
          <span>Events: {eventCount}</span>
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={onHomeClick}
          id="btn-logo-home"
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-950 text-base tracking-tight font-['Outfit']">
                CoMeal
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                SG
              </span>
            </div>
            <p className="text-[11px] text-stone-700 font-medium">Home-cooked meals, ordered together.</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-stone-800 bg-stone-100/90 px-2.5 py-1.5 rounded-lg border border-stone-200/80 font-medium">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
            <span className="font-medium text-stone-900">{selectedLocation === 'All' ? 'Singapore' : selectedLocation}</span>
          </div>

          <button
            onClick={onOpenAnalytics}
            id="btn-open-research-panel"
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors relative"
            title="View Behavioral Research Logs"
          >
            <Activity className="w-4 h-4 text-stone-700" />
            {eventCount > 0 && (
              <span className="absolute 1 top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
