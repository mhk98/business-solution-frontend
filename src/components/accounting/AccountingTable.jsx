import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Pagination from "../common/Pagination";
import {
  useDeleteBookMutation,
  useGetAllBookQuery,
  useInsertBookMutation,
  useUpdateBookMutation,
} from "../../features/book/book";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import Modal from "../common/Modal";
import useDebounce from "../../hooks/useDebounce";


const AccountingTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // Edit modal
  const [isModalOpen1, setIsModalOpen1] = useState(false); // Add modal

  const role = localStorage.getItem("role");
  const [currentProduct, setCurrentProduct] = useState(null);

  const [createProduct, setCreateProduct] = useState({ name: "" });
  const [name, setName] = useState("");
  const debouncedName = useDebounce(name, 400); // search state

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const itemsPerPage = 10;

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

  const { data, isLoading, isError, error, refetch } = useGetAllBookQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedName || undefined,
  });

  const books = data?.data ?? [];


  useEffect(() => {
    if (isError) {
      console.error("Error fetching book data", error);
    } else if (!isLoading && data?.meta?.count != null) {
      setTotalPages(Math.max(1, Math.ceil(data.meta.count / itemsPerPage)));
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  const handleModalClose = () => setIsModalOpen(false);
  const handleModalClose1 = () => setIsModalOpen1(false);

  const handleEditBook = (item) => {
    setCurrentProduct(item);
    setIsModalOpen(true);
  };

  const handleAddBook = () => {
    setCreateProduct({ name: "" });
    setIsModalOpen1(true);
  };

  // Create
  const [insertBook] = useInsertBookMutation();
  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: createProduct.name };
      const res = await insertBook(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created book");
        setIsModalOpen1(false);
        setCreateProduct({ name: "" });
        refetch?.();
      } else {
        toast.error("Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // Update
  const [updateBook] = useUpdateBookMutation();
  const handleUpdateBook = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid book selected!");

    try {
      const updated = { name: currentProduct.name || "", actorRole: role };
      const res = await updateBook({
        id: currentProduct.Id,
        data: updated,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated book!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else toast.error("Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // Delete
  const [deleteBook] = useDeleteBookMutation();
  const handleDeleteBook = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this book?" });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteBook(id).unwrap();
      if (res?.success) {
        toast.success("Book deleted successfully!");
        refetch?.();
      } else toast.error("Delete failed!");
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

  const handlePreviousSet = () =>
    setStartPage((p) => Math.max(p - pagesPerSet, 1));
  const handleNextSet = () =>
    setStartPage((p) =>
      Math.min(p + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-[520px]">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setCurrentPage(1);
              setStartPage(1);
            }}
            placeholder="Search by book name..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
        </div>

        {/* Add button */}
        <button
          onClick={handleAddBook}
          type="button"
          className="inline-flex h-11 w-full sm:w-[260px] items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          <Plus size={18} />
          Add New Book
        </button>
      </div>

      {/* List */}
      <div className="mt-8">
        {books.map((item) => (
          <div
            key={item.Id ?? item.id}
            className="flex items-center justify-between border-b border-gray-200 py-5"
          >
            {/* Left */}
            <Link
              to={`/book/${item.Id}`}
              className="flex-1 rounded-lg -mx-2 px-2 py-2 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
                  <BookOpen className="text-indigo-600" size={18} />
                </div>

                <div>
                  <div className="text-[16px] font-semibold text-gray-900">
                    {item.name}
                  </div>
                  {/* <div className="mt-1 text-sm text-gray-600">
                    {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                  </div> */}
                </div>
              </div>
            </Link>

            {/* Right */}
            {(role === "superAdmin" || role === "admin") && (
              <div className="flex items-center gap-3 pl-4 pr-2">
                <button
                  onClick={() => handleEditBook(item)}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
                  title="Edit"
                >
                  <Pencil className="text-indigo-600" size={18} />
                </button>

                <button
                  onClick={() => handleDeleteBook(item.Id)}
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 className="text-red-600" size={18} />
                </button>
              </div>
            )}
          </div>
        ))}

        {!isLoading && books.length === 0 && (
          <div className="py-10 text-sm text-gray-500">No data found</div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title="Rename Book"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Book Name</label>
            <input
              type="text"
              value={currentProduct?.name || ""}
              onChange={(e) =>
                setCurrentProduct((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              placeholder="Enter book name"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateBook}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add New Book"
      >
        <form onSubmit={handleCreateBook} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Book Name</label>
            <input
              type="text"
              value={createProduct.name}
              onChange={(e) => setCreateProduct({ name: e.target.value })}
              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              placeholder="Enter book name"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Create Book
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default AccountingTable;
