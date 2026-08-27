import { motion } from "framer-motion";
import { Edit, Plus, Search, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import {
  useDeleteDirectorMutation,
  useGetAllDirectorWithoutQueryQuery,
  useInsertDirectorMutation,
  useUpdateDirectorMutation,
} from "../../features/ownerTransaction/directorProfitShare";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import Modal from "../common/Modal";

const directorEmptyForm = { name: "", note: "", status: "Active" };
const formatAmount = (value) => `৳${Number(value || 0).toLocaleString()}`;

const DirectorTable = () => {
  const navigate = useNavigate();
  const [selectedDirectorId, setSelectedDirectorId] = useState("");
  const [directorModalOpen, setDirectorModalOpen] = useState(false);
  const [editingDirector, setEditingDirector] = useState(null);
  const [directorForm, setDirectorForm] = useState(directorEmptyForm);

  const { data: directorRes, isLoading: directorsLoading } =
    useGetAllDirectorWithoutQueryQuery();
  const [insertDirector, { isLoading: creatingDirector }] = useInsertDirectorMutation();
  const [updateDirector, { isLoading: updatingDirector }] = useUpdateDirectorMutation();
  const [deleteDirector] = useDeleteDirectorMutation();

  const directors = directorRes?.data || [];
  const directorSaving = creatingDirector || updatingDirector;
  const directorOptions = useMemo(
    () =>
      directors.map((director) => ({
        value: String(director.Id),
        label: director.name,
      })),
    [directors],
  );
  const selectedDirectorOption =
    directorOptions.find((option) => option.value === String(selectedDirectorId)) ||
    null;
  const visibleDirectors = selectedDirectorId
    ? directors.filter((director) => String(director.Id) === String(selectedDirectorId))
    : directors;

  const openDirectorCreate = () => {
    setEditingDirector(null);
    setDirectorForm(directorEmptyForm);
    setDirectorModalOpen(true);
  };

  const openDirectorEdit = (director) => {
    setEditingDirector(director);
    setDirectorForm({
      name: director.name || "",
      note: director.note || "",
      status: director.status || "Active",
    });
    setDirectorModalOpen(true);
  };

  const closeDirectorModal = () => {
    setDirectorModalOpen(false);
    setEditingDirector(null);
    setDirectorForm(directorEmptyForm);
  };

  const handleDirectorSave = async (event) => {
    event.preventDefault();
    const payload = {
      name: directorForm.name.trim(),
      note: directorForm.note.trim(),
      status: directorForm.status || "Active",
    };
    if (!payload.name) return toast.error("Director name is required!");

    try {
      const res = editingDirector
        ? await updateDirector({ id: editingDirector.Id, data: payload }).unwrap()
        : await insertDirector(payload).unwrap();
      if (res?.success) {
        const savedDirectorId = res?.data?.Id || res?.data?.id || editingDirector?.Id;
        if (savedDirectorId) setSelectedDirectorId(String(savedDirectorId));
        toast.success(editingDirector ? "Director updated!" : "Director added!");
        closeDirectorModal();
      } else {
        toast.error(res?.message || "Save failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    }
  };

  const handleDirectorDelete = async (director) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete director?",
      itemName: director.name,
    });
    if (!confirmed) return;

    try {
      const res = await deleteDirector(director.Id).unwrap();
      if (res?.success) {
        if (String(selectedDirectorId) === String(director.Id)) setSelectedDirectorId("");
        toast.success("Director deleted!");
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const openDirectorHistory = (director) => {
    if (!director?.Id) return;
    navigate(`/director-profit-share/${director.Id}`);
  };

  const handleRowKeyDown = (event, director) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDirectorHistory(director);
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
          <h2 className="text-2xl font-bold text-slate-900">Directors</h2>
          <p className="text-sm text-slate-500">
            Create, edit, delete, and open transaction history.
          </p>
        </div>
        <button
          type="button"
          onClick={openDirectorCreate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Director
        </button>
      </div>

      <div className="mt-5 max-w-xl">
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          <Search size={14} />
          Search Director
        </div>
        <Select
          value={selectedDirectorOption}
          onChange={(selected) =>
            setSelectedDirectorId(selected?.value ? String(selected.value) : "")
          }
          options={directorOptions}
          placeholder={directorsLoading ? "Loading directors..." : "Search director..."}
          isClearable
          isSearchable
          isLoading={directorsLoading}
          styles={selectStyles}
          classNamePrefix="react-select"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHead>Director Name</TableHead>
              <TableHead>Invest Amount</TableHead>
              <TableHead>Profit Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note</TableHead>
              <TableHead align="right">Actions</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleDirectors.map((director) => (
              <tr
                key={director.Id}
                role="button"
                tabIndex={0}
                onClick={() => openDirectorHistory(director)}
                onKeyDown={(event) => handleRowKeyDown(event, director)}
                className="cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:bg-indigo-50"
              >
                <td className="px-5 py-4">
                  <div className="inline-flex items-center gap-3 font-semibold text-slate-900">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <UserRound size={18} />
                    </span>
                    {director.name}
                  </div>
                </td>
                <TableCell strong>{formatAmount(director.totalInvest)}</TableCell>
                <TableCell strong>{formatAmount(director.totalProfit)}</TableCell>
                <TableCell strong>{formatAmount(director.netBalance)}</TableCell>
                <TableCell>{director.status || "Active"}</TableCell>
                <TableCell>{director.note || "---"}</TableCell>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDirectorEdit(director);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDirectorDelete(director);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!directorsLoading && visibleDirectors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                  No director found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={directorModalOpen}
        onClose={closeDirectorModal}
        title={editingDirector ? "Edit Director" : "Add Director"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleDirectorSave} className="space-y-4">
          <FormInput
            label="Director Name"
            value={directorForm.name}
            onChange={(value) => setDirectorForm((p) => ({ ...p, name: value }))}
            placeholder="Director name"
          />
          <FormSelect
            label="Status"
            value={directorForm.status}
            onChange={(value) => setDirectorForm((p) => ({ ...p, status: value }))}
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
          <FormTextarea
            label="Note"
            value={directorForm.note}
            onChange={(value) => setDirectorForm((p) => ({ ...p, note: value }))}
            placeholder="Optional note"
          />
          <ModalActions
            onCancel={closeDirectorModal}
            loading={directorSaving}
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

export default DirectorTable;
