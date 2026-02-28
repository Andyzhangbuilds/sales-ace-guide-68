import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { MeetingSetup } from "./PreMeetingSetup";
import SignalPanel from "@/components/SignalPanel";
import LiveTipsPanel from "@/components/LiveTipsPanel";
import ObjectionHandler from "@/components/ObjectionHandler";
import ClientSnapshot from "@/components/ClientSnapshot";
import LiveDemographics from "@/components/LiveDemographics";
import type { LiveDemographicData } from "@/components/LiveDemographics";
import LiveSummary from "@/components/LiveSummary";
import { Button } from "@/components/ui/button";
import { Square } from "lucide-react";

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

// Tips that adapt based on demographics/tone
type Tip = { id: string; text: string; priority: "high" | "medium" | "low"; time: string };

const getAdaptiveTips = (demo: LiveDemographicData): Tip[] => {
  const base: Tip[] = [
    { id: "1", text: "Reframe around security and long-term stability.", priority: "high" as const, time: "2:20" },
  ];

  if (demo.tone?.toLowerCase().includes("cautious") || demo.riskTolerance === "conservative") {
    base.push(
      { id: "2a", text: "Client seems cautious — lead with capital preservation and guaranteed returns.", priority: "high" as const, time: "3:45" },
      { id: "3a", text: "Avoid aggressive language. Emphasize safety nets and FDIC insurance.", priority: "medium" as const, time: "5:05" },
    );
  } else {
    base.push(
      { id: "2b", text: "Introduce the no-fee benefit now.", priority: "high" as const, time: "3:45" },
      { id: "3b", text: "Cross-sell opportunity: credit product.", priority: "medium" as const, time: "5:05" },
    );
  }

  if (demo.maritalStatus?.toLowerCase().includes("married") || parseInt(demo.dependents) > 0) {
    base.push(
      { id: "4", text: "Family-oriented — pivot to joint accounts, education savings, or life insurance.", priority: "high" as const, time: "6:35" },
    );
  } else {
    base.push(
      { id: "4b", text: "Client is price-sensitive — emphasize value over premium.", priority: "high" as const, time: "6:35" },
    );
  }

  if (demo.financialGoal?.toLowerCase().includes("saving")) {
    base.push({ id: "5", text: "Align with saving goals — highlight high-yield savings with no lock-in.", priority: "medium" as const, time: "8:20" });
  } else {
    base.push({ id: "5b", text: "Pivot to retirement planning — align with stated goals.", priority: "medium" as const, time: "8:20" });
  }

  return base;
};

// Objections that adapt based on demographics
const getAdaptiveObjections = (demo: LiveDemographicData) => {
  const base = [
    {
      id: "1",
      objection: "Your fees seem higher than competitors.",
      category: "price" as const,
      rebuttal: demo.tone?.toLowerCase().includes("cautious")
        ? "I understand the concern. Our fees include full portfolio management, quarterly rebalancing, and a dedicated advisor — peace of mind included."
        : "Our fee includes comprehensive portfolio management and quarterly rebalancing — services that cost extra elsewhere.",
      question: "What specific services are you comparing against?",
      alternative: demo.riskTolerance === "conservative"
        ? "Consider our no-fee savings tier — zero risk, guaranteed returns."
        : "Consider our no-fee savings tier as an entry point.",
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
  return base;
};

// Live summary points that build over time
const mockSummaryPoints = [
  { id: "s1", text: "Client expressed interest in savings rates and fee structure", time: "2:14", category: "insight" as const },
  { id: "s2", text: "Price sensitivity detected — may need value-first positioning", time: "3:42", category: "concern" as const },
  { id: "s3", text: "Long-term financial goals mentioned — potential for retirement products", time: "5:01", category: "opportunity" as const },
  { id: "s4", text: "Market volatility concern — recommend conservative product mix", time: "6:30", category: "concern" as const },
  { id: "s5", text: "Cross-sell window open for bundled credit + savings package", time: "8:15", category: "opportunity" as const },
  { id: "s6", text: "Client warming up — engagement level rising", time: "9:40", category: "insight" as const },
  { id: "s7", text: "Action: Send follow-up with fee comparison sheet", time: "10:20", category: "action" as const },
];

export default function LiveMeeting() {
  const location = useLocation();
  const navigate = useNavigate();
  const setup = (location.state as { setup: MeetingSetup } | undefined)?.setup;
  const [elapsed, setElapsed] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [visibleSignals, setVisibleSignals] = useState(0);
  const [visibleSummary, setVisibleSummary] = useState(0);
  const [demographics, setDemographics] = useState<LiveDemographicData>({
    age: setup?.clientAge || "",
    maritalStatus: "",
    dependents: "",
    profession: setup?.clientProfession || "",
    location: "",
    education: "",
    financialGoal: "",
    riskTolerance: setup?.riskProfile || "",
    tone: "",
  });

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setVisibleSignals((v) => Math.min(v + 1, mockSignals.length));
      setVisibleSummary((v) => Math.min(v + 1, mockSummaryPoints.length));
    }, 4000);
    setVisibleSignals(1);
    return () => clearInterval(interval);
  }, [isLive]);

  const handleDemoChange = useCallback((data: LiveDemographicData) => {
    setDemographics(data);
  }, []);

  const adaptiveTips = getAdaptiveTips(demographics);
  const adaptiveObjections = getAdaptiveObjections(demographics);

  // Show tips progressively
  const visibleTipCount = Math.min(Math.floor(elapsed / 8) + 1, adaptiveTips.length);

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
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="font-mono text-xs text-destructive tracking-widest uppercase">Live</span>
          </div>
          <span className="font-mono text-lg text-foreground tabular-nums">{formatTime(elapsed)}</span>
          {setup?.clientName && (
            <span className="text-sm text-muted-foreground">— {setup.clientName}</span>
          )}
        </div>
        <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5" onClick={handleEnd}>
          <Square className="w-3 h-3" />
          End & Summarize
        </Button>
      </div>

      {/* Live Tips at Top */}
      <div className="mb-3">
        <LiveTipsPanel tips={adaptiveTips.slice(0, visibleTipCount)} />
      </div>

      {/* Main Grid: Signals + Demographics | Objections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Left: Client + Demographics + Signals */}
        <div className="lg:col-span-4 space-y-3 overflow-auto">
          <ClientSnapshot setup={setup} />
          <LiveDemographics
            initialData={{
              age: setup?.clientAge || "",
              profession: setup?.clientProfession || "",
              riskTolerance: setup?.riskProfile || "",
            }}
            elapsed={elapsed}
            onChange={handleDemoChange}
          />
          <SignalPanel signals={mockSignals.slice(0, visibleSignals)} />
        </div>

        {/* Right: Objections */}
        <div className="lg:col-span-8 overflow-auto">
          <ObjectionHandler objections={adaptiveObjections} />
        </div>
      </div>

      {/* Live Summary at Bottom */}
      <div className="mt-3">
        <LiveSummary points={mockSummaryPoints.slice(0, visibleSummary)} />
      </div>
    </div>
  );
}
