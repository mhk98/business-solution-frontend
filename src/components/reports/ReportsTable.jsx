import { Download, FileSpreadsheet, FileText, RefreshCcw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import DateRangeFilter from "../common/DateRangeFilter";
import { useGetGenericReportQuery } from "../../features/reports/reports";
import {
  getReportGroupByKey,
  getReportsByGroup,
  REPORT_CATALOG,
} from "../../utils/reports/reportCatalog";
import {
  buildReportTable,
  downloadGenericReportPdf,
  downloadGenericReportXlsx,
} from "../../utils/reports/genericReportExport";

const sanitizeFilename = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const ReportsTable = () => {
  const navigate = useNavigate();
  const { groupKey, reportKey } = useParams();
  const reportGroup = getReportGroupByKey(groupKey);
  const availableReports = useMemo(() => {
    const groupReports = getReportsByGroup(reportGroup?.key);
    return groupReports.length ? groupReports : REPORT_CATALOG;
  }, [reportGroup]);
  const selectedReport = useMemo(
    () =>
      availableReports.find((report) => report.key === reportKey) ||
      availableReports[0] ||
      REPORT_CATALOG[0],
    [availableReports, reportKey],
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(5000);
  const getReportRoute = (nextReportKey) =>
    reportGroup
      ? `/reports/group/${reportGroup.key}/${nextReportKey}`
      : `/reports/${nextReportKey}`;

  const params = useMemo(() => {
    const startDateParam = selectedReport.startDateParam || "startDate";
    const endDateParam = selectedReport.endDateParam || "endDate";
    const nextParams = {
      page: 1,
      limit,
      ...(selectedReport.extraParams || {}),
      [startDateParam]: startDate || undefined,
      [endDateParam]: endDate || undefined,
    };

    if (searchTerm.trim()) {
      nextParams[selectedReport.searchParam || "searchTerm"] = searchTerm.trim();
      nextParams.searchTerm = searchTerm.trim();
      nextParams.name = searchTerm.trim();
    }

    Object.keys(nextParams).forEach((key) => {
      if (!nextParams[key]) delete nextParams[key];
    });

    return nextParams;
  }, [endDate, limit, searchTerm, selectedReport, startDate]);

  const { data, isFetching, refetch, error } = useGetGenericReportQuery({
    endpoint: selectedReport.endpoint,
    params,
  });

  const rows = data?.rows || [];
  const { headers, body } = useMemo(
    () => buildReportTable(rows, selectedReport),
    [rows, selectedReport],
  );
  const filename = sanitizeFilename(`${selectedReport.label}-report`);

  const handleXlsx = () => {
    if (!rows.length) {
      toast.error("No rows available to export");
      return;
    }
    downloadGenericReportXlsx({
      title: `${selectedReport.label} Report`,
      rows,
      filename,
      report: selectedReport,
    });
  };

  const handlePdf = async () => {
    if (!rows.length) {
      toast.error("No rows available to export");
      return;
    }
    await downloadGenericReportPdf({
      title: `${selectedReport.label} Report`,
      rows,
      filename,
      report: selectedReport,
    });
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-100 shadow-sm rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4">
              <FileSpreadsheet size={22} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {selectedReport.label} Report
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {reportGroup ? `${reportGroup.label} reports. ` : ""}
              Filter table data and download it as Google Sheets compatible XLSX or PDF.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[220px_160px_auto_auto] gap-3 w-full xl:w-auto">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Table
              </label>
              <select
                value={selectedReport.key}
                onChange={(event) => navigate(getReportRoute(event.target.value))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                {availableReports.map((report) => (
                  <option key={report.key} value={report.key}>
                    {report.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Max Rows
              </label>
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                {[500, 1000, 5000, 10000].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleXlsx}
              className="h-11 self-end inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
            >
              <Download size={16} /> Sheet
            </button>

            <button
              type="button"
              onClick={handlePdf}
              className="h-11 self-end inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-100 shadow-sm rounded-3xl p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,1.5fr)_auto_auto] gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search report..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            defaultFilter=""
            compact
            label="Date"
          />

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStartDate("");
              setEndDate("");
            }}
            className="h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-700 hover:bg-slate-200 active:scale-95 transition"
          >
            <X size={16} /> Reset
          </button>

          <button
            type="button"
            onClick={refetch}
            className="h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition"
          >
            <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </section>

      <section className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 sm:px-6 py-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Preview</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {isFetching ? "Syncing..." : `${rows.length} rows loaded`}
            </p>
          </div>
        </div>

        {error ? (
          <div className="px-6 py-10 text-sm font-semibold text-rose-600">
            Failed to load this report. Please check the selected table endpoint.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {headers.slice(0, 12).map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isFetching ? (
                  <tr>
                    <td className="px-4 py-8 text-sm font-semibold text-slate-500" colSpan={12}>
                      Loading report data...
                    </td>
                  </tr>
                ) : body.length ? (
                  body.slice(0, 50).map((row, rowIndex) => (
                    <tr key={`${row[0]}-${rowIndex}`} className="hover:bg-slate-50/70">
                      {row.slice(0, 12).map((cell, cellIndex) => (
                        <td
                          key={`${row[0]}-${cellIndex}`}
                          className="max-w-[260px] whitespace-pre-line break-words px-4 py-3 align-top text-sm font-medium text-slate-700"
                          title={String(cell)}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-sm font-semibold text-slate-500" colSpan={12}>
                      No rows found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ReportsTable;
