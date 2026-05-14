import { motion } from "framer-motion";
import { Edit, Plus, Trash2, Clock, UserMinus, CalendarX, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  useDeleteSalaryMutation,
  useGetAllSalaryQuery,
  useInsertSalaryMutation,
  useUpdateSalaryMutation,
} from "../../features/salary/salary";
import Modal from "../common/Modal";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";

const SalaryTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const [createProduct, setCreateProduct] = useState({
    late: "",
    early_leave: "",
    absent: "",
    friday_absent: "",
    unapproval_absent: "",
  });

  const [products, setProducts] = useState(null);
  const { data, isLoading, refetch } = useGetAllSalaryQuery();

  useEffect(() => {
    if (!isLoading && data) {
      setProducts(data.data);
    }
  }, [data, isLoading]);

  const [updateSalary] = useUpdateSalaryMutation();
  const handleEditClick = (rp) => {
    setCurrentProduct({
      ...rp,
      late: rp.late ?? "",
      early_leave: rp.early_leave ?? "",
      absent: rp.absent ?? "",
      friday_absent: rp.friday_absent ?? "",
      unapproval_absent: rp.unapproval_absent ?? "",
    });
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e?.preventDefault();
    if (!currentProduct?.Id) return toast.error("Invalid entry");
    try {
      const payload = {
        late: Number(currentProduct.late),
        early_leave: Number(currentProduct.early_leave),
        absent: Number(currentProduct.absent),
        friday_absent: Number(currentProduct.friday_absent),
        unapproval_absent: Number(currentProduct.unapproval_absent),
      };

      const res = await updateSalary({ id: currentProduct.Id, data: payload }).unwrap();
      if (res?.success) {
        toast.success("Payroll parameters updated");
        setIsModalOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  const [insertSalary] = useInsertSalaryMutation();
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        late: Number(createProduct.late),
        early_leave: Number(createProduct.early_leave),
        absent: Number(createProduct.absent),
        friday_absent: Number(createProduct.friday_absent),
        unapproval_absent: Number(createProduct.unapproval_absent),
      };

      const res = await insertSalary(payload).unwrap();
      if (res?.success) {
        toast.success("Payroll parameters recorded");
        setIsModalOpen1(false);
        setCreateProduct({ late: "", early_leave: "", absent: "", friday_absent: "", unapproval_absent: "" });
        refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Submission failed");
    }
  };

  const [deleteSalary] = useDeleteSalaryMutation();
  const handleDeleteProduct = async (id) => {
    if (await requestDeleteConfirmation({ message: "Delete these payroll fine parameters?" })) {
      try {
        const res = await deleteSalary(id).unwrap();
        if (res?.success) {
          toast.success("Record deleted");
          refetch();
        }
      } catch (err) {
        toast.error(err?.data?.message || "Delete failed");
      }
    }
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.payroll_fines}</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">{t.payroll_fines_desc}</p>
        </div>

        {!products && (
          <button
            onClick={() => setIsModalOpen1(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95"
          >
            <Plus size={18} /> {t.initialize_settings}
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.trigger_type}</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.penalty_metric} (Days)</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {products ? (
                <>
                  {[
                    { label: t.late_arrival_threshold, value: products.late, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
                    { label: t.early_departure_limit, value: products.early_leave, icon: UserMinus, color: "text-blue-500", bg: "bg-blue-50" },
                    { label: t.standard_absenteeism, value: products.absent, icon: CalendarX, color: "text-rose-500", bg: "bg-rose-50" },
                    { label: t.unscheduled_friday_absence, value: products.friday_absent, icon: AlertCircle, color: "text-purple-500", bg: "bg-purple-50" },
                    { label: t.unauthorized_leave, value: products.unapproval_absent, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" }
                  ].map((item, idx) => (
                    <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${item.bg} ${item.color} shadow-sm border border-slate-100 group-hover:scale-110 transition-transform`}>
                            <item.icon size={18} />
                          </div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.label}</div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-2xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm tabular-nums">
                          {item.value} Day(s) Penalty
                        </span>
                      </td>
                      {idx === 0 && (
                        <td rowSpan={5} className="px-6 py-5 whitespace-nowrap text-center align-middle border-l border-slate-50">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <button
                              onClick={() => handleEditClick(products)}
                              className="h-12 w-12 flex items-center justify-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 active:scale-90"
                              title="Edit Full Configuration"
                            >
                              <Edit size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(products.Id)}
                              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90"
                              title="Wipe Configuration"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan={3} className="py-24 text-center text-slate-400">
                    <div className="text-4xl mb-4 opacity-20">⚙️</div>
                    <p className="font-bold text-sm italic">Payroll parameters not initialized</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Payroll Logic">
        {currentProduct && (
          <form onSubmit={handleUpdateProduct} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "Late Penalty", field: "late", icon: Clock },
                { label: "Early Leave Penalty", field: "early_leave", icon: UserMinus },
                { label: "Standard Absent", field: "absent", icon: CalendarX },
                { label: "Friday Absent", field: "friday_absent", icon: AlertCircle },
                { label: "Unauthorized Absence", field: "unapproval_absent", icon: AlertCircle }
              ].map((field, i) => (
                <div key={i} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <field.icon size={12} className="text-indigo-500" /> {field.label}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentProduct[field.field]}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, [field.field]: e.target.value })}
                    className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100">Apply Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Initialize Modal */}
      <Modal isOpen={isModalOpen1} onClose={() => setIsModalOpen1(false)} title="Global Payroll Initialization">
        <form onSubmit={handleCreateProduct} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: "Late In Penalty", field: "late" },
              { label: "Early Leave Penalty", field: "early_leave" },
              { label: "Standard Absent", field: "absent" },
              { label: "Friday Absent", field: "friday_absent" },
              { label: "Unauthorized Absence", field: "unapproval_absent" }
            ].map((field, i) => (
              <div key={i} className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={createProduct[field.field]}
                  onChange={(e) => setCreateProduct({ ...createProduct, [field.field]: e.target.value })}
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen1(false)} className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100">Initialize Payroll</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default SalaryTable;
