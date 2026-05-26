"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";

export interface BodyCompFrame {
  name: string;
  color: string;
  /** Bio height (CommonPlayerInfo) - almost always populated. */
  height_in: number | null;
  /** Combine wingspan (often null for pre-2000 and non-NCAA players). */
  wingspan_in: number | null;
  /** Combine standing reach. */
  standing_reach_in: number | null;
  /** Combine weight (we treat it as the listed-weight proxy throughout career). */
  weight_lbs: number | null;
}

interface BodyCompProps {
  frames: BodyCompFrame[];
}

type Units = "imperial" | "metric";

function inchesToFeet(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches - ft * 12);
  return `${ft}'${inch.toString().padStart(2, "0")}"`;
}

function fmtLength(inches: number | null, units: Units): string {
  if (inches === null || inches === undefined) return "-";
  if (units === "imperial") return inchesToFeet(inches);
  const cm = inches * 2.54;
  return cm < 100 ? `${cm.toFixed(0)} cm` : `${(cm / 100).toFixed(2)} m`;
}

function fmtWeight(lbs: number | null, units: Units): string {
  if (lbs === null || lbs === undefined) return "-";
  if (units === "imperial") return `${Math.round(lbs)} lb`;
  return `${Math.round(lbs * 0.453592)} kg`;
}

export function BodyComp({ frames }: BodyCompProps) {
  const { t } = useLocale();
  const [units, setUnits] = useState<Units>("imperial");

  // For the silhouette canvas: anchor to the tallest standing reach (or
  // height) we have across the frames so different player overlays scale
  // consistently. 130 in (~10'10") is a safety floor.
  const maxReach = Math.max(
    ...frames.map((f) => f.standing_reach_in ?? f.height_in ?? 0),
    130,
  );

  // Convert any single value to the active-unit string for the data rows.
  const fmt = {
    length: (v: number | null) => fmtLength(v, units),
    weight: (v: number | null) => fmtWeight(v, units),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <UnitToggle units={units} setUnits={setUnits} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {frames.map((f) => (
          <div key={f.name} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{f.name}</div>
              <div
                className="size-3 rounded-full"
                style={{ background: f.color }}
              />
            </div>

            {/* Data table - height + wingspan + reach + weight, always rendered.
                Missing values show "-" so the layout stays stable even when
                physical data is partial. */}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">{t("body.height")}</dt>
              <dd className="font-mono text-right tabular-nums">
                {fmt.length(f.height_in)}
              </dd>
              <dt className="text-muted-foreground">{t("body.wingspan")}</dt>
              <dd className="font-mono text-right tabular-nums">
                {fmt.length(f.wingspan_in)}
              </dd>
              <dt className="text-muted-foreground">{t("body.standing_reach")}</dt>
              <dd className="font-mono text-right tabular-nums">
                {fmt.length(f.standing_reach_in)}
              </dd>
              <dt className="text-muted-foreground">{t("body.weight")}</dt>
              <dd className="font-mono text-right tabular-nums">
                {fmt.weight(f.weight_lbs)}
              </dd>
            </dl>

            {/* Reach chart - only worth showing when we have Combine data
                (wingspan or standing reach). With bio height alone the box
                renders nearly empty, so we skip it and keep just the table. */}
            {f.height_in !== null &&
              (f.standing_reach_in !== null || f.wingspan_in !== null) && (
              <div className="bg-muted/40 relative h-40 overflow-hidden rounded-2xl">
                {f.standing_reach_in !== null && (
                  <div
                    className="absolute right-0 left-0 border-t-2 border-dashed"
                    style={{
                      bottom: `${(f.standing_reach_in / maxReach) * 100}%`,
                      borderColor: f.color,
                    }}
                  >
                    <span
                      className="absolute right-1 -translate-y-full text-[10px] font-medium"
                      style={{ color: f.color }}
                    >
                      {t("body.reach_short")} {fmt.length(f.standing_reach_in)}
                    </span>
                  </div>
                )}
                <div
                  className="absolute right-0 left-0 border-t"
                  style={{
                    bottom: `${(f.height_in / maxReach) * 100}%`,
                    borderColor: f.color,
                    opacity: 0.6,
                  }}
                >
                  <span className="text-muted-foreground absolute left-1 -translate-y-full text-[10px]">
                    {t("body.height").toLowerCase()}
                  </span>
                  {f.wingspan_in !== null && (
                    <span
                      className="absolute right-1 -translate-y-full text-[10px] font-medium"
                      style={{ color: f.color }}
                    >
                      {t("body.wing_short")} {fmt.length(f.wingspan_in)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnitToggle({
  units,
  setUnits,
}: {
  units: Units;
  setUnits: (u: Units) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-0.5 text-[10px]">
      <button
        type="button"
        onClick={() => setUnits("imperial")}
        className={
          "rounded-full px-2.5 py-0.5 font-medium transition-colors " +
          (units === "imperial"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground")
        }
      >
        {t("body.units_imperial")}
      </button>
      <button
        type="button"
        onClick={() => setUnits("metric")}
        className={
          "rounded-full px-2.5 py-0.5 font-medium transition-colors " +
          (units === "metric"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground")
        }
      >
        {t("body.units_metric")}
      </button>
    </div>
  );
}
