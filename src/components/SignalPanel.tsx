import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Heart } from "lucide-react";

interface Signal {
  type: "buying" | "resistance" | "emotional";
  text: string;
  time: string;
}

export default function SignalPanel({ signals }: { signals: Signal[] }) {
  const iconMap = {
    buying: <TrendingUp className="w-3.5 h-3.5 text-primary" />,
    resistance: <TrendingDown className="w-3.5 h-3.5 signal-cold" />,
    emotional: <Heart className="w-3.5 h-3.5 signal-warm" />,
  };

  const labelMap = {
    buying: "BUY SIGNAL",
    resistance: "RESISTANCE",
    emotional: "EMOTIONAL",
  };

  const colorMap = {
    buying: "bg-signal-hot border-signal-hot",
    resistance: "bg-signal-cold border-signal-cold",
    emotional: "bg-signal-warm border-signal-warm",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">
        Signal Detection
      </h3>
      <div className="space-y-2">
        {signals.map((signal, i) => (
          <div key={i} className={`p-3 rounded-md border ${colorMap[signal.type]} animate-fade-in`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {iconMap[signal.type]}
                <span className="font-mono text-[10px] tracking-wider">
                  {labelMap[signal.type]}
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{signal.time}</span>
            </div>
            <p className="text-xs text-foreground/80">{signal.text}</p>
          </div>
        ))}
        {signals.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Listening for signals...</p>
        )}
      </div>
    </div>
  );
}
