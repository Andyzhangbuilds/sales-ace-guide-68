import { useState, useEffect } from "react";
import { User, Briefcase, MapPin, GraduationCap, Heart, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface LiveDemographicData {
  age: string;
  maritalStatus: string;
  dependents: string;
  profession: string;
  location: string;
  education: string;
  financialGoal: string;
  riskTolerance: string;
  tone: string;
}

const defaultData: LiveDemographicData = {
  age: "",
  maritalStatus: "",
  dependents: "",
  profession: "",
  location: "",
  education: "",
  financialGoal: "",
  riskTolerance: "",
  tone: "",
};

// Simulated AI autofill — gradually fills in fields as meeting progresses
const autofillSequence: Partial<LiveDemographicData>[] = [
  { tone: "Cautious" },
  { financialGoal: "Long-term savings" },
  { riskTolerance: "moderate" },
  { maritalStatus: "Married" },
  { dependents: "2" },
  { education: "Bachelor's" },
  { location: "Suburban" },
];

interface Props {
  initialData?: Partial<LiveDemographicData>;
  elapsed: number;
  onChange?: (data: LiveDemographicData) => void;
}

export default function LiveDemographics({ initialData, elapsed, onChange }: Props) {
  const [data, setData] = useState<LiveDemographicData>({
    ...defaultData,
    ...initialData,
  });

  // AI autofill simulation — fills one field every ~12 seconds
  useEffect(() => {
    const idx = Math.min(Math.floor(elapsed / 12), autofillSequence.length - 1);
    if (elapsed > 5) {
      setData((prev) => {
        const updates: Partial<LiveDemographicData> = {};
        for (let i = 0; i <= idx; i++) {
          const entry = autofillSequence[i];
          for (const [key, value] of Object.entries(entry)) {
            const k = key as keyof LiveDemographicData;
            if (!prev[k]) {
              updates[k] = value;
            }
          }
        }
        if (Object.keys(updates).length === 0) return prev;
        const next = { ...prev, ...updates };
        onChange?.(next);
        return next;
      });
    }
  }, [elapsed, onChange]);

  const update = (field: keyof LiveDemographicData, value: string) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      onChange?.(next);
      return next;
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase">
          Client Demographics
        </h3>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[10px] text-primary">AI AUTOFILL</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Age</Label>
          <Input
            value={data.age}
            onChange={(e) => update("age", e.target.value)}
            placeholder="—"
            className="bg-background border-border h-7 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Tone</Label>
          <Input
            value={data.tone}
            onChange={(e) => update("tone", e.target.value)}
            placeholder="Detecting..."
            className="bg-background border-border h-7 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Profession</Label>
          <Input
            value={data.profession}
            onChange={(e) => update("profession", e.target.value)}
            placeholder="—"
            className="bg-background border-border h-7 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Marital Status</Label>
          <Input
            value={data.maritalStatus}
            onChange={(e) => update("maritalStatus", e.target.value)}
            placeholder="—"
            className="bg-background border-border h-7 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Dependents</Label>
          <Input
            value={data.dependents}
            onChange={(e) => update("dependents", e.target.value)}
            placeholder="—"
            className="bg-background border-border h-7 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Risk Tolerance</Label>
          <Select value={data.riskTolerance} onValueChange={(v) => update("riskTolerance", v)}>
            <SelectTrigger className="bg-background border-border h-7 text-xs mt-0.5">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Financial Goal</Label>
          <Input
            value={data.financialGoal}
            onChange={(e) => update("financialGoal", e.target.value)}
            placeholder="Detecting..."
            className="bg-background border-border h-7 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground font-mono">Location</Label>
          <Input
            value={data.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="—"
            className="bg-background border-border h-7 text-xs mt-0.5"
          />
        </div>
      </div>
    </div>
  );
}
