import React, { useState, useEffect } from 'react';
import { TrackingEvent, QualitativeFeedback } from '../types';
import {
  X,
  Activity,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  Users,
  Eye,
  ShoppingBag,
  HelpCircle,
  Copy,
  ChevronRight,
  TrendingUp,
  Server,
  CloudRain,
  MapPin,
  Database,
  RefreshCw,
} from 'lucide-react';
import { clearTrackingData } from '../services/tracker';
import { fetchHealth, HealthResponse } from '../services/api';

interface AnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: TrackingEvent[];
  feedbackList: QualitativeFeedback[];
  onDataCleared: () => void;
}

export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  isOpen,
  onClose,
  events,
  feedbackList,
  onDataCleared,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'hypothesis' | 'feedback' | 'backend'>('hypothesis');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [serverEventsCount, setServerEventsCount] = useState<number | null>(null);
  const [serverCommentsCount, setServerCommentsCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHealthAndBackendData();
    }
  }, [isOpen]);

  const loadHealthAndBackendData = async () => {
    setHealthLoading(true);
    try {
      const h = await fetchHealth();
      setHealthData(h);
      const evRes = await fetch('/api/events?limit=1').then((r) => r.json()).catch(() => null);
      if (evRes && typeof evRes.total === 'number') {
        setServerEventsCount(evRes.total);
      }
      const cmRes = await fetch('/api/comments?limit=1').then((r) => r.json()).catch(() => null);
      if (cmRes && typeof cmRes.total === 'number') {
        setServerCommentsCount(cmRes.total);
      }
    } finally {
      setHealthLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filtered events
  const filteredEvents = selectedEventType === 'all'
    ? events
    : events.filter((e) => e.event === selectedEventType);

  // Behavioral metrics calculation
  const totalViews = events.filter((e) => e.event === 'meal_drop_viewed').length;
  const totalJoins = events.filter((e) => e.event === 'order_joined').length;
  const totalProgressClicks = events.filter((e) => e.event === 'group_progress_clicked' || e.event === 'meal_batch_progress_viewed').length;
  const totalCookClicks = events.filter((e) => e.event === 'home_cook_clicked' || e.event === 'cook_profile_clicked').length;
  const totalClusterViews = events.filter((e) => e.event === 'delivery_cluster_viewed').length;
  const totalPhotoViews = events.filter((e) => e.event === 'customer_photos_opened').length;
  const totalReviewsOpened = events.filter((e) => e.event === 'reviews_opened' || e.event === 'cook_reviews_opened').length;
  const pickupCount = events.filter((e) => e.event === 'pickup_selected').length;
  const deliveryCount = events.filter((e) => e.event === 'delivery_selected').length;
  const conversionRate = totalViews > 0 ? ((totalJoins / totalViews) * 100).toFixed(1) : '0.0';

  const handleCopyJson = () => {
    const data = {
      exportTime: new Date().toISOString(),
      summary: {
        totalViews,
        totalJoins,
        conversionRate,
        totalCookClicks,
        totalClusterViews,
        totalPhotoViews,
        pickupCount,
        deliveryCount,
      },
      events,
      feedbackList,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const data = {
      exportTime: new Date().toISOString(),
      summary: {
        totalViews,
        totalJoins,
        conversionRate,
        totalCookClicks,
        totalClusterViews,
        totalPhotoViews,
        pickupCount,
        deliveryCount,
      },
      events,
      feedbackList,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comeal_sg_v3_ps3_events_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Clear all logged tracking events and qualitative feedback?')) {
      clearTrackingData();
      onDataCleared();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl border-l border-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight font-['Outfit']">
                PS3 Experiment Analytics & Tracking
              </h2>
              <p className="text-[11px] text-stone-400">
                Human-AI Collaboration • Course Study Data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="btn-close-analytics"
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-3 pt-2 gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('hypothesis')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'hypothesis'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Hypothesis Dashboard
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Live Events</span>
            <span className="bg-stone-200 text-stone-800 text-[10px] px-1.5 py-0.2 rounded-full">
              {events.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feedback'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Feedback / Notes</span>
            <span className="bg-stone-200 text-stone-800 text-[10px] px-1.5 py-0.2 rounded-full">
              {feedbackList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            id="tab-backend-audit"
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backend'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Backend & Data</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'hypothesis' && (
            <div className="space-y-4 text-xs">
              {/* Core Research Questions Banner */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 space-y-2">
                <p className="font-bold text-orange-950 uppercase tracking-wider text-[10px]">
                  PS3 Research Hypotheses & Questions
                </p>
                <div className="space-y-1.5 text-stone-900 text-xs">
                  <p className="leading-snug">
                    <strong className="text-orange-900 font-semibold">Primary:</strong> "What matters most when users consider ordering from a neighbourhood home cook?" (Cook reputation, food appeal, price, proximity, delivery cost, existing demand)
                  </p>
                  <p className="leading-snug">
                    <strong className="text-orange-900 font-semibold">Secondary:</strong> "At what delivery cost are users willing to switch between self-pickup and delivery?"
                  </p>
                  <p className="leading-snug">
                    <strong className="text-orange-900 font-semibold">Third:</strong> "Does seeing nearby households already joining increase willingness to order?"
                  </p>
                </div>
              </div>

              {/* High-level metrics cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-medium">Meal Views</span>
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-black text-stone-900 font-['Outfit']">{totalViews}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">Detail screens opened</p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-medium">Join Intent</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-xl font-black text-emerald-600 font-['Outfit']">{totalJoins}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">{conversionRate}% conversion</p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-medium">Home Cook Clicks</span>
                    <Users className="w-3.5 h-3.5 text-orange-600" />
                  </div>
                  <p className="text-xl font-black text-stone-900 font-['Outfit']">{totalCookClicks}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">Cook profile & trust clicks</p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-medium">Delivery Clusters</span>
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm font-bold text-stone-900 mt-1">
                    Del: {deliveryCount} | Pick: {pickupCount}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5">Shared delivery vs Free void deck</p>
                </div>
              </div>

              {/* Research Questions Checklist */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5">
                <h3 className="font-bold text-stone-900 text-xs">Behavioral Questions Evaluated</h3>
                <ul className="space-y-2 text-stone-600 text-[11px]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span><b>Cook Trust vs Food Photo:</b> Measured via clicks on cook profile, seller reviews preview, and completed batch metrics vs meal clicks.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span><b>Delivery Cluster Social Proof:</b> Visualizing <code>👤 👤 👤 👤 + ?</code> nearby households testing if clustered demand triggers order completion.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span><b>Fulfilment Switch Threshold:</b> Logging pickup vs delivery choice under S$4.00 vs S$2.00 fee conditions with weather context.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span><b>Qualitative Factor Survey:</b> Intercepts both ordering users and abandoners to rank the 10 conversion and 9 abandonment drivers.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-3">
              {/* Event Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="text-xs bg-stone-100 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 flex-1"
                >
                  <option value="all">All Events ({events.length})</option>
                  <option value="discover_viewed">discover_viewed</option>
                  <option value="location_selected">location_selected</option>
                  <option value="home_cook_clicked">home_cook_clicked</option>
                  <option value="meal_clicked">meal_clicked</option>
                  <option value="distance_clicked">distance_clicked</option>
                  <option value="meal_drop_viewed">meal_drop_viewed</option>
                  <option value="cook_profile_clicked">cook_profile_clicked</option>
                  <option value="delivery_cluster_viewed">delivery_cluster_viewed</option>
                  <option value="customer_photos_opened">customer_photos_opened</option>
                  <option value="pickup_selected">pickup_selected</option>
                  <option value="delivery_selected">delivery_selected</option>
                  <option value="join_order_clicked">join_order_clicked</option>
                  <option value="order_joined">order_joined</option>
                  <option value="drop_abandoned">drop_abandoned</option>
                  <option value="feedback_submitted">feedback_submitted</option>
                  <option value="feedback_option_selected">feedback_option_selected</option>
                  <option value="comment_submitted">comment_submitted</option>
                </select>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-xl">
                  No events recorded yet for this filter.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-1 font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-600">{evt.event}</span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {evt.mealName && (
                        <p className="text-[11px] text-stone-700 truncate font-sans">
                          {evt.mealName} {evt.location ? `(${evt.location})` : ''}
                        </p>
                      )}
                      {evt.metadata && (
                        <pre className="text-[10px] text-stone-600 bg-white p-2 rounded border border-stone-200 overflow-x-auto">
                          {JSON.stringify(evt.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-3">
              {feedbackList.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-xl">
                  No qualitative feedback recorded yet. Join a meal drop or click back to trigger feedback prompts.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {feedbackList.map((fb) => (
                    <div
                      key={fb.id}
                      className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fb.type === 'conversion'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {fb.type === 'conversion' ? 'Conversion Factor' : 'Abandonment Reason'}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(fb.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="font-bold text-stone-900 text-sm">{fb.selectedOption}</p>

                      {fb.mealName && (
                        <p className="text-[11px] text-stone-500">Meal: {fb.mealName}</p>
                      )}

                      {fb.comment && (
                        <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-stone-700 italic text-xs mt-1">
                          "{fb.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'backend' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">System & Backend Health</h3>
                  <p className="text-xs text-stone-500">Real-time status of CoMeal PS3 data services</p>
                </div>
                <button
                  onClick={loadHealthAndBackendData}
                  disabled={healthLoading}
                  className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Status cards */}
              <div className="space-y-2.5">
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <CloudRain className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-xs">Real Singapore Weather</p>
                      <p className="text-[11px] text-stone-500">data.gov.sg (NEA 2-Hour Forecast)</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      healthData?.weatherProviderReachable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {healthData?.weatherProviderReachable ? 'REACHABLE' : 'UNREACHABLE (SAFE FALLBACK)'}
                  </span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-xs">Location & Distance Layer</p>
                      <p className="text-[11px] text-stone-500">
                        {healthData?.locationProviderConfigured
                          ? 'OneMap Routing API'
                          : 'Haversine Geographic Spherical Distance'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {healthData?.locationProviderConfigured ? 'ONEMAP ACTIVE' : 'HAVERSINE ACTIVE'}
                  </span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-xs">Server Persistent Storage</p>
                      <p className="text-[11px] text-stone-500">
                        File-based JSON storage (/data/events.json, /data/comments.json)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {healthData?.storageConfigured ? 'PERSISTING' : 'READY'}
                  </span>
                </div>
              </div>

              {/* Records audit */}
              <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-2">
                <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
                  Backend Persistent Ledger Count
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-100">
                    <p className="text-[11px] text-stone-500">Logged Events on Server</p>
                    <p className="text-base font-bold text-stone-900 font-mono">
                      {serverEventsCount !== null ? serverEventsCount : events.length}
                    </p>
                  </div>
                  <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-100">
                    <p className="text-[11px] text-stone-500">Submitted Feedback / Comments</p>
                    <p className="text-base font-bold text-stone-900 font-mono">
                      {serverCommentsCount !== null ? serverCommentsCount : feedbackList.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data transparency audit notice */}
              <div className="bg-stone-100 rounded-xl p-3 text-[11px] text-stone-600 space-y-1.5 border border-stone-200">
                <p className="font-bold text-stone-900">PS3 Data Source Transparency</p>
                <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                  <li><strong>Real External:</strong> Singapore 2-hour weather forecast from NEA / data.gov.sg API.</li>
                  <li><strong>Real Calculation:</strong> Location and distance calculated with Singapore geographic coordinates and OneMap elastic search.</li>
                  <li><strong>Marketplace Mock:</strong> Home cooks, menu items, ratings, and batch portions are curated prototype demo data.</li>
                  <li><strong>Privacy:</strong> No personal coordinates or API keys are stored in client logs.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              id="btn-copy-analytics-json"
              className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-white border border-stone-200 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={handleDownloadJson}
              id="btn-download-analytics-json"
              className="flex items-center gap-1 text-xs font-bold text-white bg-stone-900 hover:bg-orange-600 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
