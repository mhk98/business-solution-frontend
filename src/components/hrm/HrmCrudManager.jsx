import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit,
  Eye,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import HrmWorkspace from "./HrmWorkspace";
import useDebounce from "../../hooks/useDebounce";


const DEFAULT_STAT_ICON_BG = "#EEF2FF";
const DEFAULT_STAT_ICON_COLOR = "#4338CA";

const useNoopApproveMutation = () => [null, { isLoading: false }];

const buildInitialState = (fields = []) =>
  fields.reduce((acc, field) => {
    acc[field.name] =
      field.defaultValue !== undefined ? field.defaultValue : field.type === "checkbox" ? false : "";
    return acc;
  }, {});

const normalizeFieldValue = (field, value) => {
  if (value === undefined || value === null) {
    return field.type === "checkbox" ? false : "";
  }

  if (field.serialize) {
    return field.serialize(value);
  }

  if (field.type === "checkbox") {
    return Boolean(value);
  }

  return value;
};

const HrmCrudManager = ({
  entityLabel,
  title,
  description,
  fields,
  columns,
  useListQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
  useApproveMutation,
  stats = [],
  eyebrow,
}) => {
  const emptyForm = useMemo(() => buildInitialState(fields), [fields]);
  const currentRole = localStorage.getItem("role");
  const isPrivilegedUser = currentRole === "superAdmin" || currentRole === "admin";
  const approvalWorkflowEnabled = Boolean(useApproveMutation);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [deleteRequestNote, setDeleteRequestNote] = useState("");

  const queryArgs = useMemo(
    () => ({
      page: 1,
      limit: 200,
      searchTerm: debouncedSearchTerm || undefined,
    }),
    [searchTerm],
  );

  const { data, isLoading, refetch } = useListQuery(queryArgs);
  const [createItem, { isLoading: isCreating }] = useCreateMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateMutation();
  const [deleteItem] = useDeleteMutation();
  const useApproveItemMutation =
    useApproveMutation || useNoopApproveMutation;
  const [approveItem, { isLoading: isApproving }] = useApproveItemMutation();

  const rows = data?.data || [];
  const derivedStats = useMemo(() => {
    const activeCount = rows.filter((row) => row.status === "Active").length;

    return stats.length
      ? stats
      : [
          {
            name: `Total ${entityLabel}`,
            value: rows.length,
            icon: Plus,
            iconBg: DEFAULT_STAT_ICON_BG,
            iconColor: DEFAULT_STAT_ICON_COLOR,
          },
          {
            name: "Active Records",
            value: activeCount,
            icon: Edit,
            iconBg: "#ECFDF5",
            iconColor: "#047857",
          },
        ];
  }, [entityLabel, rows, stats]);

  useEffect(() => {
    setForm(emptyForm);
  }, [emptyForm]);

  const openCreate = () => {
    setForm(emptyForm);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setForm(emptyForm);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setCurrentItem(null);
    setForm(emptyForm);
  };

  const closeDeleteRequest = () => {
    setIsDeleteRequestOpen(false);
    setCurrentItem(null);
    setDeleteRequestNote("");
  };

  const closeReview = () => {
    setIsReviewOpen(false);
    setCurrentItem(null);
  };

  const openEdit = (item) => {
    setCurrentItem(item);
    setForm(
      fields.reduce((acc, field) => {
        acc[field.name] = normalizeFieldValue(field, item[field.name]);
        return acc;
      }, {}),
    );
    setIsEditOpen(true);
  };

  const setFieldValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    return fields.reduce((acc, field) => {
      let value = form[field.name];

      if (field.type === "checkbox") {
        value = Boolean(value);
      }

      if (field.type === "number") {
        value = value === "" || value === null ? null : Number(value);
      }

      if (typeof value === "string") {
        value = value.trim();
      }

      if (field.parse) {
        value = field.parse(value, form);
      }

      if (value === "" && field.allowEmpty !== true) {
        value = null;
      }

      acc[field.name] = value;
      return acc;
    }, {});
  };

  const validateForm = () => {
    for (const field of fields) {
      const rawValue = form[field.name];
      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

      if (field.required) {
        if (
          value === "" ||
          value === null ||
          value === undefined ||
          (field.type === "number" && Number.isNaN(Number(value)))
        ) {
          toast.error(`${field.label} is required`);
          return false;
        }
      }
    }

    return true;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await createItem(buildPayload()).unwrap();
      if (res?.success) {
        toast.success(res?.message || `${entityLabel} created successfully`);
        closeCreate();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || `Failed to create ${entityLabel}`);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentItem?.Id) return;
    if (!validateForm()) return;

    try {
      const res = await updateItem({
        id: currentItem.Id,
        data: buildPayload(),
      }).unwrap();
      if (res?.success) {
        toast.success(res?.message || `${entityLabel} updated successfully`);
        closeEdit();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || `Failed to update ${entityLabel}`);
    }
  };

  const handleDelete = async (item) => {
    if (approvalWorkflowEnabled && !isPrivilegedUser) {
      setCurrentItem(item);
      setDeleteRequestNote("");
      setIsDeleteRequestOpen(true);
      return;
    }

    const confirmed = await requestDeleteConfirmation({ message: `Delete this ${entityLabel}?` });
    if (!confirmed) return;

    try {
      const res = await deleteItem(
        approvalWorkflowEnabled ? { id: item.Id } : item.Id,
      ).unwrap();
      if (res?.success) {
        toast.success(res?.message || `${entityLabel} deleted successfully`);
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || `Failed to delete ${entityLabel}`);
    }
  };

  const submitDeleteRequest = async (e) => {
    e.preventDefault();

    if (!deleteRequestNote.trim()) {
      toast.error("Please write why you want to delete this record");
      return;
    }

    try {
      const res = await deleteItem({
        id: currentItem?.Id,
        note: deleteRequestNote.trim(),
      }).unwrap();

      if (res?.success) {
        toast.success(res?.message || "Delete request submitted");
        closeDeleteRequest();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || `Failed to request delete for ${entityLabel}`);
    }
  };

  const handleApprove = async (item) => {
    if (!approveItem) return;

    try {
      const res = await approveItem(item.Id).unwrap();
      if (res?.success) {
        toast.success(res?.message || `${entityLabel} approved successfully`);
        closeReview();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || `Failed to approve ${entityLabel}`);
    }
  };

  const renderInput = (field) => {
    const commonClassName =
      "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition";
    const openPicker = () => {
      const input = document.getElementById(`hrm-field-${field.name}`);
      input?.showPicker?.();
      input?.focus();
    };

    if (field.type === "select") {
      return (
        <select
          value={form[field.name]}
          onChange={(e) => setFieldValue(field.name, e.target.value)}
          required={field.required}
          className={commonClassName}
        >
          <option value="">{field.placeholder || `Select ${field.label}`}</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          value={form[field.name]}
          onChange={(e) => setFieldValue(field.name, e.target.value)}
          rows={4}
          placeholder={field.placeholder}
          required={field.required}
          className={commonClassName}
        />
      );
    }

    if (field.type === "time") {
      return (
        <div className="relative">
          <input
            type="time"
            value={form[field.name]}
            onChange={(e) => setFieldValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={`${commonClassName} cursor-pointer pr-12 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100`}
          />
          <Clock3
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      );
    }

    if (field.type === "datetime-local") {
      return (
        <div className="relative">
          <input
            id={`hrm-field-${field.name}`}
            type="datetime-local"
            value={form[field.name]}
            onChange={(e) => setFieldValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={`${commonClassName} cursor-pointer pr-12 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
          />
          <button
            type="button"
            onClick={openPicker}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
            title={`Pick ${field.label}`}
            aria-label={`Pick ${field.label}`}
          >
            <CalendarClock size={18} />
          </button>
        </div>
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={form[field.name]}
        onChange={(e) => setFieldValue(field.name, e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        className={commonClassName}
      />
    );
  };

  const renderForm = (onSubmit, loading) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              {field.label}
            </span>
            {renderInput(field)}
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );

  return (
    <HrmWorkspace
      eyebrow={eyebrow}
      title={title}
      description={description}
      stats={derivedStats}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Workspace</h3>
            <p className="mt-1 text-sm text-slate-500">
              Search, create and maintain {entityLabel.toLowerCase()} records from this section.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="relative block w-full sm:w-60">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${entityLabel}`}
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
            >
              <Plus size={16} />
              {isPrivilegedUser ? `Add ${entityLabel}` : `Submit ${entityLabel}`}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">Records</div>
            <div className="text-xs text-slate-500">
              {rows.length} row{rows.length === 1 ? "" : "s"} loaded
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left font-semibold text-slate-700"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.Id} className="hover:bg-slate-50/60">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-slate-700">
                        {column.render ? column.render(row) : row[column.key] || "-"}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {approvalWorkflowEnabled && (row.pendingAction || row.approvalNote) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentItem(row);
                              setIsReviewOpen(true);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {approvalWorkflowEnabled && isPrivilegedUser && approveItem && row.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(row)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12">
                    <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
                      <div className="text-base font-semibold text-slate-800">
                        No {entityLabel.toLowerCase()} found
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Create your first {entityLabel.toLowerCase()} record to start organizing this section.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title={`Create ${entityLabel}`}
        maxWidth="max-w-4xl"
      >
        {renderForm(handleCreate, isCreating)}
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={closeEdit}
        title={`Update ${entityLabel}`}
        maxWidth="max-w-4xl"
      >
        {renderForm(handleUpdate, isUpdating)}
      </Modal>

      <Modal
        isOpen={isDeleteRequestOpen}
        onClose={closeDeleteRequest}
        title={`Delete ${entityLabel}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={submitDeleteRequest} className="space-y-4">
          <p className="text-sm text-slate-600">
            Admin approval is required before this record can be deleted. Please write the reason for deletion.
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Delete Note</span>
            <textarea
              rows={5}
              value={deleteRequestNote}
              onChange={(e) => setDeleteRequestNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition"
              placeholder={`Why should this ${entityLabel.toLowerCase()} be deleted?`}
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isReviewOpen}
        onClose={closeReview}
        title={`${entityLabel} Review`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Status
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {currentItem?.status || "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Pending Action
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {currentItem?.pendingAction || "None"}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Request Note
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {currentItem?.approvalNote || "No note added."}
            </p>
          </div>
          {isPrivilegedUser && approveItem && currentItem?.status === "Pending" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleApprove(currentItem)}
                disabled={isApproving}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isApproving
                  ? currentItem?.pendingAction === "Delete"
                    ? "Deleting..."
                    : "Approving..."
                  : currentItem?.pendingAction === "Delete"
                    ? "Approve & Delete"
                    : "Approve"}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </HrmWorkspace>
  );
};

export default HrmCrudManager;
