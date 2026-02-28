import { Lightbulb, AlertCircle, ArrowUpRight } from "lucide-react";

interface Tip {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  time: string;
}

export default function LiveTipsPanel({ tips }: { tips: Tip[] }) {
  const priorityStyles = {
    high: "border-l-primary bg-primary/5",
    medium: "border-l-signal-warm bg-signal-warm/5",
    low: "border-l-muted-foreground bg-muted/50",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase">
          Live Sales Tips
        </h3>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[10px] text-primary">ACTIVE</span>
        </div>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => (
          <div
            key={tip.id}
            className={`p-4 rounded-md border-l-2 border border-border ${priorityStyles[tip.priority]} animate-fade-in`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {tip.priority === "high" ? (
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Lightbulb className="w-4 h-4 signal-warm mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-sm text-foreground font-medium">{tip.text}</p>
                  <span className="font-mono text-[10px] text-muted-foreground mt-1 block">
                    {tip.priority.toUpperCase()} PRIORITY • {tip.time}
                  </span>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </div>
          </div>
        ))}

        {tips.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">AI is analyzing the conversation...</p>
          </div>
        )}
      </div>
    </div>
  );
}
