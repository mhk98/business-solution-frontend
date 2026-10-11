import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Modal from "../common/Modal";
import useDebounce from "../../hooks/useDebounce";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import {
  useDeleteAssetMutation,
  useGetAllAssetQuery,
  useInsertAssetMutation,
  useUpdateAssetMutation,
} from "../../features/assets/assets";

const PAGE_SIZE = 20;

const errorMessage = (error, fallback) => error?.data?.message || fallback;

// Master list of asset names. Requisition / Purchase / Sale / Damage pick from here.
const AssetTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = rename
  const [name, setName] = useState("");

  const { data, isFetching } = useGetAllAssetQuery({
    page,
    limit: PAGE_SIZE,
    searchTerm: debouncedSearch.trim() || undefined,
  });
  const [insertAsset, { isLoading: isCreating }] = useInsertAssetMutation();
  const [updateAsset, { isLoading: isUpdating }] = useUpdateAssetMutation();
  const [deleteAsset] = useDeleteAssetMutation();

  const rows = data?.data || [];
  const total = data?.meta?.count ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openForm = (row = {}) => {
    setEditing(row);
    setName(row.name || "");
  };
  const closeForm = () => {
    setEditing(null);
    setName("");
  };

  const save = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Asset name is required");
      return;
    }
    try {
      if (editing?.Id) {
        await updateAsset({ id: editing.Id, data: { name: trimmed } }).unwrap();
        toast.success("Asset renamed");
      } else {
        await insertAsset({ name: trimmed }).unwrap();
        toast.success("Asset created");
      }
      closeForm();
    } catch (error) {
      toast.error(
        /unique|duplicate|already/i.test(error?.data?.message || "")
          ? "An asset with this name already exists"
          : errorMessage(error, "Failed to save asset"),
      );
    }
  };

  const remove = async (row) => {
    const confirmed = await requestDeleteConfirmation({
      title: "Delete asset?",
      message: `"${row.name}" will be removed from the asset list.`,
    });
    if (!confirmed) return;
    try {
      await deleteAsset(row.Id).unwrap();
      toast.success("Asset deleted");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete asset"));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Assets</h2>
          <p className="text-sm text-slate-500">
            Create the assets here; Requisition, Purchase, Sale and Damage pick from this list.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Add Asset
        </button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          placeholder="Search asset"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.Id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-500">{String(row.createdAt || "").slice(0, 10) || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openForm(row)}
                      title="Rename"
                      className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      title="Delete"
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  {isFetching ? "Loading…" : "No assets yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page} of {pages} · {total} assets
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={closeForm}
        title={editing?.Id ? "Rename Asset" : "Add Asset"}
        maxWidth="max-w-md"
      >
        <form onSubmit={save} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Laptop"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isCreating || isUpdating ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetTable;
