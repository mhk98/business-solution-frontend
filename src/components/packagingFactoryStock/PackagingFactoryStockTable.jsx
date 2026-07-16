import { PackageCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import DateRangeFilter from "../common/DateRangeFilter";
import { useGetAllPackagingItemWithoutQueryQuery } from "../../features/packagingItem/packagingItem";
import { useGetAllPackagingManufacturerWithoutQueryQuery } from "../../features/packagingManufacturer/packagingManufacturer";
import { useGetAllPackagingFactoryStockQuery } from "../../features/packagingFactoryStock/packagingFactoryStock";

const selectStyles = { control: (base) => ({ ...base, minHeight: 44, borderRadius: 12, borderColor: "#e2e8f0" }), menu: (base) => ({ ...base, zIndex: 50 }) };
const money = (v) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unitCost = (row) => Number(row?.unitValue || 0) > 0 ? Number(row?.cost || 0) / Number(row.unitValue) : 0;

const PackagingFactoryStockTable = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  useEffect(() => setPage(1), [startDate, endDate, name, manufacturerId]);
  const { data: itemRes } = useGetAllPackagingItemWithoutQueryQuery();
  const { data: manufacturerRes } = useGetAllPackagingManufacturerWithoutQueryQuery();
  const itemOptions = useMemo(() => (itemRes?.data || []).map((x) => ({ value: x.name, label: x.name })), [itemRes?.data]);
  const manufacturerOptions = useMemo(() => (manufacturerRes?.data || []).map((x) => ({ value: String(x.Id), label: x.name })), [manufacturerRes?.data]);
  const { data, isLoading } = useGetAllPackagingFactoryStockQuery({ page, limit, startDate: startDate || undefined, endDate: endDate || undefined, name: name || undefined, manufacturerId: manufacturerId || undefined });
  const rows = data?.data || [];
  const totalPages = Math.max(1, Math.ceil((data?.meta?.count || 0) / limit));
  return (
    <div className="bg-white/90 rounded-3xl p-4 sm:p-8 border border-slate-100 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10"><div><h2 className="text-2xl font-black text-slate-900">Packaging Factory Stock</h2><p className="text-slate-500 text-sm mt-1 font-medium">Manufacturer-wise packaging factory stock.</p></div><div className="inline-flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl"><PackageCheck className="text-indigo-600" size={24} /><div><div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Total Stock</div><div className="text-xl font-black text-indigo-900">{isLoading ? "Syncing" : (data?.meta?.totalQuantity ?? 0).toLocaleString()}</div></div></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end"><DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} compact className="sm:col-span-2" /><Select options={itemOptions} value={itemOptions.find((o) => o.value === name) || null} onChange={(s) => setName(s?.value || "")} placeholder="Packaging item..." isClearable styles={selectStyles} /><Select options={manufacturerOptions} value={manufacturerOptions.find((o) => o.value === manufacturerId) || null} onChange={(s) => setManufacturerId(s?.value || "")} placeholder="Manufacturer..." isClearable styles={selectStyles} /><button onClick={() => { setStartDate(""); setEndDate(""); setName(""); setManufacturerId(""); }} className="h-11 bg-slate-100 text-slate-600 rounded-xl px-4 font-bold flex items-center justify-center gap-2 border" type="button"><X size={16} /> Clear</button></div>
      <div className="overflow-hidden rounded-3xl border border-slate-100"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50/50"><tr>{["Packaging Item", "Manufacturer", "Quantity", "Unit", "Unit Cost", "Total Cost"].map((h) => <th key={h} className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.Id}><td className="px-6 py-5 text-sm font-bold">{row.name}</td><td className="px-6 py-5 text-sm">{row.manufacturerName || "N/A"}</td><td className="px-6 py-5 text-sm">{Number(row.unitValue || 0).toLocaleString()}</td><td className="px-6 py-5 text-sm">{row.unit || "Pcs"}</td><td className="px-6 py-5 text-sm">{money(unitCost(row))}</td><td className="px-6 py-5 text-sm font-bold">{money(row.cost)}</td></tr>)}</tbody></table>{isLoading && <div className="py-16 text-center text-slate-500 font-bold">Syncing...</div>}{!isLoading && rows.length === 0 && <div className="py-16 text-center text-slate-400 font-bold">No packaging factory stock found.</div>}</div>
      <div className="flex justify-end gap-2 mt-8"><button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-10 px-5 border rounded-xl disabled:opacity-50" type="button">Prev</button><span className="h-10 px-5 rounded-xl bg-indigo-600 text-white font-bold flex items-center">{page} / {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-10 px-5 border rounded-xl disabled:opacity-50" type="button">Next</button></div>
    </div>
  );
};

export default PackagingFactoryStockTable;
