import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  useAddMasterPermissionMutation,
  useDeleteMasterPermissionMutation,
  useGetMasterPermissionsQuery,
} from "../../features/masterPermission/masterPermission";
import {
  DEFAULT_MASTER_PERMISSION_EMAIL,
  normalizePermissionEmail,
  useCanUseMasterPermission,
} from "../../utils/masterPermissions";

const MasterPermissionManager = () => {
  const [email, setEmail] = useState("");
  const { canUseMasterPermission, isLoadingMasterPermission } =
    useCanUseMasterPermission();
  const { data, isLoading } = useGetMasterPermissionsQuery(undefined, {
    skip: !canUseMasterPermission,
  });
  const [addMasterPermission, { isLoading: isAdding }] =
    useAddMasterPermissionMutation();
  const [deleteMasterPermission, { isLoading: isDeleting }] =
    useDeleteMasterPermissionMutation();

  const rows = data?.data || [];

  const handleAdd = async (event) => {
    event.preventDefault();
    const normalizedEmail = normalizePermissionEmail(email);

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("Valid email দিন");
      return;
    }

    try {
      const res = await addMasterPermission({ email: normalizedEmail }).unwrap();
      if (res?.success) {
        toast.success("Master permission added");
        setEmail("");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Email add করা যায়নি");
    }
  };

  const handleDelete = async (row) => {
    if (normalizePermissionEmail(row?.email) === DEFAULT_MASTER_PERMISSION_EMAIL) {
      toast.error("Default master email remove করা যাবে না");
      return;
    }

    if (!window.confirm(`Remove master permission for ${row.email}?`)) return;

    try {
      const res = await deleteMasterPermission(row.Id || row.id).unwrap();
      if (res?.success) toast.success("Master permission removed");
    } catch (error) {
      toast.error(error?.data?.message || "Email remove করা যায়নি");
    }
  };

  if (isLoadingMasterPermission) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
        Checking permission...
      </div>
    );
  }

  if (!canUseMasterPermission) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
        You do not have access to Master Permission.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Master Permission
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              এই email list একই special permission পাবে।
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@gmail.com"
            className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={isAdding}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <UserPlus size={17} />
            {isAdding ? "Adding..." : "Add Email"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-black text-slate-950">
            Allowed Emails
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              Loading...
            </div>
          ) : rows.length ? (
            rows.map((row) => {
              const isDefault =
                normalizePermissionEmail(row.email) ===
                DEFAULT_MASTER_PERMISSION_EMAIL;

              return (
                <div
                  key={row.Id || row.id || row.email}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {row.email}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {isDefault ? "Default master email" : "Master permission"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    disabled={isDeleting || isDefault}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              No email found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MasterPermissionManager;
