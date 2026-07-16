import { Edit, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import {
  useDeletePackagingManufacturerMutation,
  useGetAllPackagingManufacturerQuery,
  useInsertPackagingManufacturerMutation,
  usePayPackagingManufacturerMutation,
  useUpdatePackagingManufacturerMutation,
} from "../../features/packagingManufacturer/packagingManufacturer";

const emptyForm = { name: "", phone: "", address: "" };

const PackagingManufacturerTable = () => {
  const role = localStorage.getItem("role");
  const canManage = role === "superAdmin" || role === "admin";
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [payment, setPayment] = useState({ amount: "", note: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryArgs = useMemo(
    () => ({ page, limit, searchTerm: searchTerm || undefined }),
    [page, searchTerm],
  );
  const { data, isLoading, refetch } =
    useGetAllPackagingManufacturerQuery(queryArgs);
  const rows = data?.data || [];
  const totalPages = Math.max(1, Math.ceil((data?.meta?.count || 0) / limit));
  const [insertManufacturer] = useInsertPackagingManufacturerMutation();
  const [updateManufacturer] = useUpdatePackagingManufacturerMutation();
  const [deleteManufacturer] = useDeletePackagingManufacturerMutation();
  const [payManufacturer] = usePayPackagingManufacturerMutation();

  useEffect(() => setPage(1), [searchTerm]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      phone: row.phone || "",
      address: row.address || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = editing
        ? await updateManufacturer({ id: editing.Id, data: form }).unwrap()
        : await insertManufacturer(form).unwrap();
      if (res?.success) {
        toast.success(
          editing
            ? "Packaging manufacturer updated"
            : "Packaging manufacturer created",
        );
        setIsOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const handleDelete = async (id) => {
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this manufacturer?",
      }))
    )
      return;
    try {
      const res = await deleteManufacturer(id).unwrap();
      if (res?.success !== false) {
        toast.success("Packaging manufacturer deleted");
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const openPayment = (row) => {
    setPaying(row);
    setPayment({ amount: "", note: "" });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (Number(payment.amount || 0) <= 0)
      return toast.error("Please enter valid paid amount");
    try {
      const res = await payManufacturer({
        id: paying.Id,
        data: payment,
      }).unwrap();
      if (res?.success) {
        toast.success("Payment added");
        setPaying(null);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Payment failed!");
    }
  };

  return (
    <div className="bg-white/90 rounded-3xl p-4 sm:p-8 border border-slate-100 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Packaging Manufacturer
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Manage packaging manufacturers.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm"
            type="button"
          >
            Add <Plus size={18} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
          className="h-11 px-4 rounded-xl bg-white border border-slate-200 outline-none"
        />
        <button
          onClick={() => setSearchTerm("")}
          className="h-11 bg-slate-100 text-slate-600 rounded-xl px-5 font-bold flex items-center justify-center gap-2 border border-slate-200"
          type="button"
        >
          <X size={16} /> Clear
        </button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              {["Name", "Phone", "Paid", "Unpaid", "Address", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.Id}>
                <td className="px-6 py-5 text-sm font-bold text-slate-900">
                  {row.name}
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">
                  {row.phone || "N/A"}
                </td>
                <td className="px-6 py-5 text-sm text-emerald-700 font-bold">
                  {Number(row.paidAmount || 0).toLocaleString()}
                </td>
                <td className="px-6 py-5 text-sm text-rose-700 font-bold">
                  {Number(row.unpaidAmount || 0).toLocaleString()}
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">
                  {row.address || "N/A"}
                </td>
                <td className="px-6 py-5">
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPayment(row)}
                        className="h-9 px-3 border rounded-xl flex items-center justify-center text-xs font-bold text-emerald-700"
                        type="button"
                      >
                        Pay
                      </button>
                      <button
                        onClick={() => openEdit(row)}
                        className="h-9 w-9 border rounded-xl flex items-center justify-center"
                        type="button"
                      >
                        <Edit className="text-indigo-600" size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(row.Id)}
                        className="h-9 w-9 border rounded-xl flex items-center justify-center"
                        type="button"
                      >
                        <Trash2 className="text-red-600" size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <div className="py-16 text-center text-slate-500 font-bold">
            Syncing...
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="py-16 text-center text-slate-400 font-bold">
            No packaging manufacturer found.
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-8">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="h-10 px-5 border rounded-xl disabled:opacity-50"
          type="button"
        >
          Prev
        </button>
        <span className="h-10 px-5 rounded-xl bg-indigo-600 text-white font-bold flex items-center">
          {page} / {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="h-10 px-5 border rounded-xl disabled:opacity-50"
          type="button"
        >
          Next
        </button>
      </div>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          editing ? "Edit Packaging Manufacturer" : "Add Packaging Manufacturer"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="h-12 bg-white border rounded-2xl px-4 w-full"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone"
            className="h-12 bg-white border rounded-2xl px-4 w-full"
          />
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            className="min-h-24 bg-white border rounded-2xl px-4 py-3 w-full"
          />
          <div className="flex justify-end pt-4 border-t">
            <button
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={!!paying}
        onClose={() => setPaying(null)}
        title="Pay Packaging Manufacturer"
      >
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="text-sm font-bold text-slate-700">
            Unpaid: {Number(paying?.unpaidAmount || 0).toLocaleString()}
          </div>
          <input
            type="number"
            step="any"
            value={payment.amount}
            onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
            placeholder="Paid amount"
            className="h-12 border rounded-2xl px-4 w-full"
          />
          <textarea
            value={payment.note}
            onChange={(e) => setPayment({ ...payment, note: e.target.value })}
            placeholder="Note"
            className="min-h-24 border rounded-2xl px-4 py-3 w-full"
          />
          <div className="flex justify-end pt-4 border-t">
            <button
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold"
              type="submit"
            >
              Save Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PackagingManufacturerTable;
