import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CreditCard,
  DollarSign,
  Pencil,
  Plus,
  Package,
  Save,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "../components/common/Header";
import {
  useCreatePerformanceTrackerChannelMutation,
  useCreatePerformanceTrackerAdsAccountMutation,
  useCreatePerformanceTrackerEntryMutation,
  useCreatePerformanceTrackerProductMutation,
  useDeletePerformanceTrackerChannelMutation,
  useDeletePerformanceTrackerAdsAccountMutation,
  useDeletePerformanceTrackerEntryMutation,
  useDeletePerformanceTrackerProductMutation,
  useGetAllPerformanceTrackerAdsAccountsQuery,
  useGetAllPerformanceTrackerChannelsQuery,
  useGetAllPerformanceTrackerProductsQuery,
  useGetPerformanceTrackerAdsAccountsQuery,
  useGetPerformanceTrackerChannelsQuery,
  useGetPerformanceTrackerCompareQuery,
  useGetPerformanceTrackerDashboardQuery,
  useGetPerformanceTrackerEntriesQuery,
  useGetPerformanceTrackerProductsQuery,
  useGetPerformanceTrackerTargetsQuery,
  useUpdatePerformanceTrackerAdsAccountMutation,
  useSavePerformanceTrackerTargetsMutation,
  useUpdatePerformanceTrackerChannelMutation,
  useUpdatePerformanceTrackerEntryMutation,
  useUpdatePerformanceTrackerProductMutation,
} from "../features/performanceTracker/performanceTracker";
import { requestDeleteConfirmation } from "../utils/deleteConfirmation";

const today = new Date();
const toDateInput = (date) => date.toISOString().slice(0, 10);
const numberValue = (value) => Number(value || 0);
const formatNumber = (value, digits = 2) =>
  numberValue(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const formatLocal = (value) => `৳${formatNumber(value)}`;
const formatUsd = (value) => `$${formatNumber(value)}`;
const axisNumberFormatter = (value) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(numberValue(value));

const getPresetRange = (preset) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "today") return { startDate: toDateInput(now), endDate: toDateInput(now) };
  if (preset === "yesterday") {
    start.setDate(now.getDate() - 1);
    return { startDate: toDateInput(start), endDate: toDateInput(start) };
  }
  if (preset === "7_days") start.setDate(now.getDate() - 6);
  if (preset === "30_days") start.setDate(now.getDate() - 29);
  if (preset === "this_month") start.setDate(1);
  if (preset === "last_month") {
    start.setMonth(now.getMonth() - 1, 1);
    end.setDate(0);
  }
  if (preset === "all_time") return { startDate: "", endDate: "" };

  return { startDate: toDateInput(start), endDate: toDateInput(end) };
};

const defaultRange = getPresetRange("30_days");
const emptyChannel = { name: "", short_code: "", color: "#4f46e5" };
const emptyAdsAccount = { channel_id: "", name: "", account_code: "" };
const emptyProduct = { channel_id: "", name: "", sku: "" };
const emptyEntry = {
  channel_id: "",
  ads_account_id: "",
  product_id: "",
  date: toDateInput(today),
  spend_usd: "",
  usd_rate: "",
  total_revenue_local: "",
  total_orders: "",
  note: "",
};

const MetricCard = ({ title, value, helper, icon: Icon, tone = "indigo" }) => {
  const toneClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p> : null}
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-[8px] ${toneClasses[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>
    {children}
  </label>
);

const inputClass =
  "h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const ChartBox = ({ title, children }) => (
  <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="mb-4 text-base font-bold text-slate-900">{title}</h3>
    <div className="h-[260px]">{children}</div>
  </div>
);

