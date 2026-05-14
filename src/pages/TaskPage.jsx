import Header from "../components/common/Header";
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetAssignableUsersQuery,
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "../features/task/task";
import { ClipboardList, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import Select from "react-select";

const emptyTask = {
  title: "",
  description: "",
  assignedToUserId: "",
  priority: "Normal",
  dueDate: "",
};

const userLabel = (user) =>
  `${user?.FirstName || ""} ${user?.LastName || ""}`.trim() ||
  user?.Email ||
  `User ${user?.Id || ""}`.trim();

const TaskPage = () => {
  const role = localStorage.getItem("role");
  const canAssign = role === "superAdmin" || role === "admin";
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("");
  const [taskError, setTaskError] = useState("");

  const { data: usersRes, isLoading: usersLoading } = useGetAssignableUsersQuery(
    undefined,
    { skip: !canAssign },
  );
  const { data: tasksRes, isLoading: tasksLoading } = useGetTasksQuery({
    page: 1,
    limit: 50,
    searchTerm: searchTerm.trim(),
    status,
  });
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const users = usersRes?.data || [];
  const tasks = tasksRes?.data || [];
  const userOptions = useMemo(
    () =>
      users
        .filter((user) => user.status !== "Inactive")
        .map((user) => ({
          value: String(user.Id),
          label: `${userLabel(user)} - ${user.role}`,
          user,
        })),
    [users],
  );
  const selectedUserOption =
    userOptions.find((option) => option.value === String(taskForm.assignedToUserId)) ||
    null;

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 8,
      borderColor: state.isFocused ? "#818cf8" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(99,102,241,0.14)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "#fff",
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    singleValue: (base) => ({ ...base, color: "#0f172a" }),
    input: (base) => ({ ...base, color: "#0f172a" }),
    menu: (base) => ({ ...base, borderRadius: 8, overflow: "hidden", zIndex: 50 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    const title = taskForm.title.trim();
    if (!title || !taskForm.assignedToUserId) {
      setTaskError("Task title and assigned user are required");
      return;
    }

    try {
      setTaskError("");
      await createTask({
        ...taskForm,
        title,
        description: taskForm.description.trim(),
      }).unwrap();
      setTaskForm(emptyTask);
    } catch (err) {
      setTaskError(err?.data?.message || "Failed to assign task");
    }
  };

  const handleStatusChange = async (task, nextStatus) => {
    try {
      setTaskError("");
      await updateTask({ id: task.Id, data: { status: nextStatus } }).unwrap();
    } catch (err) {
      setTaskError(err?.data?.message || "Failed to update task");
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task?\n\n${task.title}`)) return;

    try {
      setTaskError("");
      await deleteTask(task.Id).unwrap();
    } catch (err) {
      setTaskError(err?.data?.message || "Failed to delete task");
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 min-h-screen">
      <Header title="Tasks" />
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full bg-white shadow-sm rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Task Assignments
              </h2>
              <p className="text-sm text-gray-500">
                Assigned users receive a header notification immediately.
              </p>
            </div>
          </div>

          {canAssign && (
            <form
              onSubmit={handleCreateTask}
              className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3"
            >
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
                placeholder="Task title"
              />
              <Select
                value={selectedUserOption}
                onChange={(option) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    assignedToUserId: option?.value || "",
                  }))
                }
                options={userOptions}
                isClearable
                isSearchable
                isLoading={usersLoading}
                styles={selectStyles}
                menuPortalTarget={document.body}
                placeholder={usersLoading ? "Loading users..." : "Assign to user"}
                noOptionsMessage={() => "No user found"}
              />
              <textarea
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 lg:col-span-2"
                placeholder="Task details"
              />
              <select
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    priority: event.target.value,
                  }))
                }
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              >
                {["Low", "Normal", "High", "Urgent"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(event) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    dueDate: event.target.value,
                  }))
                }
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={isCreating}
                className="h-11 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 lg:col-span-2"
              >
                {isCreating ? "Assigning..." : "Assign Task"}
              </button>
            </form>
          )}

          {taskError && (
            <p className="mt-3 text-sm text-red-600">{taskError}</p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {canAssign ? "All Tasks" : "My Tasks"}
            </h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-10 w-full sm:w-72 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
                  placeholder="Search tasks"
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              >
                <option value="">All status</option>
                {["Pending", "In Progress", "Completed", "Cancelled"].map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
            {tasksLoading && (
              <p className="p-4 text-sm text-slate-500">Loading...</p>
            )}
            {!tasksLoading && tasks.length === 0 && (
              <p className="p-4 text-sm text-slate-500">No tasks found.</p>
            )}
            {tasks.map((task) => (
              <div key={task.Id} className="p-4 bg-white">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {task.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {task.description || "-"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>Assigned to: {userLabel(task.assignedTo)}</span>
                      <span>Priority: {task.priority}</span>
                      {task.dueDate && <span>Due: {task.dueDate}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={task.status || "Pending"}
                      onChange={(event) =>
                        handleStatusChange(task, event.target.value)
                      }
                      disabled={isUpdating}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
                    >
                      {["Pending", "In Progress", "Completed", "Cancelled"].map(
                        (item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ),
                      )}
                    </select>
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        disabled={isDeleting}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                        title="Delete task"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TaskPage;
