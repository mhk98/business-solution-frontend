import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Edit,
  Eye,
  Landmark,
  Mail,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  Users2,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import HrmWorkspace from "./HrmWorkspace";
import {
  useApproveEmployeeListMutation,
  useDeleteEmployeeListMutation,
  useGetAllEmployeeListQuery,
  useInsertEmployeeListMutation,
  useUpdateEmployeeListMutation,
} from "../../features/employeeList/employeeList";
import { useGetAllUserQuery } from "../../features/auth/auth";
import { useGetAllDepartmentsQuery } from "../../features/department/department";
import { useGetAllDesignationsQuery } from "../../features/designation/designation";
import { useGetAllShiftsQuery } from "../../features/shift/shift";
import useDebounce from "../../hooks/useDebounce";


const initialForm = {
  name: "",
  employee_id: "",
  employeeCode: "",
  userId: "",
  email: "",
  phone: "",
  departmentId: "",
  designationId: "",
  shiftId: "",
  reportingManagerId: "",
  employmentType: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  salary: "",
  status: "Active",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

const EmployeeMasterManager = () => {
  const currentRole = localStorage.getItem("role");
  const isPrivilegedUser =
    currentRole === "superAdmin" || currentRole === "admin";
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [currentItem, setCurrentItem] = useState(null);
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

  const { data, isLoading, refetch } = useGetAllEmployeeListQuery(queryArgs);
  const { data: managerRowsRes } = useGetAllEmployeeListQuery({
    page: 1,
    limit: 500,
  });
  const { data: usersRes } = useGetAllUserQuery({ page: 1, limit: 500 });
  const { data: departmentsRes } = useGetAllDepartmentsQuery({
    page: 1,
    limit: 500,
  });
  const { data: designationsRes } = useGetAllDesignationsQuery({
    page: 1,
    limit: 500,
  });
  const { data: shiftsRes } = useGetAllShiftsQuery({ page: 1, limit: 500 });

  const [createEmployee, { isLoading: isCreating }] =
    useInsertEmployeeListMutation();
  const [updateEmployee, { isLoading: isUpdating }] =
    useUpdateEmployeeListMutation();
  const [deleteEmployee] = useDeleteEmployeeListMutation();
  const [approveEmployee, { isLoading: isApproving }] =
    useApproveEmployeeListMutation();

  const rows = data?.data || [];
  const managerRows = managerRowsRes?.data || [];
  const users = usersRes?.data || [];
  const departments = departmentsRes?.data || [];
  const designations = designationsRes?.data || [];
  const shifts = shiftsRes?.data || [];
  const unlinkedEmployees = rows.filter((row) => !row.userId).length;

  const managerOptions = useMemo(
    () =>
      managerRows.map((item) => ({
        value: item.Id,
        label: `${item.name}${item.employeeCode ? ` • ${item.employeeCode}` : ""}${
          item.department?.name ? ` • ${item.department.name}` : ""
        }`,
      })),
    [managerRows],
  );

  useEffect(() => {
    if (!form.departmentId) return;

    const selectedDesignation = designations.find(
      (item) => String(item.Id) === String(form.designationId),
    );

    if (
      selectedDesignation &&
      String(selectedDesignation.departmentId) !== String(form.departmentId)
    ) {
      setForm((prev) => ({ ...prev, designationId: "" }));
    }
  }, [form.departmentId, form.designationId, designations]);

  const designationOptions = useMemo(() => {
    if (!form.departmentId) return designations;

    return designations.filter(
      (item) => String(item.departmentId) === String(form.departmentId),
    );
  }, [designations, form.departmentId]);

  const filteredManagerOptions = useMemo(() => {
    const availableManagers = managerOptions.filter(
      (option) => String(option.value) !== String(currentItem?.Id || ""),
    );

    if (!form.departmentId) {
      return availableManagers;
    }

    return availableManagers.filter((option) => {
      const manager = managerRows.find(
        (item) => String(item.Id) === String(option.value),
      );

      if (!manager?.departmentId) return true;

      return String(manager.departmentId) === String(form.departmentId);
    });
  }, [currentItem?.Id, form.departmentId, managerOptions, managerRows]);

  const stats = useMemo(() => {
    const activeCount = rows.filter((row) => row.status === "Active").length;
    const linkedUsers = rows.filter((row) => row.userId).length;
    const assignedDepartments = rows.filter((row) => row.departmentId).length;
    const withShift = rows.filter((row) => row.shiftId).length;

    return [
      {
        name: "Employee Records",
        value: rows.length,
        icon: Users2,
        iconBg: "#EEF2FF",
        iconColor: "#4338CA",
      },
      {
        name: "Active Employees",
        value: activeCount,
        icon: UserRoundCheck,
        iconBg: "#ECFDF5",
        iconColor: "#047857",
      },
      {
        name: "Linked Accounts",
        value: linkedUsers,
        icon: Mail,
        iconBg: "#FFF7ED",
        iconColor: "#C2410C",
      },
      {
        name: "Assigned Structure",
        value: `${assignedDepartments}/${withShift}`,
        icon: BriefcaseBusiness,
        iconBg: "#EFF6FF",
        iconColor: "#1D4ED8",
      },
    ];
  }, [rows]);

  const statusTone = (status) =>
    ({
      Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Pending: "bg-amber-50 text-amber-700 border-amber-200",
      Inactive: "bg-slate-100 text-slate-600 border-slate-200",
      Approved: "bg-indigo-50 text-indigo-700 border-indigo-200",
    })[status] || "bg-slate-100 text-slate-600 border-slate-200";

  const setFieldValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLinkedUserChange = (value) => {
    const selectedUser = users.find(
      (user) => String(user.Id) === String(value),
    );
    const derivedName =
      `${selectedUser?.FirstName || ""} ${selectedUser?.LastName || ""}`.trim() ||
      "";

    setForm((prev) => ({
      ...prev,
      userId: value,
      name: derivedName || prev.name,
      email: selectedUser?.Email || prev.email,
      phone: selectedUser?.Phone || prev.phone,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setCurrentItem(null);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    resetForm();
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    resetForm();
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
    setForm({
      name: item.name || "",
      employee_id: item.employee_id || "",
      employeeCode: item.employeeCode || "",
      userId: item.userId || "",
      email: item.email || "",
      phone: item.phone || "",
      departmentId: item.departmentId || "",
      designationId: item.designationId || "",
      shiftId: item.shiftId || "",
      reportingManagerId: item.reportingManagerId || "",
      employmentType: item.employmentType || "",
      joiningDate: item.joiningDate || "",
      salary: item.salary || "",
      status: item.status || "Active",
      note: item.note || "",
      date:
        item.date || item.joiningDate || new Date().toISOString().slice(0, 10),
    });
    setIsEditOpen(true);
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    employee_id: Number(form.employee_id),
    employeeCode: form.employeeCode.trim() || null,
    userId: form.userId ? Number(form.userId) : null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    departmentId: form.departmentId ? Number(form.departmentId) : null,
    designationId: form.designationId ? Number(form.designationId) : null,
    shiftId: form.shiftId ? Number(form.shiftId) : null,
    reportingManagerId: form.reportingManagerId
      ? Number(form.reportingManagerId)
      : null,
    employmentType: form.employmentType || null,
    joiningDate: form.joiningDate || null,
    salary: Number(form.salary),
    status: form.status || "Active",
    note: form.note.trim() || null,
    date: form.date || form.joiningDate || null,
  });

  const validateForm = () => {
    if (!form.name.trim())
      return (toast.error("Employee name is required"), false);
    if (!form.employee_id)
      return (toast.error("Employee ID is required"), false);
    if (!form.salary) return (toast.error("Salary is required"), false);
    return true;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await createEmployee(buildPayload()).unwrap();
      if (res?.success) {
        toast.success(res?.message || "Employee created successfully");
        closeCreate();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create employee");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentItem?.Id || !validateForm()) return;

    try {
      const res = await updateEmployee({
        id: currentItem.Id,
        data: buildPayload(),
      }).unwrap();
      if (res?.success) {
        toast.success(res?.message || "Employee updated successfully");
        closeEdit();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update employee");
    }
  };

  const handleDelete = async (item) => {
    if (!isPrivilegedUser) {
      setCurrentItem(item);
      setDeleteRequestNote("");
      setIsDeleteRequestOpen(true);
      return;
    }

    const confirmed = await requestDeleteConfirmation({ message: `Delete employee ${item.name}?` });
    if (!confirmed) return;

    try {
      const res = await deleteEmployee({ id: item.Id }).unwrap();
      if (res?.success) {
        toast.success(res?.message || "Employee deleted successfully");
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete employee");
    }
  };

  const submitDeleteRequest = async (e) => {
    e.preventDefault();
    if (!deleteRequestNote.trim()) {
      toast.error("Please write why you want to delete this employee");
      return;
    }

    try {
      const res = await deleteEmployee({
        id: currentItem?.Id,
        note: deleteRequestNote.trim(),
      }).unwrap();

      if (res?.success) {
        toast.success(res?.message || "Delete request submitted");
        closeDeleteRequest();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to submit delete request");
    }
  };

  const handleApprove = async (item) => {
    try {
      const res = await approveEmployee(item.Id).unwrap();
      if (res?.success) {
        toast.success(res?.message || "Employee approved successfully");
        closeReview();
        refetch?.();
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to approve employee");
    }
  };

  const renderForm = (onSubmit, loading) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <Users2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Core Identity</h3>
            <p className="text-xs text-slate-500">
              Employee account linkage, naming and official codes.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Employee Name
            </span>
            <input
              value={form.name}
              onChange={(e) => setFieldValue("name", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Employee ID
            </span>
            <input
              type="number"
              value={form.employee_id}
              onChange={(e) => setFieldValue("employee_id", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Landmark size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Organization Assignment
            </h3>
            <p className="text-xs text-slate-500">
              Department, designation, shift and reporting structure.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Employee Code
            </span>
            <input
              value={form.employeeCode}
              onChange={(e) => setFieldValue("employeeCode", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 ">
              Linked User Account
            </span>
            <select
              value={form.userId}
              onChange={(e) => handleLinkedUserChange(e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">Select login account</option>
              {users.map((user) => (
                <option key={user.Id} value={user.Id}>
                  {`${user.FirstName || ""} ${user.LastName || ""}`.trim() ||
                    user.Email}
                  {user.Email ? ` • ${user.Email}` : ""}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-500">
              Assign the login account that should see this employee in
              `Employee Profile`. Name, email and phone will auto-fill from the
              selected user when available.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Employment Snapshot
            </h3>
            <p className="text-xs text-slate-500">
              Employment type, joining date, salary and operational status.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 ">
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setFieldValue("email", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Phone
            </span>
            <input
              value={form.phone}
              onChange={(e) => setFieldValue("phone", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Department
            </span>
            <select
              value={form.departmentId}
              onChange={(e) => setFieldValue("departmentId", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.Id} value={department.Id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Designation
            </span>
            <select
              value={form.designationId}
              onChange={(e) => setFieldValue("designationId", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">Select Designation</option>
              {designationOptions.map((designation) => (
                <option key={designation.Id} value={designation.Id}>
                  {designation.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Shift
            </span>
            <select
              value={form.shiftId}
              onChange={(e) => setFieldValue("shiftId", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">Select Shift</option>
              {shifts.map((shift) => (
                <option key={shift.Id} value={shift.Id}>
                  {shift.name}
                  {shift.startTime && shift.endTime
                    ? ` • ${shift.startTime}-${shift.endTime}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Reporting Manager
            </span>
            <select
              value={form.reportingManagerId}
              onChange={(e) =>
                setFieldValue("reportingManagerId", e.target.value)
              }
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">Select Manager</option>
              {filteredManagerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-500">
              Manager list updates from employee master data and narrows to the
              selected department when possible.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Employment Type
            </span>
            <select
              value={form.employmentType}
              onChange={(e) => setFieldValue("employmentType", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">Select Type</option>
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Joining Date
            </span>
            <input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setFieldValue("joiningDate", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Salary
            </span>
            <input
              type="number"
              value={form.salary}
              onChange={(e) => setFieldValue("salary", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Status
            </span>
            <select
              value={form.status}
              onChange={(e) => setFieldValue("status", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
              <option value="Approved">Approved</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Note
            </span>
            <textarea
              rows={4}
              value={form.note}
              onChange={(e) => setFieldValue("note", e.target.value)}
              className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Employee"}
        </button>
      </div>
    </form>
  );

  return (
    <HrmWorkspace
      eyebrow="Phase 1"
      title="Employee Master"
      description="Build a clean employee foundation before attendance-device sync and payroll automation. Link accounts, assign structure and keep hiring data tidy from one workspace."
      stats={stats}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Employee Workspace
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Search, review and update employee records with linked user
              accounts and HR assignments.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="relative block w-full sm:w-64">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee"
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
            >
              <Plus size={16} />
              Add Employee
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-amber-900">
              Employee Profile needs a linked login account
            </div>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              To show self-service data in `Employee Profile`, assign a user
              from `Linked User Account` while creating or editing an employee.
              Currently {unlinkedEmployees} employee record
              {unlinkedEmployees === 1 ? "" : "s"} are not linked yet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900">
            Phase 1 Checklist
          </div>
          <div className="mt-3 space-y-2">
            {[
              "Create employee profile",
              "Link user account",
              "Assign department & designation",
              "Attach shift for attendance",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
              >
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-4">
            <div className="bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Linked Users
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {rows.filter((row) => row.userId).length}
              </div>
            </div>
            <div className="bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Departments Assigned
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {rows.filter((row) => row.departmentId).length}
              </div>
            </div>
            <div className="bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Shift Coverage
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {rows.filter((row) => row.shiftId).length}
              </div>
            </div>
            <div className="bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Pending Review
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {rows.filter((row) => row.status === "Pending").length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Employee Directory
            </div>
            <div className="text-xs text-slate-500">
              {rows.length} profile{rows.length === 1 ? "" : "s"} loaded
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Employee
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Organization
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Employment
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Linked Account
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Salary
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.Id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {row.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        #{row.employee_id}
                        {row.employeeCode ? ` • ${row.employeeCode}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.email || "-"}</div>
                      <div className="text-xs text-slate-500">
                        {row.phone || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.department?.name || "-"}</div>
                      <div className="text-xs text-slate-500">
                        {row.designation?.name || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.employmentType || "-"}</div>
                      <div className="text-xs text-slate-500">
                        {row.shift?.name || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.user ? (
                        <>
                          <div className="font-medium text-slate-900">
                            {row.user.Email || "-"}
                          </div>
                          <div className="text-xs text-emerald-600">
                            Ready for Employee Profile
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-slate-500">
                            Not linked
                          </div>
                          <div className="text-xs text-amber-600">
                            Self-service page will stay empty
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {row.salary ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                          row.status,
                        )}`}
                      >
                        {row.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {(row.pendingAction || row.approvalNote) && (
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
                        {isPrivilegedUser && row.status === "Pending" && (
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
                  <td colSpan={8} className="px-4 py-12">
                    <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
                      <div className="text-base font-semibold text-slate-800">
                        No employee found
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Start by adding your first employee and linking the
                        account to build the HRM foundation.
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
        title="Create Employee"
        maxWidth="max-w-5xl"
      >
        {renderForm(handleCreate, isCreating)}
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={closeEdit}
        title="Update Employee"
        maxWidth="max-w-5xl"
      >
        {renderForm(handleUpdate, isUpdating)}
      </Modal>

      <Modal
        isOpen={isDeleteRequestOpen}
        onClose={closeDeleteRequest}
        title="Delete Employee"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={submitDeleteRequest} className="space-y-4">
          <p className="text-sm text-slate-600">
            Admin approval is required before this employee can be deleted.
            Please write the reason for deletion.
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Delete Note
            </span>
            <textarea
              rows={5}
              value={deleteRequestNote}
              onChange={(e) => setDeleteRequestNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition"
              placeholder="Why should this employee be deleted?"
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
        title="Employee Review"
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
          {isPrivilegedUser && currentItem?.status === "Pending" && (
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

export default EmployeeMasterManager;
