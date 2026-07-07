import { motion } from "framer-motion";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  useDeleteBuyerMutation,
  useGetAllBuyerQuery,
  useGetAllBuyerWithoutQueryQuery,
  useInsertBuyerMutation,
  useUpdateBuyerMutation,
} from "../../features/buyer/buyer";
import Select from "react-select";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";

const BuyersTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBuyer, setCurrentBuyer] = useState(null);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [createBuyer, setCreateBuyer] = useState({ name: "", remarks: "" });
  const [buyers, setBuyers] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [buyerId, setBuyerId] = useState("");
  // const [filterData, setFilterData] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // initial value as 1
  const [pagesPerSet, setPagesPerSet] = useState(10);
  // eslint-disable-next-line no-unused-vars
  const [itemsPerPage, setItemsPerPage] = useState(10); // 2 items per page

  const [buyersData, setBuyersData] = useState([]);

  const {
    data: data3,
    isLoading: isLoading3,
    isError: isError3,
    error: error3,
  } = useGetAllBuyerWithoutQueryQuery();

  useEffect(() => {
    if (isError3) {
      console.error("Error fetching buyer data", error3);
    } else if (!isLoading3 && data3) {
      setBuyersData(data3.data);
    }
  }, [data3, isLoading3, isError3, error3]);

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) {
        setPagesPerSet(5);
      } else if (window.innerWidth < 1024) {
        setPagesPerSet(7);
      } else {
        setPagesPerSet(10);
      }
    };

    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);
    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  const { data, isLoading, isError, error } = useGetAllBuyerQuery({
    startDate,
    endDate,
    buyerId,
    page: currentPage,
    limit: itemsPerPage,
  });

  useEffect(() => {
    if (isError) {
      console.error("Error fetching product data", error);
    } else if (!isLoading && data) {
      setBuyers(data.data);
      setTotalPages(Math.ceil(data.meta.count / itemsPerPage)); // totalPages is calculated dynamically from API response
    }
  }, [
    data,
    isLoading,
    isError,
    error,
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
    buyerId,
  ]);

  const handleEditClick = (product) => {
    setCurrentBuyer(product);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleAddProduct = () => setIsModalOpen1(true);
  const handleModalClose1 = () => {
    setIsModalOpen1(false);
  };

  const [insertBuyer] = useInsertBuyerMutation();
  const handlecreateBuyer = async (e) => {
    e.preventDefault();
    const res = await insertBuyer(createBuyer).unwrap();
    if (res.success) {
      toast.success("Successfully created buyer");
    }
    setIsModalOpen1(false);
  };

  const [updateBuyer] = useUpdateBuyerMutation();
  const handleUpdateProduct = async () => {
    const updatedProduct = {
      name: currentBuyer.name,
      remarks: currentBuyer.remarks,
    };

    try {
      const res = await updateBuyer({
        id: currentBuyer.Id,
        data: updatedProduct,
      }).unwrap();
      if (res.success) {
        toast.success("Successfully updated buyer!");
        setIsModalOpen(false);
      } else {
        toast.error("Update failed!");
      }
    } catch (error) {
      toast.error(error.data.message);
    }
  };

  const [deleteBuyer] = useDeleteBuyerMutation();
  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({ message: "Do you want to delete this buyer?" });

    if (confirmDelete) {
      try {
        const res = await deleteBuyer(id).unwrap();
        if (res.success) {
          toast.success("Successfully deleted buyer!");
        } else {
          toast.error("Delete failed!");
        }
      } catch (error) {
        toast.error(error.data.message);
      }
    } else {
      toast.info("Delete action was cancelled.");
    }
  };

  // New function to clear filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setBuyerId("");

    // setFilterData([]);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) {
      setStartPage(pageNumber);
    } else if (pageNumber > endPage) {
      setStartPage(pageNumber - pagesPerSet + 1);
    }
  };

  const handlePreviousSet = () =>
    setStartPage((prevStart) => Math.max(prevStart - pagesPerSet, 1));
  const handleNextSet = () =>
    setStartPage((prevStart) =>
      Math.min(prevStart + pagesPerSet, totalPages - pagesPerSet + 1),
    );

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const buyerOptions = buyersData.map((buyer) => ({
    value: buyer.Id,
    label: buyer.name,
  }));

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="my-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          onClick={handleAddProduct}
        >
          Add <Plus size={18} className="ml-2" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end w-full">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Buyer</label>
          <Select
            options={buyerOptions}
            value={buyerOptions.find((option) => option.value === buyerId)}
            onChange={(selectedOption) => setBuyerId(selectedOption?.value || "")}
            placeholder="Select Buyer"
            isClearable
            className="text-black"
          />
        </div>

        <button
          className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      <div className="overflow-x-auto mt-6">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Due Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Remarks
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {buyers.map((product) => (
              <motion.tr
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(product.due_amount || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {product.remarks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                      onClick={() => handleEditClick(product)}
                      title="Edit"
                    >
                      <Edit size={18} className="text-indigo-600" />
                    </button>
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                      onClick={() => handleDeleteProduct(product.Id)}
                      title="Delete"
                    >
                      <Trash2 size={18} className="text-rose-600" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Prev
        </button>

        {[...Array(endPage - startPage + 1)].map((_, index) => {
          const pageNum = startPage + index;
          const active = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={handleNextSet}
          disabled={endPage === totalPages}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>

      {/* ✅ Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentBuyer}
        onClose={handleModalClose}
        title="Edit Buyer"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={currentBuyer?.name || ""}
              onChange={(e) =>
                setCurrentBuyer({ ...currentBuyer, name: e.target.value })
              }
              className="h-11 px-3 border border-slate-200 rounded-xl w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              value={currentBuyer?.remarks || ""}
              onChange={(e) =>
                setCurrentBuyer({ ...currentBuyer, remarks: e.target.value })
              }
              className="min-h-[100px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              rows={4}
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              onClick={handleModalClose}
            >
              Cancel
            </button>
            <button
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
              onClick={handleUpdateProduct}
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add New Buyer"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handlecreateBuyer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={createBuyer.name}
              onChange={(e) =>
                setCreateBuyer({ ...createBuyer, name: e.target.value })
              }
              className="h-11 px-3 border border-slate-200 rounded-xl w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              value={createBuyer?.remarks || ""}
              onChange={(e) =>
                setCreateBuyer({ ...createBuyer, remarks: e.target.value })
              }
              className="min-h-[100px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              rows={4}
            />
          </div>
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              onClick={handleModalClose1}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
            >
              Add Buyer
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default BuyersTable;
