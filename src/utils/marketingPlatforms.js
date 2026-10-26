import { useGetMarketingPlatformsQuery } from "../features/marketingBook/marketingBook";

// DM Expense platforms live in the MarketingPlatforms table (Add Platform on
// the Marketing Book List). These are only the fallback while it loads.
export const DEFAULT_PLATFORMS = ["Facebook", "Google", "Tiktok", "SEO"];

const KNOWN_STYLES = {
  Facebook: "bg-blue-50 border-blue-200 text-blue-700",
  Google: "bg-amber-50 border-amber-200 text-amber-700",
  Tiktok: "bg-slate-100 border-slate-300 text-slate-900",
  SEO: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const EXTRA_STYLES = [
  "bg-violet-50 border-violet-200 text-violet-700",
  "bg-rose-50 border-rose-200 text-rose-700",
  "bg-cyan-50 border-cyan-200 text-cyan-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-lime-50 border-lime-200 text-lime-700",
  "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700",
];

const NEUTRAL_STYLE = "bg-slate-50 border-slate-200 text-slate-600";

// Same colour for the same name everywhere, also for newly added platforms.
export const getPlatformStyle = (name) => {
  if (!name) return NEUTRAL_STYLE;
  if (KNOWN_STYLES[name]) return KNOWN_STYLES[name];
  if (name === "Unassigned") return NEUTRAL_STYLE;
  const hash = [...String(name)].reduce((h, c) => h + c.charCodeAt(0), 0);
  return EXTRA_STYLES[hash % EXTRA_STYLES.length];
};

export const useMarketingPlatforms = () => {
  const { data, isLoading, refetch } = useGetMarketingPlatformsQuery();
  const rows = data?.data || [];
  const platforms = rows.length ? rows.map((p) => p.name) : DEFAULT_PLATFORMS;
  return { platforms, rows, isLoading, refetch };
};
