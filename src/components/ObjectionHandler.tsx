import { Shield, MessageSquare, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Objection {
  id: string;
  objection: string;
  category: "price" | "trust" | "complexity" | "risk" | "timing";
  rebuttal: string;
  question: string;
  alternative: string;
}

const categoryColors: Record<string, string> = {
  price: "bg-signal-cold/20 text-signal-cold",
  trust: "bg-signal-warm/20 text-signal-warm",
  complexity: "bg-signal-info/20 text-signal-info",
  risk: "bg-signal-cold/20 text-signal-cold",
  timing: "bg-signal-warm/20 text-signal-warm",
};

export default function ObjectionHandler({ objections }: { objections: Objection[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 signal-cold" />
        <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase">
          Objection Handler
        </h3>
      </div>

      <div className="space-y-4">
        {objections.map((obj) => (
          <div key={obj.id} className="border border-border rounded-md overflow-hidden animate-fade-in">
            {/* Objection */}
            <div className="p-3 bg-destructive/5 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`${categoryColors[obj.category]} border-0 font-mono text-[10px]`}>
                  {obj.category.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-foreground italic">"{obj.objection}"</p>
            </div>

            {/* Rebuttal */}
            <div className="p-3 space-y-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <span className="font-mono text-[10px] text-primary">REBUTTAL</span>
                </div>
                <p className="text-xs text-foreground">{obj.rebuttal}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 signal-info" />
                  <span className="font-mono text-[10px] signal-info">REGAIN CONTROL</span>
                </div>
                <p className="text-xs text-muted-foreground italic">"{obj.question}"</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <RefreshCw className="w-3 h-3 signal-warm" />
                  <span className="font-mono text-[10px] signal-warm">ALTERNATIVE</span>
                </div>
                <p className="text-xs text-muted-foreground">{obj.alternative}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
