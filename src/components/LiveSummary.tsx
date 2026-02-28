import { FileText } from "lucide-react";

interface SummaryPoint {
  id: string;
  text: string;
  time: string;
  category: "insight" | "action" | "concern" | "opportunity";
}

const categoryStyles: Record<string, string> = {
  insight: "text-primary",
  action: "signal-info",
  concern: "signal-warm",
  opportunity: "signal-hot",
};

const categoryDots: Record<string, string> = {
  insight: "bg-primary",
  action: "bg-[hsl(var(--signal-info))]",
  concern: "bg-[hsl(var(--signal-warm))]",
  opportunity: "bg-primary",
};

export default function LiveSummary({ points }: { points: SummaryPoint[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Live Meeting Summary
          </h3>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{points.length} points</span>
      </div>

      {points.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Summary will populate as the meeting progresses...</p>
      ) : (
        <ul className="space-y-1.5">
          {points.map((pt) => (
            <li key={pt.id} className="flex items-start gap-2 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${categoryDots[pt.category]}`} />
              <span className="text-foreground">{pt.text}</span>
              <span className="font-mono text-[10px] text-muted-foreground ml-auto shrink-0">{pt.time}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
