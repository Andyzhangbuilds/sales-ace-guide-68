import type { MeetingSetup } from "@/pages/PreMeetingSetup";
import { User, Briefcase, Shield } from "lucide-react";

export default function ClientSnapshot({ setup }: { setup?: MeetingSetup }) {
  if (!setup) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">
        Client Snapshot
      </h3>
      <div className="space-y-2 text-xs">
        {setup.clientName && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground font-medium">{setup.clientName}</span>
          </div>
        )}
        {setup.clientProfession && (
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{setup.clientProfession}</span>
          </div>
        )}
        {setup.riskProfile && (
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground capitalize">{setup.riskProfile} risk</span>
          </div>
        )}
        {setup.clientIncome && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="w-3.5 text-center font-mono">$</span>
            <span>{setup.clientIncome}</span>
          </div>
        )}
        {setup.products.length > 0 && (
          <div className="pt-2 border-t border-border mt-2">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">PRODUCTS</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {setup.products.map((p) => (
                <span key={p} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-mono">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
