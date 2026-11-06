export type PrizeId =
  | "cookies"
  | "brownie"
  | "botton"
  | "canetas"
  | "espelho"
  | "canecas"
  | "veninha";

export interface Prize {
  id: PrizeId;
  name: string;
  total: number;
  multiplier: number;
  active: boolean;
  rare: boolean;
}

export interface SpinRecord {
  id: string;
  prizeId: PrizeId;
  sliceIndex: number;
  landingOffset: number;
  spunAt: number;
  elapsedSeconds: number;
  forced: boolean;
}

export interface EventState {
  version: 1;
  startedAt: number | null;
  endedAt: number | null;
  durationSeconds: number;
  pausedAt: number | null;
  pausedSeconds: number;
  expectedSpinSeconds: number;
  pacingEnabled: boolean;
  releasedManually: boolean;
  forcedPrizeId: PrizeId | null;
  prizes: Prize[];
  spins: SpinRecord[];
}

export type SpinAvailability =
  | { kind: "not_started" }
  | { kind: "paused" }
  | { kind: "ended" }
  | { kind: "out_of_stock" }
  | { kind: "waiting"; seconds: number }
  | { kind: "ready" };

export type PrizeForecast =
  | { kind: "lasts" }
  | { kind: "runs_out_early"; minutes: number }
  | { kind: "leftover"; amount: number };
