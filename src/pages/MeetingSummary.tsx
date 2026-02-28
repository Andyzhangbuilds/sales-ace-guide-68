import { useLocation, useNavigate } from "react-router-dom";
import type { MeetingSetup } from "./PreMeetingSetup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, User, Target, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";

export default function MeetingSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const setup = (location.state as { setup: MeetingSetup } | undefined)?.setup;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-signal-warm" />
              <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                Meeting Complete
              </span>
            </div>
            <h1 className="text-2xl font-mono font-bold text-foreground">
              Post-Meeting Summary
            </h1>
            {setup?.clientName && (
              <p className="text-sm text-muted-foreground mt-1">Client: {setup.clientName}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5" onClick={() => navigate("/")}>
              <ArrowLeft className="w-3 h-3" />
              New Meeting
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Client Profile */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">Client Profile Summary</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Financial Goals</span>
                <span className="text-foreground">Long-term wealth building, retirement</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Tolerance</span>
                <Badge className="bg-signal-warm/20 text-signal-warm border-0 font-mono text-xs">
                  {setup?.riskProfile || "Moderate"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Main Concerns</span>
                <span className="text-foreground">Fees, market volatility</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Decision Readiness</span>
                <Badge className="bg-signal-warm/20 text-signal-warm border-0 font-mono text-xs">
                  WARM
                </Badge>
              </div>
            </div>
          </div>

          {/* Pain Points */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 signal-cold" />
              <h2 className="font-mono text-sm font-semibold text-foreground">Pain Point Breakdown</h2>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-signal-cold/5 border border-signal-cold/10">
                <div className="text-xs font-mono text-destructive mb-1">PRIMARY</div>
                <p className="text-sm text-foreground">Fee transparency — client compared with competitor offerings</p>
              </div>
              <div className="p-3 rounded-md bg-signal-warm/5 border border-signal-warm/10">
                <div className="text-xs font-mono signal-warm mb-1">SECONDARY</div>
                <p className="text-sm text-foreground">Market volatility concerns — risk-averse tendencies</p>
              </div>
              <div className="p-3 rounded-md bg-signal-info/5 border border-signal-info/0">
                <div className="text-xs font-mono signal-info mb-1">EMOTIONAL</div>
                <p className="text-sm text-foreground">Trust deficit with digital-first platforms</p>
              </div>
            </div>
          </div>

          {/* Revenue Opportunity */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">Revenue Opportunity</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Best-Fit Product</span>
                <span className="text-primary font-mono">High-Yield Savings</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cross-Sell</span>
                <span className="text-foreground">Credit Card (no annual fee)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Onboarding Probability</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="w-[72%] h-full rounded-full bg-primary" />
                  </div>
                  <span className="font-mono text-primary text-xs">72%</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Follow-Up Strategy</span>
                <span className="text-foreground">Fee comparison sheet + 48hr callback</span>
              </div>
            </div>
          </div>

          {/* Next Best Action */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <ChevronRight className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">Next Best Action</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-md bg-primary/5 border border-primary/10">
                <div className="text-xs font-mono text-primary mb-1">FOLLOW-UP MESSAGE</div>
                <p className="text-foreground">"Thank you for your time today. I've prepared a detailed fee comparison showing how our all-inclusive model saves you $X/year."</p>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timeline</span>
                <span className="text-foreground">Follow up within 48 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Additional Info Needed</span>
                <span className="text-foreground">Current portfolio breakdown</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Positioning</span>
                <span className="text-foreground">Value + security over premium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Notes */}
        <div className="mt-6 bg-card border border-border rounded-lg p-5">
          <h2 className="font-mono text-sm font-semibold text-foreground mb-3">Performance Optimization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Missed Opportunity", text: "Could have introduced credit product earlier at 5:01 mark when client mentioned bundling interest." },
              { label: "Phrasing", text: "Instead of 'our fees are competitive,' try 'your total cost of ownership is lower because we bundle X, Y, Z.'" },
              { label: "Behavioral", text: "Slow down pacing during objection handling. Allow 2-second pauses for client processing." },
              { label: "Upsell Timing", text: "Retirement planning pitch was well-timed at 8:20. Could add wealth management as tier-2 follow-up." },
            ].map((note) => (
              <div key={note.label} className="p-3 rounded-md bg-muted/50 border border-border">
                <div className="text-xs font-mono text-primary mb-1">{note.label.toUpperCase()}</div>
                <p className="text-sm text-muted-foreground">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
