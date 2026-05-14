import { motion } from "framer-motion";
import { Edit, Plus, Trash2 } from "lucide-react";
import Modal from "../common/Modal";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  useDeleteLogoMutation,
  useGetAllLogoQuery,
  useInsertLogoMutation,
  useUpdateLogoMutation,
} from "../../features/logo/logo";


const LogoTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createProduct, setCreateProduct] = useState({ file: null });
  const [logo, setLogo] = useState(null);

  const { data, isLoading, isError, error, refetch } = useGetAllLogoQuery();

  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && data) setLogo(data?.data ?? null);
  }, [data, isLoading, isError, error]);

  const handleAddProduct = () => setIsModalOpen1(true);

  const [updateLogo] = useUpdateLogoMutation();
  const handleEditClick = (item) => {
    setCurrentProduct({ ...item, file: null });
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    const Id = currentProduct?.Id;
    if (!Id) return toast.error("Invalid item!");
    if (!currentProduct.file) return toast.error("Please select a file!");

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", currentProduct.file);
      const res = await updateLogo({ id: Id, data: formData }).unwrap();
      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    } finally {
      setIsSaving(false);
    }
  };

  const [insertLogo] = useInsertLogoMutation();
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!createProduct.file) return toast.error("Please select a file!");

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", createProduct.file);
      const res = await insertLogo(formData).unwrap();
      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen1(false);
        setCreateProduct({ file: null });
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    } finally {
      setIsSaving(false);
    }
  };

  const [deleteLogo] = useDeleteLogoMutation();
  const handleDeleteProduct = async (rowId) => {
    if (!rowId) return toast.error("Invalid item!");
    if (!window.confirm("Do you want to delete this logo?")) return;

    try {
      const res = await deleteLogo(rowId).unwrap();
      if (res?.success) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="my-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition w-full sm:w-auto"
          onClick={handleAddProduct}
          type="button"
        >
          Add <Plus size={18} className="ml-2" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Logo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          {logo?.file ? (
            <tbody className="divide-y divide-slate-100">
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <img
                    src={`${import.meta.env.VITE_API_URL}/${logo.file}`}
                    alt="Logo"
                    className="h-14 w-14 object-cover rounded-lg border border-slate-200"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(logo)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(logo.Id)}
                    className="text-red-500 hover:text-red-700 ms-4"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </motion.tr>
            </tbody>
          ) : (
            <tbody>
              {!isLoading && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-6 text-center text-sm text-slate-500"
                  >
                    No logo uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </table>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={() => { setIsModalOpen(false); setCurrentProduct(null); }}
        title="Edit Logo"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Upload New Logo
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) =>
                setCurrentProduct({ ...currentProduct, file: e.target.files?.[0] || null })
              }
              className="border border-slate-300 rounded-lg p-2 w-full text-slate-800 bg-white"
            />
            {currentProduct?.file && (
              <p className="mt-2 text-xs text-slate-500">
                Selected: {currentProduct.file.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-lg border border-slate-200 font-semibold text-sm"
              onClick={() => { setIsModalOpen(false); setCurrentProduct(null); }}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              onClick={handleUpdateProduct}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={() => setIsModalOpen1(false)}
        title="Add Logo"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateProduct}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Upload Logo
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, file: e.target.files?.[0] || null })
                }
                className="border border-slate-300 rounded-lg p-2 w-full text-slate-800 bg-white"
              />
              {createProduct.file && (
                <p className="mt-2 text-xs text-slate-500">
                  Selected: {createProduct.file.name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-lg border border-slate-200 font-semibold text-sm"
                onClick={() => setIsModalOpen1(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default LogoTable;
