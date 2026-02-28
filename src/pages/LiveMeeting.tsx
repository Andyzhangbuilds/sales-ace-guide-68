import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { MeetingSetup } from "./PreMeetingSetup";
import SignalPanel from "@/components/SignalPanel";
import LiveTipsPanel from "@/components/LiveTipsPanel";
import ObjectionHandler from "@/components/ObjectionHandler";
import MeetingTimeline from "@/components/MeetingTimeline";
import ClientSnapshot from "@/components/ClientSnapshot";
import { Button } from "@/components/ui/button";
import { Radio, Square, FileText } from "lucide-react";

export interface TimelineEvent {
  id: string;
  time: string;
  type: "tip" | "objection" | "signal" | "action";
  content: string;
}

const mockSignals = [
  { type: "buying" as const, text: "Client asked about rates — interest detected", time: "2:14" },
  { type: "resistance" as const, text: "Hesitation on fee structure — price sensitivity", time: "3:42" },
  { type: "buying" as const, text: "Mentioned long-term goals — upsell window", time: "5:01" },
  { type: "emotional" as const, text: "Expressed concern about market volatility", time: "6:30" },
  { type: "buying" as const, text: "Asked about bundling options — cross-sell ready", time: "8:15" },
];

const mockTips = [
  { id: "1", text: "Reframe around security and long-term stability.", priority: "high" as const, time: "2:20" },
  { id: "2", text: "Introduce the no-fee benefit now.", priority: "high" as const, time: "3:45" },
  { id: "3", text: "Cross-sell opportunity: credit product.", priority: "medium" as const, time: "5:05" },
  { id: "4", text: "Client is price-sensitive — emphasize value over premium.", priority: "high" as const, time: "6:35" },
  { id: "5", text: "Pivot to retirement planning — align with stated goals.", priority: "medium" as const, time: "8:20" },
];

const mockObjections = [
  {
    id: "1",
    objection: "Your fees seem higher than competitors.",
    category: "price" as const,
    rebuttal: "Our fee includes comprehensive portfolio management and quarterly rebalancing — services that cost extra elsewhere.",
    question: "What specific services are you comparing against?",
    alternative: "Consider our no-fee savings tier as an entry point.",
  },
  {
    id: "2",
    objection: "I'm not sure I trust digital-first banks.",
    category: "trust" as const,
    rebuttal: "We're FDIC insured with $2B+ in deposits. Our platform combines fintech speed with institutional-grade security.",
    question: "What would help you feel more confident about the security of your funds?",
    alternative: "We can arrange a call with our compliance team.",
  },
];

export default function LiveMeeting() {
  const location = useLocation();
  const navigate = useNavigate();
  const setup = (location.state as { setup: MeetingSetup } | undefined)?.setup;
  const [elapsed, setElapsed] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [visibleSignals, setVisibleSignals] = useState(0);
  const [visibleTips, setVisibleTips] = useState(0);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Simulate signals appearing over time
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setVisibleSignals((v) => Math.min(v + 1, mockSignals.length));
      setVisibleTips((v) => Math.min(v + 1, mockTips.length));
    }, 4000);
    // Show first immediately
    setVisibleSignals(1);
    setVisibleTips(1);
    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleEnd = () => {
    setIsLive(false);
    navigate("/summary", { state: { setup } });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="font-mono text-xs text-destructive tracking-widest uppercase">Live</span>
          </div>
          <span className="font-mono text-lg text-foreground tabular-nums">{formatTime(elapsed)}</span>
          {setup?.clientName && (
            <span className="text-sm text-muted-foreground">
              — {setup.clientName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5" onClick={handleEnd}>
            <Square className="w-3 h-3" />
            End & Summarize
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        {/* Left: Signals + Client */}
        <div className="lg:col-span-3 space-y-4 overflow-auto">
          <ClientSnapshot setup={setup} />
          <SignalPanel signals={mockSignals.slice(0, visibleSignals)} />
        </div>

        {/* Center: Live Tips */}
        <div className="lg:col-span-5 overflow-auto">
          <LiveTipsPanel tips={mockTips.slice(0, visibleTips)} />
        </div>

        {/* Right: Objections */}
        <div className="lg:col-span-4 overflow-auto">
          <ObjectionHandler objections={mockObjections} />
        </div>
      </div>
    </div>
  );
}
