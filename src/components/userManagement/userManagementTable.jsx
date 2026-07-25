import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  LogIn,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  persistAuthSession,
  useGetAllUserQuery,
  useUserDeleteMutation,
  useUserImpersonateMutation,
  useUserRegisterMutation,
  useUserStatusUpdateMutation,
  useUserUpdateMutation,
} from "../../features/auth/auth";
import {
  ROLE_OPTIONS,
  saveRolePermissionsForRole,
} from "../../utils/navigationPermissions";
import Modal from "../common/Modal";
import useDebounce from "../../hooks/useDebounce";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const API_BASE = import.meta.env.VITE_API_URL;
const DOCUMENT_LABELS = {
  image: "Profile Photo",
  idCard: "ID Card",
  cv: "CV",
  guardianPhoto: "Guardian Photo",
  guardianIdCard: "Guardian ID Card",
};

const getVisibleRoleOptions = (actorRole) =>
  ROLE_OPTIONS.filter(
    (role) =>
      actorRole === "superAdmin" ||
      (role.value !== "superAdmin" && role.value !== "admin"),
  );

const getRoleLabel = (value) =>
  ROLE_OPTIONS.find((role) => role.value === value)?.label || value || "-";

const UserManagementTable = () => {
  const navigate = useNavigate();
  const actorRole = localStorage.getItem("role");
  const actorUserId = Number(localStorage.getItem("userId"));
  const canManageStatus = actorRole === "superAdmin";

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const itemsPerPage = 10;

  // Edit user
  const [currentUser, setCurrentUser] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [editFiles, setEditFiles] = useState({});
  const [editPreviewUrls, setEditPreviewUrls] = useState({});

  // Create user
  const [createUser, setCreateUser] = useState({
    FirstName: "",
    LastName: "",
    Email: "",
    Password: "",
    Phone: "",
    role: "",
  });
  const [createFiles, setCreateFiles] = useState({});
  const [createPreviewUrls, setCreatePreviewUrls] = useState({});

  // Responsive pagination set
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

  // Fetch users
  const { data, isLoading, isError, error, refetch } = useGetAllUserQuery({
    page: currentPage,
    limit: itemsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
  });

  const users = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching user data", error);
      toast.error("User load failed!");
      return;
    }
    if (!isLoading && data?.meta?.count != null) {
      setTotalPages(Math.max(1, Math.ceil(data.meta.count / itemsPerPage)));
    }
  }, [data, isLoading, isError, error]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      Object.values(createPreviewUrls).forEach(
        (url) => url && URL.revokeObjectURL(url),
      );
      Object.values(editPreviewUrls).forEach(
        (url) => url && URL.revokeObjectURL(url),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers
  const closeAdd = () => {
    setIsAddOpen(false);
    setCreateUser({
      FirstName: "",
      LastName: "",
      Email: "",
      Password: "",
      Phone: "",
      role: "",
    });
    setCreateFiles({});
    Object.values(createPreviewUrls).forEach(
      (url) => url && URL.revokeObjectURL(url),
    );
    setCreatePreviewUrls({});
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setCurrentUser(null);
    setEditPassword("");
    setEditFiles({});
    Object.values(editPreviewUrls).forEach(
      (url) => url && URL.revokeObjectURL(url),
    );
    setEditPreviewUrls({});
  };

  const handleAdd = () => {
    setCreateUser({
      FirstName: "",
      LastName: "",
      Email: "",
      Password: "",
      Phone: "",
      role: "",
    });
    setCreateFiles({});
    Object.values(createPreviewUrls).forEach(
      (url) => url && URL.revokeObjectURL(url),
    );
    setCreatePreviewUrls({});
    setIsAddOpen(true);
  };

  const handleEdit = (u) => {
    setCurrentUser({ ...u });
    setEditPassword("");
    setEditFiles({});
    Object.values(editPreviewUrls).forEach(
      (url) => url && URL.revokeObjectURL(url),
    );
    setEditPreviewUrls({});
    setIsEditOpen(true);
  };

  const handleCreateFileChange = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreateFiles((prev) => ({ ...prev, [field]: file }));
    setCreatePreviewUrls((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      return { ...prev, [field]: URL.createObjectURL(file) };
    });
  };

  const handleEditFileChange = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditFiles((prev) => ({ ...prev, [field]: file }));
    setEditPreviewUrls((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      return { ...prev, [field]: URL.createObjectURL(file) };
    });
  };

  // Create
  const [userRegister, { isLoading: creating }] = useUserRegisterMutation();

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!createUser.Email || !createUser.role) {
      toast.error("Email এবং Role বাধ্যতামূলক!");
      return;
    }
    try {
      const form = new FormData();
      form.append("FirstName", createUser.FirstName || "");
      form.append("LastName", createUser.LastName || "");
      form.append("Email", createUser.Email || "");
      form.append("Password", createUser.Password || "");
      form.append("Phone", createUser.Phone || "");
      form.append("role", createUser.role || "");
      Object.entries(createFiles).forEach(([field, file]) => {
        if (file) form.append(field, file);
      });

      const res = await userRegister(form).unwrap();

      if (res?.success) {
        toast.success("User created successfully!");
        closeAdd();
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // Update
  const [userUpdate, { isLoading: updating }] = useUserUpdateMutation();

  const handleUpdate = async () => {
    if (!currentUser?.Id) return toast.error("Invalid user selected!");
    if (!currentUser.Email || !currentUser.role) {
      toast.error("Email এবং Role বাধ্যতামূলক!");
      return;
    }

    try {
      const form = new FormData();
      form.append("FirstName", currentUser.FirstName || "");
      form.append("LastName", currentUser.LastName || "");
      form.append("Email", currentUser.Email || "");
      form.append("Phone", currentUser.Phone || "");
      form.append("role", currentUser.role || "");
      if (editPassword?.trim()) form.append("Password", editPassword.trim());
      Object.entries(editFiles).forEach(([field, file]) => {
        if (file) form.append(field, file);
      });

      const res = await userUpdate({ id: currentUser.Id, data: form }).unwrap();

      if (res?.success) {
        toast.success("User updated successfully!");
        closeEdit();
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // Delete
  const [userDelete] = useUserDeleteMutation();
  const [userStatusUpdate, { isLoading: statusUpdating }] =
    useUserStatusUpdateMutation();
  const [userImpersonate, { isLoading: impersonating }] =
    useUserImpersonateMutation();

  const handleDelete = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({
      message: "Do you want to delete this user?",
    });
    if (!confirmDelete) return;

    try {
      const res = await userDelete(id).unwrap();
      if (res?.success) {
        toast.success("User deleted successfully!");
        refetch?.();
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const handleStatusToggle = async (item) => {
    if (!canManageStatus) {
      toast.error("Only super admin can change user status.");
      return;
    }

    const nextStatus = item.status === "Inactive" ? "Active" : "Inactive";

    if (item.Id === actorUserId && nextStatus === "Inactive") {
      toast.error("নিজের account deactivate করা যাবে না।");
      return;
    }

    try {
      const res = await userStatusUpdate({
        id: item.Id,
        status: nextStatus,
      }).unwrap();

      if (res?.success) {
        toast.success(`User ${nextStatus.toLowerCase()} successfully!`);
        refetch?.();
      } else {
        toast.error(res?.message || "Status update failed!");
      }
    } catch (err) {
      toast.error(
        err?.data?.message ||
          err?.error ||
          err?.message ||
          "Status update failed!",
      );
    }
  };

  const handleLoginAsUser = async (item) => {
    if (!canManageStatus) {
      toast.error("Only super admin can login as another user.");
      return;
    }

    try {
      const res = await userImpersonate(item.Id).unwrap();

      if (!res?.success || !res?.data?.accessToken || !res?.data?.user) {
        toast.error(res?.message || "Login as user failed!");
        return;
      }

      persistAuthSession(res.data);
      saveRolePermissionsForRole(
        res.data.user.role,
        res.data.menuPermissions || [],
      );
      toast.success(`Now logged in as ${item.Email || "selected user"}`);
      navigate("/profile", { replace: true });
    } catch (err) {
      toast.error(err?.data?.message || "Login as user failed!");
    }
  };

  // Pagination calc
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
    <>
      <motion.div
        className="mb-8 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md sm:p-4 lg:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          {/* Search */}
          <div className="relative w-full sm:max-w-[520px]">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                setStartPage(1);
              }}
              placeholder="Search by email / phone / name..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-700 outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-500/20"
            />
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 sm:w-auto"
          >
            <Plus size={18} />
            Add New User
          </button>
        </div>

        {/* List */}
        <div className="mt-5 sm:mt-8">
          {isLoading && <div className="text-slate-600">Loading...</div>}

          {!isLoading &&
            users.map((item) => {
              const img = item?.image ? `${API_BASE}/${item.image}` : null;
              const isInactive = item?.status === "Inactive";
              const isCurrentUser = item?.Id === actorUserId;

              return (
                <div
                  key={item.Id}
                  className="flex flex-col gap-4 rounded-xl border-b border-slate-200 px-2 py-4 transition hover:bg-slate-50 sm:px-3 sm:py-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  {/* Left */}
                  <div className="flex min-w-0 items-start gap-3 sm:gap-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-indigo-50">
                      {img ? (
                        <img
                          src={img}
                          alt="avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="text-indigo-600" size={18} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="break-words text-[15px] font-semibold leading-snug text-slate-900 sm:text-[16px]">
                        {(item.FirstName || "-") + " " + (item.LastName || "")}
                      </div>
                      <div className="mt-1 break-all text-sm text-slate-600">
                        {item.Email || "-"}
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-500">
                        Role: {getRoleLabel(item.role)} • Status:{" "}
                        <span
                          className={
                            isInactive
                              ? "text-rose-600 font-semibold"
                              : "text-emerald-600 font-semibold"
                          }
                        >
                          {item.status || "Active"}
                        </span>{" "}
                        •{" "}
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end lg:pr-2">
                    {canManageStatus && (
                      <>
                        <button
                          onClick={() => handleStatusToggle(item)}
                          type="button"
                          className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 transition ${
                            isInactive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                          title={
                            isInactive ? "Activate user" : "Deactivate user"
                          }
                          disabled={statusUpdating}
                        >
                          {isInactive ? (
                            <ToggleRight size={16} />
                          ) : (
                            <ToggleLeft size={16} />
                          )}
                          <span className="text-xs font-semibold">
                            {isInactive ? "Activate" : "Deactivate"}
                          </span>
                        </button>

                        <button
                          onClick={() => handleLoginAsUser(item)}
                          type="button"
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-sky-50 px-3 text-sky-700 hover:bg-sky-100 transition disabled:opacity-50"
                          title="Login as this user"
                          disabled={impersonating || isCurrentUser}
                        >
                          <LogIn size={16} />
                          <span className="text-xs font-semibold">Login</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleEdit(item)}
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent hover:bg-indigo-50 sm:w-9 sm:border-0 transition"
                      title="Edit"
                    >
                      <span className="mr-2 text-xs font-semibold text-indigo-600 sm:hidden">
                        Edit
                      </span>
                      <Pencil className="text-indigo-600" size={18} />
                    </button>

                    <button
                      onClick={() => handleDelete(item.Id)}
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent hover:bg-rose-50 sm:w-9 sm:border-0 transition"
                      title="Delete"
                    >
                      <span className="mr-2 text-xs font-semibold text-rose-600 sm:hidden">
                        Delete
                      </span>
                      <Trash2 className="text-rose-600" size={18} />
                    </button>
                  </div>
                </div>
              );
            })}

          {!isLoading && users?.length === 0 && (
            <div className="py-10 text-sm text-slate-600">No user found</div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:px-4"
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
                className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition sm:px-4 ${
                  active
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
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:px-4"
          >
            Next
          </button>
        </div>
      </motion.div>

      {/* ✅ Edit Modal */}
      <Modal
        isOpen={isEditOpen && !!currentUser}
        onClose={closeEdit}
        title="Update User"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={currentUser?.FirstName || ""}
              onChange={(v) => setCurrentUser((p) => ({ ...p, FirstName: v }))}
            />
            <Input
              label="Last Name"
              value={currentUser?.LastName || ""}
              onChange={(v) => setCurrentUser((p) => ({ ...p, LastName: v }))}
            />
            <Input
              label="Email"
              value={currentUser?.Email || ""}
              onChange={(v) => setCurrentUser((p) => ({ ...p, Email: v }))}
            />
            <Input
              label="Phone"
              value={currentUser?.Phone || ""}
              onChange={(v) => setCurrentUser((p) => ({ ...p, Phone: v }))}
            />

            <Input
              label="New Password (optional)"
              type="password"
              value={editPassword}
              onChange={(v) => setEditPassword(v)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                value={currentUser?.role || ""}
                onChange={(e) =>
                  setCurrentUser((p) => ({ ...p, role: e.target.value }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                {getVisibleRoleOptions(actorRole).map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <DocumentFields
                mode="edit"
                previewUrls={editPreviewUrls}
                currentValues={currentUser}
                onFileChange={handleEditFileChange}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95"
              onClick={closeEdit}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-indigo-600 px-10 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
              onClick={handleUpdate}
              disabled={updating}
            >
              {updating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={closeAdd}
        title="Add New User"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={createUser.FirstName}
              onChange={(v) => setCreateUser((p) => ({ ...p, FirstName: v }))}
            />
            <Input
              label="Last Name"
              value={createUser.LastName}
              onChange={(v) => setCreateUser((p) => ({ ...p, LastName: v }))}
            />
            <Input
              label="Email *"
              value={createUser.Email}
              onChange={(v) => setCreateUser((p) => ({ ...p, Email: v }))}
            />
            <Input
              label="Password *"
              type="password"
              value={createUser.Password}
              onChange={(v) => setCreateUser((p) => ({ ...p, Password: v }))}
            />
            <Input
              label="Phone"
              value={createUser.Phone}
              onChange={(v) => setCreateUser((p) => ({ ...p, Phone: v }))}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role *
              </label>
              <select
                value={createUser.role}
                onChange={(e) =>
                  setCreateUser((p) => ({ ...p, role: e.target.value }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">Select Role</option>
                {getVisibleRoleOptions(actorRole).map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <DocumentFields
                mode="create"
                previewUrls={createPreviewUrls}
                currentValues={{}}
                onFileChange={handleCreateFileChange}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition active:scale-95"
              onClick={closeAdd}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-100 disabled:opacity-50 active:scale-95"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

const Input = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
    />
  </div>
);

const DocumentFields = ({ mode, previewUrls, currentValues, onFileChange }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
    {Object.entries(DOCUMENT_LABELS).map(([field, label]) => {
      const existingPath = currentValues?.[field];
      const previewUrl = previewUrls?.[field];
      const isImageField = field !== "cv";
      return (
        <div
          key={field}
          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
        >
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
          <input
            type="file"
            accept={isImageField ? "image/*,.pdf" : ".pdf,image/*"}
            onChange={(e) => onFileChange(field, e)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:px-4 sm:text-sm sm:file:mr-3 sm:file:px-3"
          />
          <div className="mt-3 text-xs text-slate-500">
            {mode === "create"
              ? "Optional document upload."
              : "Upload only if you want to replace existing file."}
          </div>
          <div className="mt-3">
            {previewUrl ? (
              isImageField ? (
                <img
                  src={previewUrl}
                  alt={label}
                  className="h-16 w-16 rounded-xl object-cover border border-slate-200 bg-white"
                />
              ) : (
                <span className="inline-flex rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                  New file selected
                </span>
              )
            ) : existingPath ? (
              <a
                href={`${API_BASE}/${existingPath}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-700 border border-slate-200 hover:bg-slate-100"
              >
                View current file
              </a>
            ) : (
              <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                Not uploaded
              </span>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

export default UserManagementTable;
