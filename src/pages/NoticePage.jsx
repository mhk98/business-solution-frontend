import Header from "../components/common/Header";
import {
  useCreateNoticeMutation,
  useDeleteNoticeMutation,
  useGetNoticesQuery,
  useUpdateNoticeMutation,
} from "../features/notice/notice";
import { Megaphone, Pencil, Search, Trash2, X } from "lucide-react";
import { useState } from "react";

const NoticePage = () => {
  const [noticeForm, setNoticeForm] = useState({ title: "", message: "" });
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [noticeError, setNoticeError] = useState("");
  const [createNotice, { isLoading: isCreatingNotice }] =
    useCreateNoticeMutation();
  const [updateNotice, { isLoading: isUpdatingNotice }] =
    useUpdateNoticeMutation();
  const [deleteNotice, { isLoading: isDeletingNotice }] =
    useDeleteNoticeMutation();
  const { data: noticesRes, isLoading } = useGetNoticesQuery({
    page: 1,
    limit: 10,
    searchTerm: searchTerm.trim(),
  });

  const notices = noticesRes?.data || [];
  const isSavingNotice = isCreatingNotice || isUpdatingNotice;

  const resetForm = () => {
    setNoticeForm({ title: "", message: "" });
    setEditingNoticeId(null);
    setNoticeError("");
  };

  const handleEditNotice = (notice) => {
    setEditingNoticeId(notice.Id);
    setNoticeForm({
      title: notice.title || "",
      message: notice.message || "",
    });
    setNoticeError("");
  };

  const handleDeleteNotice = async (notice) => {
    const confirmed = window.confirm(
      `Delete this notice?\n\n${notice.title || notice.message || "Notice"}`,
    );
    if (!confirmed) return;

    try {
      setNoticeError("");
      await deleteNotice(notice.Id).unwrap();
      if (editingNoticeId === notice.Id) {
        resetForm();
      }
    } catch (err) {
      setNoticeError(err?.data?.message || "Failed to delete notice");
    }
  };

  const handleNoticeSubmit = async (event) => {
    event.preventDefault();
    const message = noticeForm.message.trim();
    if (!message) {
      setNoticeError("Notice message is required");
      return;
    }

    try {
      setNoticeError("");
      const payload = {
        title: noticeForm.title.trim(),
        message,
      };

      if (editingNoticeId) {
        await updateNotice({ id: editingNoticeId, data: payload }).unwrap();
      } else {
        await createNotice(payload).unwrap();
      }

      resetForm();
    } catch (err) {
      setNoticeError(
        err?.data?.message ||
          `Failed to ${editingNoticeId ? "update" : "create"} notice`,
      );
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 min-h-screen">
      <Header title="Notice" />
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full bg-white shadow-sm rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Management Notice
              </h2>
              <p className="text-sm text-gray-500">
                Latest active notice will show in the top header.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleNoticeSubmit}
            className="mt-6 grid grid-cols-1 lg:grid-cols-[240px_1fr_auto] gap-3"
          >
            <input
              value={noticeForm.title}
              onChange={(event) =>
                setNoticeForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
              className="h-11 bg-white rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              placeholder="Title"
            />
            <input
              value={noticeForm.message}
              onChange={(event) =>
                setNoticeForm((prev) => ({
                  ...prev,
                  message: event.target.value,
                }))
              }
              className="h-11 bg-white rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              placeholder="Write notice message"
            />
            <button
              type="submit"
              disabled={isSavingNotice}
              className="h-11 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSavingNotice
                ? editingNoticeId
                  ? "Updating..."
                  : "Publishing..."
                : editingNoticeId
                  ? "Update"
                  : "Publish"}
            </button>
          </form>

          {editingNoticeId && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X size={15} />
              Cancel edit
            </button>
          )}

          {noticeError && (
            <p className="mt-2 text-sm text-red-600">{noticeError}</p>
          )}

          <div className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Recent Notices
              </h3>
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none focus:border-indigo-400"
                  placeholder="Search notice"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
              {isLoading && (
                <p className="p-4 text-sm text-slate-500">Loading...</p>
              )}
              {!isLoading && notices.length === 0 && (
                <p className="p-4 text-sm text-slate-500">
                  {searchTerm.trim()
                    ? "No notices matched your search."
                    : "No notices found."}
                </p>
              )}
              {notices.map((notice) => (
                <div key={notice.Id} className="p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {notice.title || "Notice"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {notice.message}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {notice.status || "Active"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEditNotice(notice)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        title="Edit notice"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice)}
                        disabled={isDeletingNotice}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                        title="Delete notice"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NoticePage;
