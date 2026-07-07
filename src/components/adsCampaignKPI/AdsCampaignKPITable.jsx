import { useMemo, useState } from "react";
import {
  BarChart3,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";
import DateRangeFilter from "../common/DateRangeFilter";
import {
  useCreateAdsAccountMutation,
  useDeleteAdsCampaignKPIMutation,
  useGetAdsAccountsQuery,
  useGetAdsCampaignKPIPerformanceGraphQuery,
  useGetAllAdsCampaignKPIQuery,
  useInsertAdsCampaignKPIMutation,
  useUpdateAdsCampaignKPIMutation,
} from "../../features/adsCampaignKPI/adsCampaignKPI";

const getDefaultForm = () => ({
  platform: "Facebook",
  adsAccountId: "",
  adsAccountName: "",
  date: toDateInputValue(new Date()),
  spend: "",
  result: "",
  confirm: "",
  revenue: "",
  note: "",
});

const platformOptions = ["Facebook", "Google", "Tiktok", "SEO"];

const metricFields = [
  { key: "spend", label: "Spend", prefix: "৳" },
  { key: "result", label: "Result", digits: 0 },
  { key: "confirm", label: "Completed Order", digits: 0 },
  { key: "revenue", label: "Revenue", prefix: "৳" },
  { key: "profit", label: "Profit", prefix: "৳" },
  { key: "loss", label: "Loss", prefix: "৳" },
];

const inputFields = [
  ["spend", "Spend"],
  ["result", "Result"],
  ["confirm", "Confirm"],
  ["revenue", "Revenue"],
];

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDatePresetRange = (preset) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (preset === "today") {
    return { date: toDateInputValue(today), startDate: "", endDate: "" };
  }

  if (preset === "yesterday") {
    start.setDate(today.getDate() - 1);
    return { date: toDateInputValue(start), startDate: "", endDate: "" };
  }

  if (preset === "this_week") {
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(today.getDate() + diffToMonday);
    return {
      date: "",
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(end),
    };
  }

  if (preset === "this_month") {
    start.setDate(1);
    return {
      date: "",
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(end),
    };
  }

  return { date: "", startDate: "", endDate: "" };
};

const formatNumber = (value, digits = 2) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0";
  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

const formatMetric = (value, metric = {}) => {
  const number = formatNumber(value, metric.digits ?? 2);
  return `${metric.prefix || ""}${number}${metric.suffix || ""}`;
};

const normalizeForm = (form) => {
  const payload = { ...form };
  inputFields.forEach(([key]) => {
    payload[key] = Number(payload[key] || 0);
  });
  payload.adsAccountId = payload.adsAccountId ? Number(payload.adsAccountId) : null;
  return payload;
};

