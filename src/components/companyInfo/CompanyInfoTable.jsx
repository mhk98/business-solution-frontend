import { motion } from "framer-motion";
import { Edit, Mail, MapPin, Phone, Globe, MessageCircle } from "lucide-react";
import Modal from "../common/Modal";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  useGetAllCompanyInfoQuery,
  useInsertCompanyInfoMutation,
  useUpdateCompanyInfoMutation,
} from "../../features/companyInfo/companyInfo";

const EMPTY_FORM = {
  address: "",
  hotline: "",
  website: "",
  email: "",
  whatsapp: "",
};

const FIELDS = [
  { key: "address", label: "Address", icon: MapPin },
  { key: "hotline", label: "Hotline", icon: Phone },
  { key: "website", label: "Website", icon: Globe },
  { key: "email", label: "Email", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

const CompanyInfoTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [companyInfo, setCompanyInfo] = useState(null);

  const { data, isLoading, isError, error, refetch } = useGetAllCompanyInfoQuery();

  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && data) setCompanyInfo(data?.data ?? null);
  }, [data, isLoading, isError, error]);

  const openModal = () => {
    setForm({
      address: companyInfo?.address || "",
      hotline: companyInfo?.hotline || "",
      website: companyInfo?.website || "",
      email: companyInfo?.email || "",
      whatsapp: companyInfo?.whatsapp || "",
    });
    setIsModalOpen(true);
  };

  const [insertCompanyInfo] = useInsertCompanyInfoMutation();
  const [updateCompanyInfo] = useUpdateCompanyInfoMutation();

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = companyInfo?.Id
        ? await updateCompanyInfo({ id: companyInfo.Id, data: form }).unwrap()
        : await insertCompanyInfo(form).unwrap();

      if (res?.success !== false) {
        toast.success("Company info saved!");
        setIsModalOpen(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Save failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Save failed!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Company Contact Info
          </h2>
          <p className="text-sm text-slate-500">
            Used on the letterhead of PDF reports (e.g. Monthly Reporting
            Book statements).
          </p>
        </div>
        <button
          onClick={openModal}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          <Edit size={16} />
          {companyInfo?.Id ? "Edit" : "Add"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 shrink-0">
              <Icon size={16} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500">{label}</div>
              <div className="text-sm text-slate-900 break-words">
                {companyInfo?.[key] || "-"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && !companyInfo?.Id && (
        <div className="mt-4 text-sm text-gray-500">
          No company info added yet.
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Company Contact Info"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {label}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                placeholder={label}
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-lg border border-slate-200 font-semibold text-sm"
              onClick={() => setIsModalOpen(false)}
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
        </form>
      </Modal>
    </motion.div>
  );
};

export default CompanyInfoTable;
