import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import Pagination from "../common/Pagination";
import useDebounce from "../../hooks/useDebounce";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import {
  useDeleteCategoryMutation,
  useGetAllCategoryQuery,
  useInsertCategoryMutation,
  useUpdateCategoryMutation,
} from "../../features/category/category";

const ITEMS_PER_PAGE = 10;
const CATEGORY_STATUS_OPTIONS = ["Expense", "Not Expense"];
const getCategoryStatus = (status) =>
  status === "Not Expense" ? "Not Expense" : "Expense";

const CategoryTable = () => {
  const role = localStorage.getItem("role");
  const canManage = role === "superAdmin" || role === "admin" || role === "accountant";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [createCategory, setCreateCategory] = useState({
    name: "",
    status: "Expense",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };

    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);
    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  const { data, isLoading, isError, error, refetch } = useGetAllCategoryQuery({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    searchTerm: debouncedSearchTerm || undefined,
  });

  const categories = data?.data ?? [];

  useEffect(() => {
    if (isError) {
      console.error("Error fetching category data", error);
      return;
    }

    if (!isLoading && data?.meta?.count != null) {
      setTotalPages(Math.max(1, Math.ceil(data.meta.count / ITEMS_PER_PAGE)));
    }
  }, [data, isLoading, isError, error]);

  const [insertCategory] = useInsertCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    const name = createCategory.name.trim();
    if (!name) return toast.error("Category name is required!");

    try {
      const res = await insertCategory({
        name,
        status: createCategory.status || "Expense",
      }).unwrap();
      if (res?.success) {
        toast.success("Category created successfully!");
        setIsCreateOpen(false);
        setCreateCategory({ name: "", status: "Expense" });
        refetch?.();
      } else {
        toast.error("Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdateCategory = async () => {
    if (!currentCategory?.Id) return toast.error("Invalid category selected!");

    const name = String(currentCategory.name || "").trim();
    if (!name) return toast.error("Category name is required!");

    try {
      const res = await updateCategory({
        id: currentCategory.Id,
        data: { name, status: getCategoryStatus(currentCategory.status) },
      }).unwrap();

      if (res?.success) {
        toast.success("Category updated successfully!");
        setIsEditOpen(false);
        setCurrentCategory(null);
        refetch?.();
      } else {
        toast.error("Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDeleteCategory = async (id) => {
    const confirmed = await requestDeleteConfirmation({
      message: "Do you want to delete this category?",
    });
    if (!confirmed) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteCategory(id).unwrap();
      if (res?.success) {
        toast.success("Category deleted successfully!");
        refetch?.();
      } else {
        toast.error("Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  return (
    <motion.div
      className="mb-8 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[520px]">
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
              setStartPage(1);
            }}
            placeholder="Search by category name..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
        </div>

        {canManage && (
          <button
            onClick={() => {
              setCreateCategory({ name: "", status: "Expense" });
              setIsCreateOpen(true);
            }}
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-[260px]"
          >
            <Plus size={18} />
            Add New Category
          </button>
        )}
      </div>

      <div className="mt-8">
        {categories.map((item) => (
          <div
            key={item.Id ?? item.id}
            className="flex items-center justify-between border-b border-gray-200 py-5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-5 rounded-lg py-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50">
                <Tags className="text-indigo-600" size={18} />
              </div>

              <div className="min-w-0">
                <div className="truncate text-[16px] font-semibold text-gray-900">
                  {item.name}
                </div>
                <div
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                    getCategoryStatus(item.status) === "Not Expense"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {getCategoryStatus(item.status)}
                </div>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-3 pl-4 pr-2">
                <button
                  onClick={() => {
                    setCurrentCategory(item);
                    setIsEditOpen(true);
                  }}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:bg-gray-50"
                  title="Edit"
                >
                  <Pencil className="text-indigo-600" size={18} />
                </button>

                <button
                  onClick={() => handleDeleteCategory(item.Id)}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="text-red-600" size={18} />
                </button>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="py-10 text-sm font-semibold text-gray-500">
            Loading categories...
          </div>
        )}

        {!isLoading && categories.length === 0 && (
          <div className="py-10 text-sm text-gray-500">No category found</div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      <Modal
        isOpen={isEditOpen && !!currentCategory}
        onClose={() => setIsEditOpen(false)}
        title="Update Category"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Category Name
            </label>
            <input
              type="text"
              value={currentCategory?.name || ""}
              onChange={(event) =>
                setCurrentCategory((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <select
              value={getCategoryStatus(currentCategory?.status)}
              onChange={(event) =>
                setCurrentCategory((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              {CATEGORY_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              onClick={() => setIsEditOpen(false)}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateCategory}
              className="rounded-2xl bg-indigo-600 px-10 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-100 transition hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Category Name
            </label>
            <input
              type="text"
              value={createCategory.name}
              onChange={(event) =>
                setCreateCategory((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="Enter category name"
              required
            />
          </div>

          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <select
              value={createCategory.status}
              onChange={(event) =>
                setCreateCategory((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              {CATEGORY_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-10 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-100 transition hover:bg-indigo-700"
            >
              Create Category
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default CategoryTable;