const AdsCampaignKPITable = () => {
  const [datePreset, setDatePreset] = useState("this_week");
  const [filters, setFilters] = useState({
    searchTerm: "",
    platform: "",
    adsAccountId: "",
    ...getDatePresetRange("this_week"),
  });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(getDefaultForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewAdsAccountOpen, setIsNewAdsAccountOpen] = useState(false);
  const [newAdsAccountName, setNewAdsAccountName] = useState("");

  const queryArgs = useMemo(
    () => ({
      ...filters,
      page,
      limit: 10,
    }),
    [filters, page],
  );

  const { data, isLoading, isFetching, refetch } =
    useGetAllAdsCampaignKPIQuery(queryArgs);
  const { data: graphRes } = useGetAdsCampaignKPIPerformanceGraphQuery(filters);
  const { data: adsAccountsRes } = useGetAdsAccountsQuery({
    platform: form.platform,
  });
  const { data: filterAdsAccountsRes } = useGetAdsAccountsQuery({
    platform: filters.platform,
  });
  const [insertAdsCampaignKPI, { isLoading: isCreating }] =
    useInsertAdsCampaignKPIMutation();
  const [updateAdsCampaignKPI, { isLoading: isUpdating }] =
    useUpdateAdsCampaignKPIMutation();
  const [deleteAdsCampaignKPI] = useDeleteAdsCampaignKPIMutation();
  const [createAdsAccount, { isLoading: isCreatingAdsAccount }] =
    useCreateAdsAccountMutation();

  const rows = data?.data || [];
  const adsAccounts = adsAccountsRes?.data || [];
  const filterAdsAccounts = filterAdsAccountsRes?.data || [];
  const meta = data?.meta || {};
  const summary = meta.summary || {};
  const graphRows = graphRes?.data || [];
  const totalPages = Math.max(1, Math.ceil((meta.count || 0) / 10));
  const isSaving = isCreating || isUpdating;

  const graphKpiRows = useMemo(
    () =>
      graphRows.map((item) => {
        const spend = Number(item.spend || 0);
        const result = Number(item.result || 0);
        const completedOrder = Number(item.completedOrder ?? item.confirm ?? 0);
        const revenue = Number(item.revenue || 0);
        const profit = Number(item.profit ?? revenue - spend);
        const loss = Number(item.loss ?? Math.max(spend - revenue, 0));

        return {
          date: item.date || "-",
          spend,
          result,
          completedOrder,
          revenue,
          profit,
          loss,
          roi: Number(item.roi || 0),
          roas: Number(item.roas || 0),
        };
      }),
    [graphRows],
  );

  const graphKpiSummary = useMemo(
    () =>
      graphKpiRows.reduce(
        (acc, item) => ({
          spend: acc.spend + item.spend,
          result: acc.result + item.result,
          completedOrder: acc.completedOrder + item.completedOrder,
          revenue: acc.revenue + item.revenue,
          profit: acc.profit + item.profit,
          loss: acc.loss + item.loss,
        }),
        {
          spend: 0,
          result: 0,
          completedOrder: 0,
          revenue: 0,
          profit: 0,
          loss: 0,
        },
      ),
    [graphKpiRows],
  );

  const graphNetProfit = graphKpiSummary.revenue - graphKpiSummary.spend;
  const graphConfirmRate = graphKpiSummary.result
    ? (graphKpiSummary.completedOrder / graphKpiSummary.result) * 100
    : 0;

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => {
      if (key === "platform") {
        return {
          ...prev,
          platform: value,
          adsAccountId: "",
        };
      }

      return { ...prev, [key]: value };
    });
  };

  const updateDatePreset = (preset) => {
    setDatePreset(preset);
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      ...getDatePresetRange(preset),
    }));
  };

  const updateForm = (key, value) => {
    setForm((prev) => {
      if (key === "platform") {
        return {
          ...prev,
          platform: value,
          adsAccountId: "",
          adsAccountName: "",
        };
      }

      return { ...prev, [key]: value };
    });
  };

  const resetForm = () => {
    setForm(getDefaultForm());
    setEditingId(null);
    setIsFormOpen(false);
    setIsNewAdsAccountOpen(false);
    setNewAdsAccountName("");
  };

  const showSavedEntryDate = (entryDate) => {
    if (!entryDate) return;

    setDatePreset("custom");
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      date: "",
      startDate: entryDate,
      endDate: entryDate,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = normalizeForm(form);

    try {
      if (editingId) {
        await updateAdsCampaignKPI({ id: editingId, data: payload }).unwrap();
        toast.success("Campaign KPI updated");
      } else {
        await insertAdsCampaignKPI(payload).unwrap();
        toast.success("Campaign KPI created");
      }
      showSavedEntryDate(payload.date);
      resetForm();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save campaign KPI");
    }
  };

  const handleAdsAccountChange = (value) => {
    if (value === "__new__") {
      setIsNewAdsAccountOpen(true);
      setForm((prev) => ({
        ...prev,
        adsAccountId: "",
        adsAccountName: "",
      }));
      return;
    }

    const selectedAccount = adsAccounts.find(
      (account) => String(account.Id) === String(value),
    );

    setIsNewAdsAccountOpen(false);
    setNewAdsAccountName("");
    setForm((prev) => ({
      ...prev,
      adsAccountId: value,
      adsAccountName: selectedAccount?.accountName || "",
    }));
  };

  const handleCreateAdsAccount = async () => {
    const accountName = newAdsAccountName.trim();
    if (!accountName) {
      toast.error("Ads account name is required");
      return;
    }

    try {
      const res = await createAdsAccount({
        platform: form.platform,
        accountName,
      }).unwrap();
      const created = res?.data || res;
      setForm((prev) => ({
        ...prev,
        adsAccountId: created?.Id || "",
        adsAccountName: created?.accountName || accountName,
      }));
      setNewAdsAccountName("");
      setIsNewAdsAccountOpen(false);
      toast.success("Ads account created");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create ads account");
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.Id);
    setForm({
      campaignName: row.campaignName || "",
      platform: row.platform || "Facebook",
      adsAccountId: row.adsAccountId || "",
      adsAccountName: row.adsAccountName || "",
      date: row.date || "",
      spend: row.spend || "",
      result: row.result || "",
      confirm: row.confirm || "",
      revenue: row.revenue || "",
      note: row.note || "",
    });
    setIsNewAdsAccountOpen(false);
    setNewAdsAccountName("");
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this campaign KPI?")) return;

    try {
      await deleteAdsCampaignKPI(id).unwrap();
      toast.success("Campaign KPI deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete campaign KPI");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">Marketing</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Ads Campaign KPI
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCcw
              size={16}
              className={isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(true);
              setEditingId(null);
              setForm(getDefaultForm());
            }}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {metricFields.map((metric) => (
          <div
            key={metric.key}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {metric.label}
            </p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {formatMetric(summary[metric.key], metric)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-5">
              <label className="relative md:col-span-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={filters.searchTerm}
                  onChange={(event) =>
                    updateFilter("searchTerm", event.target.value)
                  }
                  className="h-10 w-full bg-white rounded-md border border-gray-200 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-orange-400"
                  placeholder="Search campaign"
                />
              </label>
              <select
                value={filters.platform}
                onChange={(event) =>
                  updateFilter("platform", event.target.value)
                }
                className="h-10 bg-white rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
              >
                <option value="">All platforms</option>
                {platformOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={filters.adsAccountId}
                onChange={(event) =>
                  updateFilter("adsAccountId", event.target.value)
                }
                className="h-10 bg-white rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
              >
                <option value="">All ads accounts</option>
                {filterAdsAccounts.map((account) => (
                  <option key={account.Id} value={account.Id}>
                    {account.platform} - {account.accountName}
                  </option>
                ))}
              </select>
              <DateRangeFilter
                startDate={filters.startDate}
                endDate={filters.endDate}
                onStartDateChange={(value) => updateFilter("startDate", value)}
                onEndDateChange={(value) => updateFilter("endDate", value)}
                defaultFilter="thisWeek"
                compact
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Campaign",
                      "Ads Account",
                      "Spend",
                      "Result",
                      "Confirm",
                      "Revenue",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        Loading campaign KPI...
                      </td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <tr key={row.Id} className="hover:bg-orange-50/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {row.campaignName ||
                              row.adsAccountName ||
                              row.platform}
                          </div>
                          <div className="text-xs text-gray-500">
                            {row.platform} • {row.date || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.adsAccountName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          ৳{formatNumber(row.spend)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatNumber(row.result, 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatNumber(row.confirm, 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          ৳{formatNumber(row.revenue)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(row)}
                              className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row.Id)}
                              className="rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No campaign KPI found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-md border border-gray-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className="rounded-md border border-gray-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {isFormOpen ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? "Edit Campaign" : "Add Campaign"}
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.platform}
                    onChange={(event) =>
                      updateForm("platform", event.target.value)
                    }
                    className="h-10 bg-white rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
                  >
                    {platformOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={form.adsAccountId || ""}
                    onChange={(event) =>
                      handleAdsAccountChange(event.target.value)
                    }
                    className="h-10 bg-white rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
                  >
                    <option value="">Ads account</option>
                    {adsAccounts.map((account) => (
                      <option key={account.Id} value={account.Id}>
                        {account.accountName}
                      </option>
                    ))}
                    <option value="__new__">New ads account</option>
                  </select>
                </div>
                {isNewAdsAccountOpen || !adsAccounts.length ? (
                  <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-2">
                    <div className="flex gap-2">
                      <input
                        value={newAdsAccountName}
                        onChange={(event) =>
                          setNewAdsAccountName(event.target.value)
                        }
                        className="h-10 min-w-0 flex-1 bg-white rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
                        placeholder={`${form.platform} ads account name`}
                      />
                      <button
                        type="button"
                        onClick={handleCreateAdsAccount}
                        disabled={isCreatingAdsAccount}
                        className="h-10 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : null}
                <div>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) => updateForm("date", event.target.value)}
                    className="h-10 w-full bg-white rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {inputFields.map(([key, label]) => (
                    <input
                      key={key}
                      type="number"
                      min="0"
                      step={["spend", "revenue"].includes(key) ? "0.01" : "1"}
                      value={form[key]}
                      onChange={(event) => updateForm(key, event.target.value)}
                      className="h-10 bg-white rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400"
                      placeholder={label}
                    />
                  ))}
                </div>
                <textarea
                  value={form.note}
                  onChange={(event) => updateForm("note", event.target.value)}
                  className="min-h-20 w-full bg-white rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                  placeholder="Notes"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {isSaving ? "Saving..." : "Save KPI"}
              </button>
            </form>
          ) : (
            <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50 p-4">
              <BarChart3 className="mb-3 text-indigo-600" size={24} />
              <h2 className="text-base font-semibold text-gray-900">
                Campaign performance
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Track Spend, Result, Confirm and Revenue for each ads campaign.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Profit/Loss KPI Graph
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Spend, result, completed order and revenue based daily profit/loss.
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  graphNetProfit >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {graphNetProfit >= 0 ? "Profit" : "Loss"}
              </span>
            </div>

            {graphKpiRows.length ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-gray-500">
                      Net Profit/Loss
                    </p>
                    <p
                      className={`mt-1 text-lg font-bold ${
                        graphNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      ৳{formatNumber(graphNetProfit)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-gray-500">
                      Confirm Rate
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {formatNumber(graphConfirmRate)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-gray-500">
                      Completed Order
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {formatNumber(graphKpiSummary.completedOrder, 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-gray-500">
                      Revenue
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      ৳{formatNumber(graphKpiSummary.revenue)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={graphKpiRows}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name) => {
                          const moneyFields = [
                            "Spend",
                            "Revenue",
                            "Profit",
                            "Loss",
                          ];
                          return [
                            moneyFields.includes(name)
                              ? `৳${formatNumber(value)}`
                              : formatNumber(value, 0),
                            name,
                          ];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="spend" name="Spend" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="loss" name="Loss" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={graphKpiRows}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value, name) => [formatNumber(value, 0), name]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="result" name="Result" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="completedOrder"
                        name="Completed Order"
                        fill="#0ea5e9"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="completedOrder"
                        name="Completed Trend"
                        stroke="#0369a1"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">No graph data available.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdsCampaignKPITable;