const ModalShell = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
    <div className="w-full max-w-lg rounded-[8px] bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <button className="rounded-[8px] border border-slate-200 p-2 text-slate-500 hover:text-slate-900" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const DateFilters = ({
  channelId,
  setChannelId,
  adsAccountId,
  setAdsAccountId,
  productId,
  setProductId,
  preset,
  setPreset,
  range,
  setRange,
  channels = [],
  adsAccounts = [],
  products = [],
  showEntityFilters = true,
}) => {
  const applyPreset = (value) => {
    setPreset(value);
    if (value !== "custom") setRange(getPresetRange(value));
  };
  const filteredAdsAccounts = adsAccounts.filter((item) => !channelId || Number(item.channel_id) === Number(channelId));
  const filteredProducts = products.filter((item) => !channelId || Number(item.channel_id) === Number(channelId));

  return (
    <div
      className={`grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 ${
        showEntityFilters
          ? "xl:grid-cols-[minmax(170px,240px)_minmax(170px,240px)_minmax(170px,240px)_160px_150px_150px]"
          : "xl:grid-cols-[160px_150px_150px]"
      }`}
    >
      {showEntityFilters ? (
        <>
          <Field label="Channel">
            <select
              className={inputClass}
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value);
                setAdsAccountId?.("");
                setProductId?.("");
              }}
            >
              <option value="">All Channels</option>
              {channels.map((channel) => (
                <option key={channel.Id} value={channel.Id}>{channel.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Ads Account">
            <select className={inputClass} value={adsAccountId} onChange={(e) => setAdsAccountId?.(e.target.value)}>
              <option value="">All Ads Accounts</option>
              {filteredAdsAccounts.map((adsAccount) => (
                <option key={adsAccount.Id} value={adsAccount.Id}>{adsAccount.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Product">
            <select className={inputClass} value={productId} onChange={(e) => setProductId?.(e.target.value)}>
              <option value="">All Products</option>
              {filteredProducts.map((product) => (
                <option key={product.Id} value={product.Id}>{product.name}</option>
              ))}
            </select>
          </Field>
        </>
      ) : null}
      <Field label="Date Range">
        <select className={inputClass} value={preset} onChange={(e) => applyPreset(e.target.value)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7_days">7 Days</option>
          <option value="30_days">30 Days</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="all_time">All Time</option>
          <option value="custom">Custom</option>
        </select>
      </Field>
      <Field label="Start Date">
        <input className={inputClass} type="date" value={range.startDate} onChange={(e) => setRange((p) => ({ ...p, startDate: e.target.value }))} />
      </Field>
      <Field label="End Date">
        <input className={inputClass} type="date" value={range.endDate} onChange={(e) => setRange((p) => ({ ...p, endDate: e.target.value }))} />
      </Field>
    </div>
  );
};

const PerformanceTrackerPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [channelId, setChannelId] = useState("");
  const [adsAccountId, setAdsAccountId] = useState("");
  const [productId, setProductId] = useState("");
  const [preset, setPreset] = useState("30_days");
  const [range, setRange] = useState(defaultRange);
  const [channelSearch, setChannelSearch] = useState("");
  const [adsAccountSearch, setAdsAccountSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [entrySearch, setEntrySearch] = useState("");
  const [channelModal, setChannelModal] = useState(null);
  const [adsAccountModal, setAdsAccountModal] = useState(null);
  const [productModal, setProductModal] = useState(null);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [selectedCompareChannels, setSelectedCompareChannels] = useState([]);
  const [selectedCompareAdsAccounts, setSelectedCompareAdsAccounts] = useState([]);
  const [selectedCompareProducts, setSelectedCompareProducts] = useState([]);
  const [compareMode, setCompareMode] = useState("channels");
  const [targetDrafts, setTargetDrafts] = useState([]);

  const queryParams = { channel_id: channelId, ads_account_id: adsAccountId, product_id: productId, ...range };
  const { data: channelsRes } = useGetAllPerformanceTrackerChannelsQuery();
  const { data: adsAccountsRes } = useGetAllPerformanceTrackerAdsAccountsQuery();
  const { data: productsRes } = useGetAllPerformanceTrackerProductsQuery();
  const { data: pagedChannelsRes } = useGetPerformanceTrackerChannelsQuery({ page: 1, limit: 50, searchTerm: channelSearch });
  const { data: pagedAdsAccountsRes } = useGetPerformanceTrackerAdsAccountsQuery({ page: 1, limit: 50, searchTerm: adsAccountSearch });
  const { data: pagedProductsRes } = useGetPerformanceTrackerProductsQuery({ page: 1, limit: 50, searchTerm: productSearch });
  const { data: dashboardRes, isLoading: dashboardLoading } = useGetPerformanceTrackerDashboardQuery(queryParams);
  const { data: entriesRes, refetch: refetchEntries } = useGetPerformanceTrackerEntriesQuery({
    page: 1,
    limit: 50,
    channel_id: channelId,
    ads_account_id: adsAccountId,
    product_id: productId,
    searchTerm: entrySearch,
  });
  const { data: compareRes } = useGetPerformanceTrackerCompareQuery({
    channel_ids: selectedCompareChannels.join(","),
    ads_account_ids: selectedCompareAdsAccounts.join(","),
    product_ids: selectedCompareProducts.join(","),
    ...range,
  });
  const { data: targetsRes } = useGetPerformanceTrackerTargetsQuery();

  const channels = channelsRes?.data || [];
  const adsAccounts = adsAccountsRes?.data || [];
  const products = productsRes?.data || [];
  const pagedChannels = pagedChannelsRes?.data || [];
  const pagedAdsAccounts = pagedAdsAccountsRes?.data || [];
  const pagedProducts = pagedProductsRes?.data || [];
  const dashboard = dashboardRes?.data || {};
  const entries = entriesRes?.data || [];
  const compare = compareRes?.data || {};
  const targetRows = targetsRes?.data || [];

  const [createChannel] = useCreatePerformanceTrackerChannelMutation();
  const [updateChannel] = useUpdatePerformanceTrackerChannelMutation();
  const [deleteChannel] = useDeletePerformanceTrackerChannelMutation();
  const [createAdsAccount] = useCreatePerformanceTrackerAdsAccountMutation();
  const [updateAdsAccount] = useUpdatePerformanceTrackerAdsAccountMutation();
  const [deleteAdsAccount] = useDeletePerformanceTrackerAdsAccountMutation();
  const [createProduct] = useCreatePerformanceTrackerProductMutation();
  const [updateProduct] = useUpdatePerformanceTrackerProductMutation();
  const [deleteProduct] = useDeletePerformanceTrackerProductMutation();
  const [createEntry] = useCreatePerformanceTrackerEntryMutation();
  const [updateEntry] = useUpdatePerformanceTrackerEntryMutation();
  const [deleteEntry] = useDeletePerformanceTrackerEntryMutation();
  const [saveTargets] = useSavePerformanceTrackerTargetsMutation();

  useEffect(() => {
    setTargetDrafts(
      targetRows.map((row) => ({
        channel_id: row.Id,
        channelName: row.name,
        target_marketing_cost_percent: row.target?.target_marketing_cost_percent ?? 15,
        roas_alert_threshold: row.target?.roas_alert_threshold ?? 3,
      })),
    );
  }, [targetRows]);

  const spendLocal = numberValue(entryForm.spend_usd) * numberValue(entryForm.usd_rate);
  const entryAdsAccounts = useMemo(
    () => adsAccounts.filter((item) => !entryForm.channel_id || Number(item.channel_id) === Number(entryForm.channel_id)),
    [adsAccounts, entryForm.channel_id],
  );
  const entryProducts = useMemo(
    () => products.filter((item) => !entryForm.channel_id || Number(item.channel_id) === Number(entryForm.channel_id)),
    [products, entryForm.channel_id],
  );
  const timeline = dashboard.timeline || [];
  const summary = dashboard.summary || {};
  const channelSummaries = dashboard.channelSummaries || [];
  const adsAccountSummaries = dashboard.adsAccountSummaries || [];
  const productSummaries = dashboard.productSummaries || [];
  const ordersByChannel = channelSummaries.map((item) => ({
    name: item.channel?.name,
    orders: item.total_orders,
    revenuePerUsd: item.revenue_per_usd,
  }));
  const ordersByAdsAccount = adsAccountSummaries.map((item) => ({
    name: item.adsAccount?.name,
    orders: item.total_orders,
    revenuePerUsd: item.revenue_per_usd,
  }));
  const ordersByProduct = productSummaries.map((item) => ({
    name: item.product?.name,
    orders: item.total_orders,
    revenuePerUsd: item.revenue_per_usd,
  }));
  const compareChannels = compare.channels || [];
  const compareAdsAccounts = compare.adsAccounts || [];
  const compareProducts = compare.products || [];
  const compareRows =
    compareMode === "adsAccounts"
      ? compareAdsAccounts.map((item) => ({ name: item.adsAccount?.name, value: item.revenue_per_usd }))
      : compareMode === "products"
        ? compareProducts.map((item) => ({ name: item.product?.name, value: item.revenue_per_usd }))
        : compareChannels.map((item) => ({ name: item.channel?.name, value: item.revenue_per_usd }));
  const compareTrend = useMemo(() => timeline.map((row) => ({ date: row.date, value: row.revenue_per_usd })), [timeline]);

  const saveChannel = async (e) => {
    e.preventDefault();
    const payload = channelModal?.data || emptyChannel;
    try {
      if (channelModal?.id) {
        await updateChannel({ id: channelModal.id, data: payload }).unwrap();
        toast.success("Channel updated");
      } else {
        await createChannel(payload).unwrap();
        toast.success("Channel created");
      }
      setChannelModal(null);
    } catch (err) {
      toast.error(err?.data?.message || "Channel save failed");
    }
  };

  const removeChannel = async (id) => {
    const ok = await requestDeleteConfirmation({ message: "Delete this tracker channel?" });
    if (!ok) return;
    try {
      await deleteChannel(id).unwrap();
      toast.success("Channel deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Channel delete failed");
    }
  };

  const saveAdsAccount = async (e) => {
    e.preventDefault();
    const payload = adsAccountModal?.data || emptyAdsAccount;
    try {
      if (adsAccountModal?.id) {
        await updateAdsAccount({ id: adsAccountModal.id, data: payload }).unwrap();
        toast.success("Ads account updated");
      } else {
        await createAdsAccount(payload).unwrap();
        toast.success("Ads account created");
      }
      setAdsAccountModal(null);
    } catch (err) {
      toast.error(err?.data?.message || "Ads account save failed");
    }
  };

  const removeAdsAccount = async (id) => {
    const ok = await requestDeleteConfirmation({ message: "Delete this ads account?" });
    if (!ok) return;
    try {
      await deleteAdsAccount(id).unwrap();
      toast.success("Ads account deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Ads account delete failed");
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const payload = productModal?.data || emptyProduct;
    try {
      if (productModal?.id) {
        await updateProduct({ id: productModal.id, data: payload }).unwrap();
        toast.success("Product updated");
      } else {
        await createProduct(payload).unwrap();
        toast.success("Product created");
      }
      setProductModal(null);
    } catch (err) {
      toast.error(err?.data?.message || "Product save failed");
    }
  };

  const removeProduct = async (id) => {
    const ok = await requestDeleteConfirmation({ message: "Delete this product?" });
    if (!ok) return;
    try {
      await deleteProduct(id).unwrap();
      toast.success("Product deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Product delete failed");
    }
  };

  const resetEntry = () => {
    setEntryForm(emptyEntry);
    setEditingEntryId(null);
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    try {
      if (editingEntryId) {
        await updateEntry({ id: editingEntryId, data: entryForm }).unwrap();
        toast.success("Entry updated");
      } else {
        await createEntry(entryForm).unwrap();
        toast.success("Entry saved");
      }
      resetEntry();
      refetchEntries?.();
    } catch (err) {
      toast.error(err?.data?.message || "Entry save failed");
    }
  };

  const editEntry = (entry) => {
    setEditingEntryId(entry.Id);
    setEntryForm({
      channel_id: entry.channel_id || "",
      ads_account_id: entry.ads_account_id || "",
      product_id: entry.product_id || "",
      date: entry.date || toDateInput(today),
      spend_usd: entry.spend_usd || "",
      usd_rate: entry.usd_rate || "",
      total_revenue_local: entry.total_revenue_local || "",
      total_orders: entry.total_orders || "",
      note: entry.note || "",
    });
    setActiveTab("data");
  };

  const removeEntry = async (id) => {
    const ok = await requestDeleteConfirmation({ message: "Delete this tracker entry?" });
    if (!ok) return;
    try {
      await deleteEntry(id).unwrap();
      toast.success("Entry deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Entry delete failed");
    }
  };

  const saveAllTargets = async () => {
    try {
      await saveTargets(targetDrafts).unwrap();
      toast.success("Targets saved");
    } catch (err) {
      toast.error(err?.data?.message || "Targets save failed");
    }
  };

  const tabs = [
    ["dashboard", "Dashboard"],
    ["compare", "Compare"],
    ["data", "Data Entry"],
    ["channels", "Channels"],
    ["adsAccounts", "Ads Accounts"],
    ["products", "Products"],
    ["targets", "Targets"],
  ];

  return (
    <div className="flex-1 relative z-10">
      <Header title="Automated Performance Tracker" />
      <main className="max-w-8xl mx-auto min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 lg:px-8">
        <section className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <h1 className="text-2xl font-bold text-slate-900">Automated Performance Tracker</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Standalone marketing performance channels, entries, targets, and live alerts.</p>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                className={`h-10 rounded-[8px] px-4 text-sm font-bold transition ${activeTab === key ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-5">
            {activeTab === "dashboard" ? (
              <>
                <DateFilters
                  channelId={channelId}
                  setChannelId={setChannelId}
                  adsAccountId={adsAccountId}
                  setAdsAccountId={setAdsAccountId}
                  productId={productId}
                  setProductId={setProductId}
                  preset={preset}
                  setPreset={setPreset}
                  range={range}
                  setRange={setRange}
                  channels={channels}
                  adsAccounts={adsAccounts}
                  products={products}
                />
                {(dashboard.alertChannels || []).map((item) => (
                  <div key={item.channel?.Id} className="flex items-start gap-3 rounded-[8px] border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertTriangle className="mt-0.5" size={20} />
                    <p className="text-sm font-bold">
                      Marketing cost ({formatNumber(item.marketing_cost_percent)}%) is over target ({formatNumber(item.target_marketing_cost_percent)}%) for {item.channel?.name}. Immediate action needed!
                    </p>
                  </div>
                ))}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
                  <MetricCard title="Total Spend (USD)" value={dashboardLoading ? "..." : formatUsd(summary.spend_usd)} icon={DollarSign} />
                  <MetricCard title="Total Spend (Local)" value={dashboardLoading ? "..." : formatLocal(summary.spend_local)} icon={DollarSign} />
                  <MetricCard title="Total Revenue" value={dashboardLoading ? "..." : formatLocal(summary.total_revenue_local)} icon={TrendingUp} tone="green" />
                  <MetricCard title="Total Orders" value={dashboardLoading ? "..." : formatNumber(summary.total_orders, 0)} icon={Users} tone="slate" />
                  <MetricCard title="ROAS" value={dashboardLoading ? "..." : `${formatNumber(summary.roas)}x`} icon={BarChart3} tone={summary.is_below_roas_threshold ? "red" : "green"} />
                  <MetricCard title="Marketing Cost %" value={dashboardLoading ? "..." : `${formatNumber(summary.marketing_cost_percent)}%`} icon={Target} tone={summary.is_over_target ? "red" : "green"} />
                  <MetricCard title="Revenue per USD" value={dashboardLoading ? "..." : formatLocal(summary.revenue_per_usd)} icon={DollarSign} tone="amber" />
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <ChartBox title="Spend vs Revenue over time">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis width={70} tickFormatter={axisNumberFormatter} /><Tooltip formatter={(v) => formatLocal(v)} /><Legend /><Line type="monotone" dataKey="spend_local" name="Spend" stroke="#ef4444" strokeWidth={2} /><Line type="monotone" dataKey="total_revenue_local" name="Revenue" stroke="#22c55e" strokeWidth={2} /></LineChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="ROAS Trend">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis width={70} tickFormatter={axisNumberFormatter} /><Tooltip /><ReferenceLine y={summary.roas_alert_threshold || 3} stroke="#f59e0b" strokeDasharray="4 4" /><Line type="monotone" dataKey="roas" stroke="#6366f1" strokeWidth={2} /></LineChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Daily Orders Trend">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis width={70} tickFormatter={axisNumberFormatter} /><Tooltip /><Bar dataKey="total_orders" name="Orders" fill="#14b8a6" radius={[6, 6, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Cost per Order Trend">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis width={70} tickFormatter={axisNumberFormatter} /><Tooltip formatter={(v) => formatLocal(v)} /><Line type="monotone" dataKey="cost_per_order" stroke="#f97316" strokeWidth={2} /></LineChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Cost % vs Target">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="65%" outerRadius="95%" data={[{ name: "Cost %", value: Math.min(summary.marketing_cost_percent || 0, 100), fill: summary.is_over_target ? "#ef4444" : "#22c55e" }]} startAngle={180} endAngle={0}>
                        <RadialBar dataKey="value" cornerRadius={8} />
                        <Tooltip formatter={(v) => `${formatNumber(v)}%`} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  {!channelId ? (
                    <ChartBox title="Orders by Channel">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByChannel}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis width={60} tickFormatter={axisNumberFormatter} /><Tooltip /><Bar dataKey="orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart>
                      </ResponsiveContainer>
                    </ChartBox>
                  ) : null}
                  {!adsAccountId ? (
                    <ChartBox title="Orders by Ads Account">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByAdsAccount}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis width={60} tickFormatter={axisNumberFormatter} /><Tooltip /><Bar dataKey="orders" fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart>
                      </ResponsiveContainer>
                    </ChartBox>
                  ) : null}
                  {!productId ? (
                    <ChartBox title="Orders by Product">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByProduct}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis width={60} tickFormatter={axisNumberFormatter} /><Tooltip /><Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart>
                      </ResponsiveContainer>
                    </ChartBox>
                  ) : null}
                </div>
              </>
            ) : null}

            {activeTab === "compare" ? (
              <>
                <DateFilters
                  preset={preset}
                  setPreset={setPreset}
                  range={range}
                  setRange={setRange}
                  showEntityFilters={false}
                />
                <div className="rounded-[8px] border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {[
                      ["channels", "Channels"],
                      ["adsAccounts", "Ads Accounts"],
                      ["products", "Products"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`h-9 rounded-[8px] px-3 text-sm font-bold ${compareMode === key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                        onClick={() => setCompareMode(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mb-3 text-sm font-bold text-slate-700">
                    Compare {compareMode === "adsAccounts" ? "Ads Accounts" : compareMode === "products" ? "Products" : "Channels"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {compareMode === "adsAccounts"
                      ? adsAccounts.map((adsAccount) => (
                        <label key={adsAccount.Id} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedCompareAdsAccounts.includes(adsAccount.Id)}
                            onChange={(e) => setSelectedCompareAdsAccounts((prev) => e.target.checked ? [...prev, adsAccount.Id] : prev.filter((id) => id !== adsAccount.Id))}
                          />
                          {adsAccount.name}
                        </label>
                      ))
                      : compareMode === "products"
                        ? products.map((product) => (
                          <label key={product.Id} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedCompareProducts.includes(product.Id)}
                              onChange={(e) => setSelectedCompareProducts((prev) => e.target.checked ? [...prev, product.Id] : prev.filter((id) => id !== product.Id))}
                            />
                            {product.name}
                          </label>
                        ))
                        : channels.map((channel) => (
                          <label key={channel.Id} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedCompareChannels.includes(channel.Id)}
                              onChange={(e) => setSelectedCompareChannels((prev) => e.target.checked ? [...prev, channel.Id] : prev.filter((id) => id !== channel.Id))}
                            />
                            {channel.name}
                          </label>
                        ))}
                  </div>
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <ChartBox title={`Revenue per USD by ${compareMode === "adsAccounts" ? "Ads Account" : compareMode === "products" ? "Product" : "Channel"}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={compareRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis width={70} tickFormatter={axisNumberFormatter} /><Tooltip formatter={(v) => formatLocal(v)} /><Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Revenue per USD Trend">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={compareTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis width={70} tickFormatter={axisNumberFormatter} /><Tooltip formatter={(v) => formatLocal(v)} /><Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} /></LineChart>
                    </ResponsiveContainer>
                  </ChartBox>
                </div>
                <div className="rounded-[8px] border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-base font-bold text-slate-900">Smart Insights</h3>
                  <div className="space-y-2">
                    {(compare.insights || []).map((item, index) => (
                      <p key={`${item.text}-${index}`} className={`rounded-[8px] px-3 py-2 text-sm font-bold ${item.tone === "red" ? "bg-red-50 text-red-700" : item.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.text}</p>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "data" ? (
              <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <form onSubmit={submitEntry} className="space-y-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">{editingEntryId ? "Edit Entry" : "Data Entry"}</h3>
                  <Field label="Channel"><select required className={inputClass} value={entryForm.channel_id} onChange={(e) => setEntryForm((p) => ({ ...p, channel_id: e.target.value, ads_account_id: "", product_id: "" }))}><option value="">Select Channel</option>{channels.map((channel) => <option key={channel.Id} value={channel.Id}>{channel.name}</option>)}</select></Field>
                  <Field label="Ads Account"><select className={inputClass} value={entryForm.ads_account_id} onChange={(e) => setEntryForm((p) => ({ ...p, ads_account_id: e.target.value }))}><option value="">Select Ads Account</option>{entryAdsAccounts.map((adsAccount) => <option key={adsAccount.Id} value={adsAccount.Id}>{adsAccount.name}</option>)}</select></Field>
                  <Field label="Product"><select className={inputClass} value={entryForm.product_id} onChange={(e) => setEntryForm((p) => ({ ...p, product_id: e.target.value }))}><option value="">Select Product</option>{entryProducts.map((product) => <option key={product.Id} value={product.Id}>{product.name}</option>)}</select></Field>
                  <Field label="Date"><input required type="date" className={inputClass} value={entryForm.date} onChange={(e) => setEntryForm((p) => ({ ...p, date: e.target.value }))} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Spend USD"><input required type="number" step="0.01" className={inputClass} value={entryForm.spend_usd} onChange={(e) => setEntryForm((p) => ({ ...p, spend_usd: e.target.value }))} /></Field>
                    <Field label="USD Rate"><input required type="number" step="0.0001" className={inputClass} value={entryForm.usd_rate} onChange={(e) => setEntryForm((p) => ({ ...p, usd_rate: e.target.value }))} /></Field>
                  </div>
                  <Field label="Spend Local"><input readOnly className={`${inputClass} bg-slate-50`} value={formatLocal(spendLocal)} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Total Revenue Local"><input required type="number" step="0.01" className={inputClass} value={entryForm.total_revenue_local} onChange={(e) => setEntryForm((p) => ({ ...p, total_revenue_local: e.target.value }))} /></Field>
                    <Field label="Total Orders"><input required type="number" className={inputClass} value={entryForm.total_orders} onChange={(e) => setEntryForm((p) => ({ ...p, total_orders: e.target.value }))} /></Field>
                  </div>
                  <Field label="Note"><textarea className={`${inputClass} h-24 py-3`} value={entryForm.note} onChange={(e) => setEntryForm((p) => ({ ...p, note: e.target.value }))} /></Field>
                  <div className="flex gap-2">
                    <button className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm" type="submit"><Save size={17} /> Save Entry</button>
                    {editingEntryId ? <button type="button" className="h-11 rounded-[8px] border border-slate-200 px-4 text-sm font-bold text-slate-600" onClick={resetEntry}>Cancel</button> : null}
                  </div>
                </form>
                <div className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-base font-bold text-slate-900">Entry Log ({entriesRes?.meta?.count || 0})</p>
                    <div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className={`${inputClass} pl-10`} placeholder="Search note..." value={entrySearch} onChange={(e) => setEntrySearch(e.target.value)} /></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50"><tr>{["Date", "Channel", "Ads Account", "Product", "Spend", "Revenue", "Orders", "ROAS", "Actions"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {entries.map((entry) => (
                          <tr key={entry.Id}>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{entry.date}</td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-900">{entry.channel?.name || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{entry.adsAccount?.name || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{entry.product?.name || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatLocal(entry.spend_local)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatLocal(entry.total_revenue_local)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{entry.total_orders}</td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-900">{formatNumber(entry.roas)}x</td>
                            <td className="px-4 py-3"><div className="flex gap-2"><button className="rounded-[8px] border border-slate-200 p-2 text-indigo-600" onClick={() => editEntry(entry)}><Pencil size={16} /></button><button className="rounded-[8px] border border-slate-200 p-2 text-red-600" onClick={() => removeEntry(entry.Id)}><Trash2 size={16} /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "channels" ? (
              <div className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:w-96"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className={`${inputClass} pl-10`} placeholder="Search channel..." value={channelSearch} onChange={(e) => setChannelSearch(e.target.value)} /></div>
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm" onClick={() => setChannelModal({ data: emptyChannel })}><Plus size={17} /> Add Channel</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {pagedChannels.map((channel) => (
                    <div key={channel.Id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-center gap-3"><span className="h-10 w-10 rounded-full border border-slate-200" style={{ backgroundColor: channel.color || "#4f46e5" }} /><div><p className="font-bold text-slate-900">{channel.name}</p><p className="text-xs font-semibold text-slate-400">{channel.short_code || "No short code"}</p></div></div>
                      <div className="flex gap-2"><button className="rounded-[8px] border border-slate-200 p-2 text-indigo-600" onClick={() => setChannelModal({ id: channel.Id, data: { name: channel.name, short_code: channel.short_code || "", color: channel.color || "#4f46e5" } })}><Pencil size={16} /></button><button className="rounded-[8px] border border-slate-200 p-2 text-red-600" onClick={() => removeChannel(channel.Id)}><Trash2 size={16} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "adsAccounts" ? (
              <div className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:w-96"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className={`${inputClass} pl-10`} placeholder="Search ads account..." value={adsAccountSearch} onChange={(e) => setAdsAccountSearch(e.target.value)} /></div>
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm" onClick={() => setAdsAccountModal({ data: emptyAdsAccount })}><Plus size={17} /> Add Ads Account</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {pagedAdsAccounts.map((adsAccount) => (
                    <div key={adsAccount.Id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-sky-50 text-sky-600"><CreditCard size={18} /></span>
                        <div><p className="font-bold text-slate-900">{adsAccount.name}</p><p className="text-xs font-semibold text-slate-400">{adsAccount.channel?.name || "No channel"}{adsAccount.account_code ? ` • ${adsAccount.account_code}` : ""}</p></div>
                      </div>
                      <div className="flex gap-2"><button className="rounded-[8px] border border-slate-200 p-2 text-indigo-600" onClick={() => setAdsAccountModal({ id: adsAccount.Id, data: { channel_id: adsAccount.channel_id || "", name: adsAccount.name, account_code: adsAccount.account_code || "" } })}><Pencil size={16} /></button><button className="rounded-[8px] border border-slate-200 p-2 text-red-600" onClick={() => removeAdsAccount(adsAccount.Id)}><Trash2 size={16} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "products" ? (
              <div className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:w-96"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className={`${inputClass} pl-10`} placeholder="Search product..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm" onClick={() => setProductModal({ data: emptyProduct })}><Plus size={17} /> Add Product</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {pagedProducts.map((product) => (
                    <div key={product.Id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-600"><Package size={18} /></span>
                        <div><p className="font-bold text-slate-900">{product.name}</p><p className="text-xs font-semibold text-slate-400">{product.channel?.name || "No channel"}{product.sku ? ` • ${product.sku}` : ""}</p></div>
                      </div>
                      <div className="flex gap-2"><button className="rounded-[8px] border border-slate-200 p-2 text-indigo-600" onClick={() => setProductModal({ id: product.Id, data: { channel_id: product.channel_id || "", name: product.name, sku: product.sku || "" } })}><Pencil size={16} /></button><button className="rounded-[8px] border border-slate-200 p-2 text-red-600" onClick={() => removeProduct(product.Id)}><Trash2 size={16} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "targets" ? (
              <div className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50"><tr>{["Channel", "Target Marketing Cost %", "ROAS Alert Threshold", "Preview"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {targetDrafts.map((row, index) => (
                        <tr key={row.channel_id}>
                          <td className="px-4 py-3 font-bold text-slate-900">{row.channelName}</td>
                          <td className="px-4 py-3"><input className={inputClass} type="number" step="0.01" value={row.target_marketing_cost_percent} onChange={(e) => setTargetDrafts((prev) => prev.map((item, i) => i === index ? { ...item, target_marketing_cost_percent: e.target.value } : item))} /></td>
                          <td className="px-4 py-3"><input className={inputClass} type="number" step="0.01" value={row.roas_alert_threshold} onChange={(e) => setTargetDrafts((prev) => prev.map((item, i) => i === index ? { ...item, roas_alert_threshold: e.target.value } : item))} /></td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                            If Revenue = ৳100,000 to Max Spend:{" "}
                            {formatLocal((100000 * numberValue(row.target_marketing_cost_percent)) / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100 p-4"><button className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white" onClick={saveAllTargets}><Save size={17} /> Save All Targets</button></div>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {channelModal ? (
        <ModalShell title={channelModal.id ? "Edit Channel" : "Add Channel"} onClose={() => setChannelModal(null)}>
          <form className="space-y-4" onSubmit={saveChannel}>
            <Field label="Channel Name"><input required className={inputClass} value={channelModal.data.name} onChange={(e) => setChannelModal((p) => ({ ...p, data: { ...p.data, name: e.target.value } }))} /></Field>
            <Field label="Short Code"><input className={inputClass} value={channelModal.data.short_code} onChange={(e) => setChannelModal((p) => ({ ...p, data: { ...p.data, short_code: e.target.value } }))} /></Field>
            <Field label="Color"><input className={`${inputClass} h-12 p-1`} type="color" value={channelModal.data.color} onChange={(e) => setChannelModal((p) => ({ ...p, data: { ...p.data, color: e.target.value } }))} /></Field>
            <button className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white" type="submit"><Save size={17} /> Save Channel</button>
          </form>
        </ModalShell>
      ) : null}

      {adsAccountModal ? (
        <ModalShell title={adsAccountModal.id ? "Edit Ads Account" : "Add Ads Account"} onClose={() => setAdsAccountModal(null)}>
          <form className="space-y-4" onSubmit={saveAdsAccount}>
            <Field label="Channel"><select required className={inputClass} value={adsAccountModal.data.channel_id} onChange={(e) => setAdsAccountModal((p) => ({ ...p, data: { ...p.data, channel_id: e.target.value } }))}><option value="">Select Channel</option>{channels.map((channel) => <option key={channel.Id} value={channel.Id}>{channel.name}</option>)}</select></Field>
            <Field label="Ads Account Name"><input required className={inputClass} value={adsAccountModal.data.name} onChange={(e) => setAdsAccountModal((p) => ({ ...p, data: { ...p.data, name: e.target.value } }))} /></Field>
            <Field label="Account Code"><input className={inputClass} value={adsAccountModal.data.account_code} onChange={(e) => setAdsAccountModal((p) => ({ ...p, data: { ...p.data, account_code: e.target.value } }))} /></Field>
            <button className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white" type="submit"><Save size={17} /> Save Ads Account</button>
          </form>
        </ModalShell>
      ) : null}

      {productModal ? (
        <ModalShell title={productModal.id ? "Edit Product" : "Add Product"} onClose={() => setProductModal(null)}>
          <form className="space-y-4" onSubmit={saveProduct}>
            <Field label="Channel"><select required className={inputClass} value={productModal.data.channel_id} onChange={(e) => setProductModal((p) => ({ ...p, data: { ...p.data, channel_id: e.target.value } }))}><option value="">Select Channel</option>{channels.map((channel) => <option key={channel.Id} value={channel.Id}>{channel.name}</option>)}</select></Field>
            <Field label="Product Name"><input required className={inputClass} value={productModal.data.name} onChange={(e) => setProductModal((p) => ({ ...p, data: { ...p.data, name: e.target.value } }))} /></Field>
            <Field label="SKU"><input className={inputClass} value={productModal.data.sku} onChange={(e) => setProductModal((p) => ({ ...p, data: { ...p.data, sku: e.target.value } }))} /></Field>
            <button className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white" type="submit"><Save size={17} /> Save Product</button>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
};

export default PerformanceTrackerPage;
