import { motion } from "framer-motion";
import { Edit, Plus, Search, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import Select from "react-select";
import {
  useDeleteOwnerMutation,
  useGetAllOwnerWithoutQueryQuery,
  useInsertOwnerMutation,
  useUpdateOwnerMutation,
} from "../../features/ownerTransaction/ownerTransaction";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";

const ownerEmptyForm = { name: "", note: "", status: "Active" };
const formatAmount = (value) => `৳${Number(value || 0).toLocaleString()}`;

const OwnerTable = () => {
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [ownerForm, setOwnerForm] = useState(ownerEmptyForm);

  const { data: ownerRes, isLoading: ownersLoading } =
    useGetAllOwnerWithoutQueryQuery();
  const [insertOwner, { isLoading: creatingOwner }] = useInsertOwnerMutation();
  const [updateOwner, { isLoading: updatingOwner }] = useUpdateOwnerMutation();
  const [deleteOwner] = useDeleteOwnerMutation();

  const owners = ownerRes?.data || [];
  const ownerSaving = creatingOwner || updatingOwner;
  const ownerOptions = useMemo(
    () =>
      owners.map((owner) => ({
        value: String(owner.Id),
        label: owner.name,
      })),
    [owners],
  );
  const selectedOwnerOption =
    ownerOptions.find((option) => option.value === String(selectedOwnerId)) ||
    null;
  const visibleOwners = selectedOwnerId
    ? owners.filter((owner) => String(owner.Id) === String(selectedOwnerId))
    : owners;

  const openOwnerCreate = () => {
    setEditingOwner(null);
    setOwnerForm(ownerEmptyForm);
    setOwnerModalOpen(true);
  };

  const openOwnerEdit = (owner) => {
    setEditingOwner(owner);
    setOwnerForm({
      name: owner.name || "",
      note: owner.note || "",
      status: owner.status || "Active",
    });
    setOwnerModalOpen(true);
  };

  const closeOwnerModal = () => {
    setOwnerModalOpen(false);
    setEditingOwner(null);
    setOwnerForm(ownerEmptyForm);
  };

  const handleOwnerSave = async (event) => {
    event.preventDefault();
    const payload = {
      name: ownerForm.name.trim(),
      note: ownerForm.note.trim(),
      status: ownerForm.status || "Active",
    };
    if (!payload.name) return toast.error("Owner name is required!");

    try {
      const res = editingOwner
        ? await updateOwner({ id: editingOwner.Id, data: payload }).unwrap()
        : await insertOwner(payload).unwrap();
      if (res?.success) {
        const savedOwnerId = res?.data?.Id || res?.data?.id || editingOwner?.Id;
        if (savedOwnerId) setSelectedOwnerId(String(savedOwnerId));
        toast.success(editingOwner ? "Owner updated!" : "Owner added!");
        closeOwnerModal();
      } else {
        toast.error(res?.message || "Save failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const handleOwnerDelete = async (owner) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete owner?",
      itemName: owner.name,
    });
    if (!confirmed) return;

    try {
      const res = await deleteOwner(owner.Id).unwrap();
      if (res?.success) {
        if (String(selectedOwnerId) === String(owner.Id)) setSelectedOwnerId("");
        toast.success("Owner deleted!");
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  return (
    <motion.div
      className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Owners</h2>
          <p className="text-sm text-slate-500">
            Create, edit, delete, and open transaction history.
          </p>
        </div>
        <button
          type="button"
          onClick={openOwnerCreate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Owner
        </button>
      </div>

      <div className="mt-5 max-w-xl">
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          <Search size={14} />
          Search Owner
        </div>
        <Select
          value={selectedOwnerOption}
          onChange={(selected) =>
            setSelectedOwnerId(selected?.value ? String(selected.value) : "")
          }
          options={ownerOptions}
          placeholder={ownersLoading ? "Loading owners..." : "Search owner..."}
          isClearable
          isSearchable
          isLoading={ownersLoading}
          styles={selectStyles}
          classNamePrefix="react-select"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHead>Owner Name</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note</TableHead>
              <TableHead align="right">Actions</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleOwners.map((owner) => (
              <tr key={owner.Id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <Link
                    to={`/owner/${owner.Id}`}
                    className="inline-flex items-center gap-3 font-semibold text-slate-900 hover:text-indigo-600"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <UserRound size={18} />
                    </span>
                    {owner.name}
                  </Link>
                </td>
                <TableCell strong>{formatAmount(owner.netBalance)}</TableCell>
                <TableCell>{owner.status || "Active"}</TableCell>
                <TableCell>{owner.note || "---"}</TableCell>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openOwnerEdit(owner)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOwnerDelete(owner)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!ownersLoading && visibleOwners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                  No owner found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={ownerModalOpen}
        onClose={closeOwnerModal}
        title={editingOwner ? "Edit Owner" : "Add Owner"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleOwnerSave} className="space-y-4">
          <FormInput
            label="Owner Name"
            value={ownerForm.name}
            onChange={(value) => setOwnerForm((p) => ({ ...p, name: value }))}
            placeholder="Owner name"
          />
          <FormSelect
            label="Status"
            value={ownerForm.status}
            onChange={(value) => setOwnerForm((p) => ({ ...p, status: value }))}
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
          <FormTextarea
            label="Note"
            value={ownerForm.note}
            onChange={(value) => setOwnerForm((p) => ({ ...p, note: value }))}
            placeholder="Optional note"
          />
          <ModalActions
            onCancel={closeOwnerModal}
            loading={ownerSaving}
            submitLabel="Save"
          />
        </form>
      </Modal>
    </motion.div>
  );
};

const TableHead = ({ children, align = "left" }) => (
  <th
    className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 ${
      align === "right" ? "text-right" : "text-left"
    }`}
  >
    {children}
  </th>
);

const TableCell = ({ children, strong = false }) => (
  <td
    className={`px-5 py-4 text-sm ${
      strong ? "font-semibold text-slate-900" : "text-slate-700"
    }`}
  >
    {children}
  </td>
);

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(99, 102, 241, 0.18)" : "none",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#c7d2fe" : "#cbd5e1" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  input: (base) => ({ ...base, color: "#0f172a" }),
  singleValue: (base) => ({ ...base, color: "#0f172a", fontSize: 14 }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 14 }),
  menu: (base) => ({ ...base, borderRadius: 12, overflow: "hidden", zIndex: 60 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#4f46e5"
      : state.isFocused
        ? "#eef2ff"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontSize: 14,
  }),
};

const FormInput = ({ label, value, onChange, placeholder, type = "text" }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">
      {label}
    </span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={fieldClass}
    />
  </label>
);

const FormSelect = ({ label, value, onChange, options, placeholder }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const FormTextarea = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">
      {label}
    </span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
    />
  </label>
);

const ModalActions = ({ onCancel, loading, submitLabel }) => (
  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
    <button
      type="button"
      onClick={onCancel}
      className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={loading}
      className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
    >
      {loading ? "Saving..." : submitLabel}
    </button>
  </div>
);

export default OwnerTable;
