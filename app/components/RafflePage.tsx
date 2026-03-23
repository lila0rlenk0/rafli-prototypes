"use client";

import { useState, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bundle {
  tickets: string;
  price: string;
  priceIsAuto: boolean;
}

interface TicketFields {
  prizeValue: string;
  pricePerTicket: string;
  numberOfWinners: string;
  minParticipants: string;
  maxParticipants: string;
}

interface Recommendation {
  label: string;
  value: string;
  detail: string;
  type: "info" | "warning" | "success";
}

interface Warning {
  message: string;
  severity: "caution" | "danger";
}

interface FillProbability {
  pct: number;
  label: string;
  color: string;
  bgColor: string;
}

const DEFAULT_BUNDLES: Bundle[] = [
  { tickets: "1", price: "", priceIsAuto: true },
  { tickets: "5", price: "", priceIsAuto: true },
  { tickets: "10", price: "", priceIsAuto: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(v: string): number {
  const n = parseFloat(v.replace(/[$,]/g, ""));
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmt(n: number, prefix = "$"): string {
  if (n <= 0) return "—";
  return `${prefix}${n % 1 === 0 ? n.toLocaleString() : n.toFixed(2)}`;
}

function fmtNum(n: number): string {
  if (n <= 0) return "—";
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(1);
}

/** Returns the optimal per-ticket price given prize + participants */
function optimalPerTicket(prize: number, maxP: number, minP: number, ticketPrice: number): number {
  if (ticketPrice > 0) return ticketPrice;
  if (maxP > 0 && prize > 0) return parseFloat(((prize * 1.2) / maxP).toFixed(2));
  if (minP > 0 && prize > 0) return parseFloat(((prize * 1.2) / minP).toFixed(2));
  return 0;
}

function computeRecommendations(f: TicketFields, bundles: Bundle[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const prize = num(f.prizeValue);
  const ticketPrice = num(f.pricePerTicket);
  const winners = num(f.numberOfWinners);
  const minP = num(f.minParticipants);
  const maxP = num(f.maxParticipants);

  if (prize <= 0) return recs;

  if (ticketPrice > 0) {
    const breakEvenParticipants = Math.ceil(prize / ticketPrice);
    const profitableParticipants = Math.ceil((prize * 1.2) / ticketPrice);
    recs.push({
      label: "Recommended max participants",
      value: fmtNum(profitableParticipants),
      detail: `At $${ticketPrice}/ticket — ${breakEvenParticipants} to break even, ${profitableParticipants} for ~20% margin`,
      type: "info",
    });
  }

  if (minP > 0) {
    const profitPrice = (prize * 1.2) / minP;
    recs.push({
      label: "Min-participants ticket price",
      value: fmt(parseFloat(profitPrice.toFixed(2))),
      detail: `With only ${minP} participants, charge this per ticket to cover prize + margin`,
      type: "warning",
    });
  }

  if (maxP > 0) {
    const profitPrice = (prize * 1.2) / maxP;
    recs.push({
      label: "Optimal ticket price",
      value: fmt(parseFloat(profitPrice.toFixed(2))),
      detail: `Sell to ${maxP} participants at this price to cover prize + 20% profit`,
      type: "success",
    });
  }

  if (winners > 0 && ticketPrice > 0 && maxP > 0) {
    const totalRevenue = ticketPrice * maxP;
    const prizePerWinner = prize / winners;
    const isProfit = totalRevenue > prize;
    recs.push({
      label: `Prize per winner (${winners} winner${winners > 1 ? "s" : ""})`,
      value: fmt(prizePerWinner),
      detail: isProfit
        ? `Revenue ${fmt(totalRevenue)} covers prize ${fmt(prize)} — profit: ${fmt(totalRevenue - prize)}`
        : `Revenue ${fmt(totalRevenue)} < prize ${fmt(prize)} — raise ticket price or add participants`,
      type: isProfit ? "success" : "warning",
    });
  }

  // Bundle revenue summary
  const basePrice = optimalPerTicket(prize, maxP, minP, ticketPrice);
  if (basePrice > 0) {
    bundles.forEach((b, i) => {
      const t = num(b.tickets);
      if (t > 0) {
        const bPrice = num(b.price) || parseFloat((basePrice * t).toFixed(2));
        recs.push({
          label: `Bundle ${i + 1} — ${t} ticket${t > 1 ? "s" : ""}`,
          value: fmt(bPrice),
          detail: `${fmt(bPrice / t)}/ticket · savings vs single: ${fmt(bPrice - basePrice * t) === "—" ? "none" : fmt(basePrice * t - bPrice)}`,
          type: "info",
        });
      }
    });
  }

  return recs;
}

function computeWarnings(f: TicketFields): Warning[] {
  const warnings: Warning[] = [];
  const prize = num(f.prizeValue);
  const ticketPrice = num(f.pricePerTicket);
  const winners = num(f.numberOfWinners);
  const minP = num(f.minParticipants);
  const maxP = num(f.maxParticipants);

  if (prize <= 0) return warnings;

  // Min > Max
  if (minP > 0 && maxP > 0 && minP > maxP) {
    warnings.push({ message: "Min participants exceeds max — raffle can never fill.", severity: "danger" });
  }

  if (ticketPrice > 0 && maxP > 0) {
    const optPrice = (prize * 1.2) / maxP;
    const ratio = ticketPrice / optPrice;
    const totalRevenue = ticketPrice * maxP;

    if (ratio > 3) {
      warnings.push({
        message: `Ticket price $${ticketPrice} is ${ratio.toFixed(1)}× the optimal $${optPrice.toFixed(2)} — participants are very unlikely to join at this price.`,
        severity: "danger",
      });
    } else if (ratio > 1.6) {
      warnings.push({
        message: `Ticket price is above the recommended range. Consider lowering to around $${optPrice.toFixed(2)} for better participation.`,
        severity: "caution",
      });
    }

    if (totalRevenue < prize) {
      warnings.push({
        message: `Even at max participants, revenue ${fmt(totalRevenue)} won't cover the prize ${fmt(prize)}. Raise the ticket price.`,
        severity: "danger",
      });
    } else if (totalRevenue < prize * 1.1) {
      warnings.push({
        message: `Profit margin is razor-thin (~${(((totalRevenue - prize) / prize) * 100).toFixed(0)}%). Consider raising the price slightly.`,
        severity: "caution",
      });
    }

    if (totalRevenue > prize * 6) {
      warnings.push({
        message: `Potential revenue ${fmt(totalRevenue)} is ${(totalRevenue / prize).toFixed(1)}× the prize value. Participants may see this as unfair — consider a lower price.`,
        severity: "caution",
      });
    }
  }

  if (winners > 0 && maxP > 0) {
    if (winners >= maxP) {
      warnings.push({ message: `${winners} winners with max ${maxP} participants means everyone wins — no raffle excitement.`, severity: "danger" });
    } else if (winners > maxP * 0.4) {
      warnings.push({
        message: `${winners} winners out of ${maxP} max participants (${Math.round((winners / maxP) * 100)}%) is unusually high and may reduce interest.`,
        severity: "caution",
      });
    }
  }

  if (ticketPrice > 0 && prize > 0 && ticketPrice >= prize) {
    warnings.push({
      message: `Ticket price $${ticketPrice} equals or exceeds the prize value $${prize} — no participant would buy.`,
      severity: "danger",
    });
  }

  return warnings;
}

function computeFillProbability(f: TicketFields): FillProbability | null {
  const prize = num(f.prizeValue);
  const ticketPrice = num(f.pricePerTicket);
  const maxP = num(f.maxParticipants);

  if (prize <= 0 || ticketPrice <= 0 || maxP <= 0) return null;

  const totalRevenue = ticketPrice * maxP;
  const ratio = totalRevenue / (prize * 1.2);

  let pct: number;
  if (ratio >= 2.5) pct = 96;
  else if (ratio >= 1.8) pct = 88;
  else if (ratio >= 1.3) pct = 74;
  else if (ratio >= 1.0) pct = 55;
  else if (ratio >= 0.7) pct = 32;
  else pct = 14;

  if (pct >= 80) return { pct, label: "High", color: "#16a34a", bgColor: "#dcfce7" };
  if (pct >= 60) return { pct, label: "Moderate", color: "#ca8a04", bgColor: "#fef9c3" };
  if (pct >= 35) return { pct, label: "Low", color: "#ea580c", bgColor: "#ffedd5" };
  return { pct, label: "Very Low", color: "#dc2626", bgColor: "#fee2e2" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      <label className="font-medium text-[18px] leading-[1.5] text-[#23262f]" style={{ fontFamily: "Geist, sans-serif" }}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] text-[16px] select-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "—"}
          className={`
            w-full h-[44px] bg-white border border-[#e5e5e5] rounded-[8px]
            text-[16px] text-[#0f0f0f] placeholder:text-[#737373]
            px-3 py-1 outline-none
            focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f]
            transition-colors
            ${prefix ? "pl-7" : ""}
          `}
          style={{ fontFamily: "Geist, sans-serif" }}
        />
      </div>
      {hint && <p className="text-[13px] text-[#737373]">{hint}</p>}
    </div>
  );
}

function Banner({
  children,
  variant = "yellow",
}: {
  children: React.ReactNode;
  variant?: "yellow" | "blue";
}) {
  const colors = { yellow: "bg-[#feffe3]", blue: "bg-[#e1f8ff]" };
  const icons = {
    yellow: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#b5a200" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#b5a200" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
    blue: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#0ea5e9" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-4 rounded-[8px] ${colors[variant]}`}>
      <span className="shrink-0">{icons[variant]}</span>
      <span className="text-[14px] text-black" style={{ fontFamily: "Geist, sans-serif" }}>{children}</span>
    </div>
  );
}

function RecommendationBadge({ type }: { type: "info" | "warning" | "success" }) {
  const map = {
    info: "bg-[#e1f8ff] text-[#0ea5e9]",
    warning: "bg-[#feffe3] text-[#b5a200]",
    success: "bg-[#e7fef0] text-[#16a34a]",
  };
  const icons = { info: "ℹ", warning: "⚠", success: "✓" };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 ${map[type]}`}>
      {icons[type]}
    </span>
  );
}

// ─── BundleRow ────────────────────────────────────────────────────────────────

function BundleRow({
  index,
  bundle,
  suggestedPrice,
  onTicketsChange,
  onPriceChange,
}: {
  index: number;
  bundle: Bundle;
  suggestedPrice: number;
  onTicketsChange: (v: string) => void;
  onPriceChange: (v: string) => void;
}) {
  const displayPrice = bundle.priceIsAuto && suggestedPrice > 0
    ? suggestedPrice.toFixed(2)
    : bundle.price;

  return (
    <div className="flex items-end gap-4 p-4 bg-[#f9f8f4] rounded-[12px] border border-[#e5e5e5]">
      <div className="flex flex-col gap-1 w-[90px] shrink-0">
        <span className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">Bundle {index + 1}</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#0f0f0f]" />
          <span className="text-[13px] text-[#0f0f0f] font-medium">
            {num(bundle.tickets) > 0 ? `${bundle.tickets} ticket${num(bundle.tickets) > 1 ? "s" : ""}` : "—"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <label className="text-[13px] font-medium text-[#737373]">Tickets in bundle</label>
        <input
          type="number"
          min="1"
          value={bundle.tickets}
          onChange={(e) => onTicketsChange(e.target.value)}
          placeholder="e.g. 5"
          className="h-[40px] bg-white border border-[#e5e5e5] rounded-[8px] px-3 text-[15px] text-[#0f0f0f] placeholder:text-[#b0b0b0] outline-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f] transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        />
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-medium text-[#737373]">Bundle price</label>
          {bundle.priceIsAuto && suggestedPrice > 0 && (
            <span className="text-[11px] bg-[#e7fef0] text-[#16a34a] rounded-full px-2 py-0.5 font-semibold">
              suggested
            </span>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] text-[14px] select-none">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={displayPrice}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder={suggestedPrice > 0 ? suggestedPrice.toFixed(2) : "e.g. 25"}
            className="w-full h-[40px] bg-white border border-[#e5e5e5] rounded-[8px] pl-7 pr-3 text-[15px] text-[#0f0f0f] placeholder:text-[#b0b0b0] outline-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f] transition-colors"
            style={{ fontFamily: "Geist, sans-serif" }}
          />
        </div>
      </div>

      {num(bundle.tickets) > 0 && (num(bundle.price) > 0 || suggestedPrice > 0) && (
        <div className="flex flex-col gap-1 items-end shrink-0 pb-1">
          <span className="text-[11px] text-[#737373]">per ticket</span>
          <span className="text-[14px] font-semibold text-[#0f0f0f]">
            {fmt((num(bundle.price) || suggestedPrice) / num(bundle.tickets))}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({
  recs,
  warnings,
  fillProb,
  onApplyOptimalPrice,
  onApplyRecommendedMax,
  onResetBundles,
}: {
  recs: Recommendation[];
  warnings: Warning[];
  fillProb: FillProbability | null;
  onApplyOptimalPrice: () => void;
  onApplyRecommendedMax: () => void;
  onResetBundles: () => void;
}) {
  const hasContent = recs.length > 0 || warnings.length > 0 || fillProb !== null;

  if (!hasContent) {
    return (
      <div className="w-[260px] shrink-0">
        <div className="sticky top-[24px]">
          <div className="bg-white rounded-[20px] border border-[#e5e5e5] p-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-[#f0f0f0] rounded-full flex items-center justify-center">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M12 21v-1m4.243-1.757l-.707-.707M6.757 17.243l-.707.707M17.243 6.757l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#0f0f0f]">Smart Calculator</p>
              <p className="text-[12px] text-[#737373] mt-1 leading-relaxed">
                Enter your <strong>Prize Value</strong> to see real-time recommendations, fill probability, and warnings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0">
      <div className="sticky top-[24px] flex flex-col gap-3">

        {/* ── Warnings ── */}
        {warnings.length > 0 && (
          <div className="flex flex-col gap-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`rounded-[14px] px-4 py-3 flex gap-3 items-start border ${
                  w.severity === "danger"
                    ? "bg-[#fff1f1] border-[#fca5a5]"
                    : "bg-[#fffbeb] border-[#fcd34d]"
                }`}
              >
                <span className="shrink-0 mt-0.5">
                  {w.severity === "danger" ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#ca8a04" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round"/></svg>
                  )}
                </span>
                <p className={`text-[12px] leading-relaxed ${w.severity === "danger" ? "text-[#991b1b]" : "text-[#92400e]"}`}>
                  {w.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Fill Probability ── */}
        {fillProb && (
          <div className="bg-white rounded-[20px] border border-[#e5e5e5] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-[#0f0f0f]">Fill Probability</span>
              <span
                className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: fillProb.bgColor, color: fillProb.color }}
              >
                {fillProb.label}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${fillProb.pct}%`, backgroundColor: fillProb.color }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#737373]">Likelihood raffle fills up</span>
              <span className="text-[13px] font-semibold" style={{ color: fillProb.color }}>
                {fillProb.pct}%
              </span>
            </div>
          </div>
        )}

        {/* ── Smart Recommendations ── */}
        {recs.length > 0 && (
          <div className="bg-white rounded-[20px] border border-[#e5e5e5] overflow-hidden">
            <div className="bg-[#0f0f0f] px-5 py-3.5 flex items-center gap-2.5">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M12 21v-1m4.243-1.757l-.707-.707M6.757 17.243l-.707.707M17.243 6.757l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-white font-semibold text-[13px]">Smart Recommendations</span>
            </div>
            <div className="divide-y divide-[#f5f5f5]">
              {recs.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors">
                  <RecommendationBadge type={rec.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[11px] text-[#737373] leading-tight">{rec.label}</span>
                      <span className="text-[16px] font-semibold text-[#0f0f0f]">{rec.value}</span>
                    </div>
                    <p className="text-[11px] text-[#6e6e6e] mt-0.5 leading-relaxed">{rec.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Apply buttons */}
            <div className="bg-[#f9f8f4] px-4 py-3 flex flex-col gap-2 border-t border-[#e5e5e5]">
              <span className="text-[11px] text-[#737373] font-medium">Apply suggestion</span>
              <div className="flex flex-wrap gap-2">
                {recs.find((r) => r.label === "Optimal ticket price") && (
                  <button
                    onClick={onApplyOptimalPrice}
                    className="text-[11px] bg-white border border-[#e5e5e5] rounded-full px-3 py-1.5 hover:border-[#0f0f0f] transition-colors font-medium"
                  >
                    Use optimal price
                  </button>
                )}
                {recs.find((r) => r.label === "Recommended max participants") && (
                  <button
                    onClick={onApplyRecommendedMax}
                    className="text-[11px] bg-white border border-[#e5e5e5] rounded-full px-3 py-1.5 hover:border-[#0f0f0f] transition-colors font-medium"
                  >
                    Use rec. max
                  </button>
                )}
                <button
                  onClick={onResetBundles}
                  className="text-[11px] bg-white border border-[#e5e5e5] rounded-full px-3 py-1.5 hover:border-[#0f0f0f] transition-colors font-medium"
                >
                  Reset bundles
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RafflePage() {
  const [startDate, setStartDate] = useState("23.12.2025");
  const [endDate, setEndDate] = useState("23.4.2026");
  const [checkinQuestion, setCheckinQuestion] = useState("");

  const [fields, setFields] = useState<TicketFields>({
    prizeValue: "",
    pricePerTicket: "",
    numberOfWinners: "",
    minParticipants: "",
    maxParticipants: "",
  });

  const [bundles, setBundles] = useState<Bundle[]>(
    DEFAULT_BUNDLES.map((b) => ({ ...b }))
  );

  const setField = useCallback(
    (key: keyof TicketFields) => (value: string) =>
      setFields((prev) => ({ ...prev, [key]: value })),
    []
  );

  // Recalculate auto bundle prices whenever relevant fields change
  useEffect(() => {
    const prize = num(fields.prizeValue);
    const ticketPrice = num(fields.pricePerTicket);
    const maxP = num(fields.maxParticipants);
    const minP = num(fields.minParticipants);
    const base = optimalPerTicket(prize, maxP, minP, ticketPrice);
    if (base > 0) {
      setBundles((prev) =>
        prev.map((b) =>
          b.priceIsAuto
            ? { ...b, price: parseFloat((base * num(b.tickets)).toFixed(2)).toString() }
            : b
        )
      );
    }
  }, [fields.prizeValue, fields.pricePerTicket, fields.maxParticipants, fields.minParticipants]);

  const updateBundle = useCallback(
    (i: number, key: "tickets" | "price", value: string) => {
      setBundles((prev) =>
        prev.map((b, idx) => {
          if (idx !== i) return b;
          if (key === "price") return { ...b, price: value, priceIsAuto: false };
          const prize = num(fields.prizeValue);
          const ticketPrice = num(fields.pricePerTicket);
          const maxP = num(fields.maxParticipants);
          const minP = num(fields.minParticipants);
          const base = optimalPerTicket(prize, maxP, minP, ticketPrice);
          const newTickets = parseFloat(value) || 0;
          return {
            ...b,
            tickets: value,
            price: b.priceIsAuto && base > 0 ? parseFloat((base * newTickets).toFixed(2)).toString() : b.price,
          };
        })
      );
    },
    [fields]
  );

  const recs = computeRecommendations(fields, bundles);
  const warnings = computeWarnings(fields);
  const fillProb = computeFillProbability(fields);

  const clearAll = () => {
    setFields({ prizeValue: "", pricePerTicket: "", numberOfWinners: "", minParticipants: "", maxParticipants: "" });
    setBundles(DEFAULT_BUNDLES.map((b) => ({ ...b })));
    setStartDate("");
    setEndDate("");
    setCheckinQuestion("");
  };

  const applyOptimalPrice = () => {
    const optRec = recs.find((r) => r.label === "Optimal ticket price");
    if (optRec) setField("pricePerTicket")(optRec.value.replace("$", "").replace(/,/g, ""));
  };

  const applyRecommendedMax = () => {
    const r = recs.find((r) => r.label === "Recommended max participants");
    if (r) setField("maxParticipants")(r.value.replace(/,/g, ""));
  };

  const resetBundles = () => setBundles((prev) => prev.map((b) => ({ ...b, priceIsAuto: true })));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f8f4", fontFamily: "Geist, sans-serif" }}>
      {/* ── Nav ── */}
      <nav className="bg-[#f9f8f4] border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between px-6 py-[20px]">
          <div className="flex items-center gap-8">
            <span className="text-[20px] font-bold tracking-tight">✦ RAFFLY</span>
            <div className="h-8 w-px bg-[#e5e5e5]" />
            <span className="font-bold text-[16px] text-[rgba(15,15,15,0.95)]">Browse</span>
            <span className="font-bold text-[16px] text-[rgba(15,15,15,0.95)]">My raffles (2)</span>
          </div>
          <div className="flex items-center gap-8">
            <button className="border-2 border-[rgba(15,15,15,0.95)] rounded-full px-6 py-3 font-semibold text-[16px] text-[rgba(15,15,15,0.95)] hover:bg-[rgba(15,15,15,0.05)] transition-colors">
              Switch to Participant Mode
            </button>
            <button className="w-11 h-11 rounded-full border border-[#e5e5e5] flex items-center justify-center hover:bg-white transition-colors">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="#0f0f0f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="w-11 h-11 rounded-full border border-[#e5e5e5] flex items-center justify-center hover:bg-white transition-colors">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="#0f0f0f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Body: 3-column layout ── */}
      <div className="flex gap-4 px-6 py-8 max-w-[1400px] mx-auto items-start">

        {/* ── Left sidebar ── */}
        <div className="w-[240px] shrink-0 sticky top-[24px] hidden lg:block">
          <div className="bg-[rgba(255,255,255,0.95)] border border-[rgba(15,15,15,0.95)] rounded-[24px] p-7 relative overflow-hidden" style={{ minHeight: 380 }}>
            <div className="absolute top-10 left-10 w-[60px] h-[60px] bg-[#f0f0f0] rounded-full flex items-center justify-center">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="#0f0f0f" strokeWidth="1.5"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="#0f0f0f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mt-[80px]">
              <h2 className="text-[26px] font-semibold leading-[1.15] mb-8 text-[rgba(15,15,15,0.95)]" style={{ fontFamily: "'Clash Display', 'DM Sans', sans-serif" }}>
                How to build the best Raffle?
              </h2>
              {["Legal Stuff", "How to host a Raffle", "Minimum Target", "Promo tips", "Ticket Bundles"].map((item) => (
                <div key={item} className="flex items-center gap-4 mb-5">
                  <div className="w-6 h-6 border border-[#e5e5e5] rounded-[4px] flex items-center justify-center shrink-0">
                    <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1" stroke="#737373" strokeWidth="1.2"/></svg>
                  </div>
                  <span className="text-[16px] text-[#6e6e6e]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-[36px] font-semibold tracking-[0.36px] text-[rgba(15,15,15,0.95)]" style={{ fontFamily: "'Clash Display', 'DM Sans', sans-serif" }}>
              Create Raffle
            </h1>
            <div className="flex items-center gap-3">
              <button className="border-2 border-[#e6e8ec] rounded-full px-5 py-3 font-semibold text-[16px] text-[rgba(15,15,15,0.95)] hover:bg-white transition-colors">
                Preview Page
              </button>
              <button className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition-opacity">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#0f0f0f" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* ── Tickets ── */}
          <div className="bg-[rgba(255,255,255,0.95)] rounded-[24px] p-[50px] mb-4">
            <h2 className="text-[22px] font-semibold text-[#23262f] mb-6">Tickets</h2>

            <div className="mb-5">
              <InputField label="Prize Value" value={fields.prizeValue} onChange={setField("prizeValue")} placeholder="e.g. 2000" prefix="$" hint="Total prize value — used to calculate optimal pricing" />
            </div>

            <div className="flex gap-5 mb-5">
              <InputField label="Price per Ticket" value={fields.pricePerTicket} onChange={setField("pricePerTicket")} placeholder="e.g. 10" prefix="$" />
              <InputField label="Number of Winners" value={fields.numberOfWinners} onChange={setField("numberOfWinners")} placeholder="e.g. 1" />
            </div>

            <div className="flex gap-5 mb-5">
              <InputField label="Min Participants" value={fields.minParticipants} onChange={setField("minParticipants")} placeholder="e.g. 10" />
              <InputField label="Max Participants" value={fields.maxParticipants} onChange={setField("maxParticipants")} placeholder="e.g. 200" />
            </div>

            {/* Ticket Bundles */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium text-[18px] leading-[1.5] text-[#23262f]">Ticket Bundles</label>
                <span className="text-[13px] text-[#737373]">Prices auto-calculated from your inputs</span>
              </div>
              <div className="flex flex-col gap-3">
                {bundles.map((bundle, i) => {
                  const prize = num(fields.prizeValue);
                  const ticketPrice = num(fields.pricePerTicket);
                  const maxP = num(fields.maxParticipants);
                  const minP = num(fields.minParticipants);
                  const base = optimalPerTicket(prize, maxP, minP, ticketPrice);
                  const suggestedPrice = base > 0 && num(bundle.tickets) > 0
                    ? parseFloat((base * num(bundle.tickets)).toFixed(2))
                    : 0;
                  return (
                    <BundleRow key={i} index={i} bundle={bundle} suggestedPrice={suggestedPrice}
                      onTicketsChange={(v) => updateBundle(i, "tickets", v)}
                      onPriceChange={(v) => updateBundle(i, "price", v)} />
                  );
                })}
              </div>
            </div>

            <Banner variant="yellow">Price can&apos;t be changed after the first ticket purchase</Banner>
          </div>

          {/* ── Active time period ── */}
          <div className="bg-[rgba(255,255,255,0.95)] rounded-[24px] p-[50px] mb-4">
            <h2 className="text-[22px] font-semibold text-[rgba(15,15,15,0.95)] mb-6">Active time period</h2>
            <div className="flex gap-5 mb-4">
              <div className="flex flex-col gap-3 flex-1">
                <label className="font-medium text-[18px] text-[rgba(15,15,15,0.95)]">Start Date</label>
                <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="DD.MM.YYYY"
                  className="h-[44px] bg-white border border-[#e5e5e5] rounded-[8px] px-3 text-[16px] text-[#0f0f0f] placeholder:text-[#737373] outline-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f] transition-colors"/>
              </div>
              <div className="flex flex-col gap-3 flex-1">
                <label className="font-medium text-[18px] text-[rgba(15,15,15,0.95)]">End Date</label>
                <input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="DD.MM.YYYY"
                  className="h-[44px] bg-white border border-[#e5e5e5] rounded-[8px] px-3 text-[16px] text-[#0f0f0f] placeholder:text-[#737373] outline-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f] transition-colors"/>
              </div>
            </div>
            <Banner variant="blue">Raffle has a later start date. You can&apos;t change date later.</Banner>
          </div>

          {/* ── Participant Check-in ── */}
          <div className="bg-[rgba(255,255,255,0.95)] rounded-[24px] p-[50px] mb-8">
            <h2 className="text-[22px] font-semibold text-[#23262f] mb-2">Participant Check-in Question</h2>
            <p className="text-[16px] text-[#6e6e6e] mb-6">
              Choose a simple question participants will answer before joining your raffle. This helps confirm real participation and keeps entries fair.
            </p>
            <div className="relative w-[428px] max-w-full">
              <select value={checkinQuestion} onChange={(e) => setCheckinQuestion(e.target.value)}
                className="w-full h-[48px] bg-white border border-[#e5e5e5] rounded-[8px] px-3 pr-10 text-[16px] text-[#737373] outline-none appearance-none focus:border-[#0f0f0f] focus:ring-1 focus:ring-[#0f0f0f] transition-colors shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                <option value="">Select a question</option>
                <option value="city">What city are you from?</option>
                <option value="color">What is your favourite colour?</option>
                <option value="number">Pick a number between 1 and 10</option>
                <option value="movie">Name your favourite movie</option>
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-4">
            <button className="bg-[rgba(15,15,15,0.95)] text-white font-semibold text-[16px] rounded-full px-8 py-4 hover:bg-black transition-colors">
              Continue
            </button>
            <button onClick={clearAll} className="flex items-center gap-3 text-[#777e90] font-bold text-[16px] px-6 py-4 rounded-full hover:bg-[#f0f0f0] transition-colors">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#777e90" strokeWidth="2" strokeLinecap="round"/></svg>
              Clear all
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <RightPanel
          recs={recs}
          warnings={warnings}
          fillProb={fillProb}
          onApplyOptimalPrice={applyOptimalPrice}
          onApplyRecommendedMax={applyRecommendedMax}
          onResetBundles={resetBundles}
        />
      </div>

      {/* ── Decorative blobs ── */}
      <div className="fixed bottom-0 left-0 pointer-events-none overflow-hidden w-[300px] h-[300px] -z-0">
        <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-[#beffdb] rounded-[24px] -rotate-[94.5deg] opacity-60" />
      </div>
      <div className="fixed bottom-0 right-0 pointer-events-none overflow-hidden w-[200px] h-[200px] -z-0">
        <div className="absolute -bottom-10 -right-10 w-[200px] h-[200px] bg-[#c4edff] rounded-[24px] -rotate-[165deg] opacity-60" />
      </div>
      <div className="fixed bottom-[200px] left-[60px] pointer-events-none -z-0">
        <div className="w-[220px] h-[220px] bg-[#f6ff8b] rounded-[24px] -rotate-[150deg] opacity-50" />
      </div>
    </div>
  );
}
