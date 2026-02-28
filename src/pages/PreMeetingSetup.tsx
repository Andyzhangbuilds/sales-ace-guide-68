import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Target, Users, DollarSign, ArrowRight, Radio } from "lucide-react";

const PRODUCTS = [
  "High-Yield Savings",
  "Credit Cards",
  "Personal Loans",
  "Investment Portfolios",
  "Retirement Accounts",
  "Business Lending",
  "Wealth Management",
  "Insurance Products",
];

export interface MeetingSetup {
  products: string[];
  customerSegment: string;
  clientName: string;
  clientAge: string;
  clientIncome: string;
  clientProfession: string;
  riskProfile: string;
  revenueTarget: string;
  notes: string;
}

const defaultSetup: MeetingSetup = {
  products: [],
  customerSegment: "",
  clientName: "",
  clientAge: "",
  clientIncome: "",
  clientProfession: "",
  riskProfile: "",
  revenueTarget: "",
  notes: "",
};

export default function PreMeetingSetup() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<MeetingSetup>(defaultSetup);

  const toggleProduct = (product: string) => {
    setSetup((prev) => ({
      ...prev,
      products: prev.products.includes(product)
        ? prev.products.filter((p) => p !== product)
        : [...prev.products, product],
    }));
  };

  const handleStart = () => {
    navigate("/live", { state: { setup } });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-slow" />
            <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
              Sales Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-foreground">
            Pre-Meeting Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your meeting parameters for AI-powered guidance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">
                Product Offerings
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCTS.map((product) => (
                <label
                  key={product}
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all text-sm ${
                    setup.products.includes(product)
                      ? "border-primary/50 bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <Checkbox
                    checked={setup.products.includes(product)}
                    onCheckedChange={() => toggleProduct(product)}
                  />
                  {product}
                </label>
              ))}
            </div>
          </div>

          {/* Client Demographics */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">
                Client Demographics
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Client Name</Label>
                <Input
                  value={setup.clientName}
                  onChange={(e) => setSetup({ ...setup, clientName: e.target.value })}
                  placeholder="e.g., John Martinez"
                  className="bg-background border-border mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Age</Label>
                  <Input
                    value={setup.clientAge}
                    onChange={(e) => setSetup({ ...setup, clientAge: e.target.value })}
                    placeholder="34"
                    className="bg-background border-border mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Income Range</Label>
                  <Select value={setup.clientIncome} onValueChange={(v) => setSetup({ ...setup, clientIncome: v })}>
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<50k">Under $50K</SelectItem>
                      <SelectItem value="50k-100k">$50K–$100K</SelectItem>
                      <SelectItem value="100k-250k">$100K–$250K</SelectItem>
                      <SelectItem value="250k+">$250K+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Profession</Label>
                <Input
                  value={setup.clientProfession}
                  onChange={(e) => setSetup({ ...setup, clientProfession: e.target.value })}
                  placeholder="e.g., Software Engineer"
                  className="bg-background border-border mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Risk Profile</Label>
                <Select value={setup.riskProfile} onValueChange={(v) => setSetup({ ...setup, riskProfile: v })}>
                  <SelectTrigger className="bg-background border-border mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Meeting Goals */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">
                Meeting Goals
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Customer Segment</Label>
                <Select value={setup.customerSegment} onValueChange={(v) => setSetup({ ...setup, customerSegment: v })}>
                  <SelectTrigger className="bg-background border-border mt-1">
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail Banking</SelectItem>
                    <SelectItem value="hnw">High Net Worth</SelectItem>
                    <SelectItem value="sme">Small Business</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="student">Student / Early Career</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Revenue Target</Label>
                <Input
                  value={setup.revenueTarget}
                  onChange={(e) => setSetup({ ...setup, revenueTarget: e.target.value })}
                  placeholder="e.g., $5,000 / month"
                  className="bg-background border-border mt-1"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">
                Additional Notes
              </h2>
            </div>
            <Textarea
              value={setup.notes}
              onChange={(e) => setSetup({ ...setup, notes: e.target.value })}
              placeholder="Any prior interactions, known objections, or special considerations..."
              className="bg-background border-border min-h-[140px] text-sm"
            />
          </div>
        </div>

        {/* Selected Products Summary */}
        {setup.products.length > 0 && (
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">LOADED:</span>
            {setup.products.map((p) => (
              <Badge key={p} variant="secondary" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                {p}
              </Badge>
            ))}
          </div>
        )}

        {/* Start Button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleStart}
            disabled={setup.products.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono gap-2 px-6 glow-primary"
          >
            <Radio className="w-4 h-4" />
            Start Live Session
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
