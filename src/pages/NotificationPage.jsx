// import { useNavigate } from "react-router-dom";
// import Header from "../components/common/Header";
// import { useEffect, useState } from "react";
// import {
//   useGetDataByIdQuery,
//   useUpdateNotificationMutation,
// } from "../features/notification/notification";

// const NotificationPage = () => {
//   const branch = localStorage.getItem("branch");
//   const userId = localStorage.getItem("userId");

//   const [currentPage, setCurrentPage] = useState(1);
//   const [startPage, setStartPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pagesPerSet, setPagesPerSet] = useState(10);
//   const [itemsPerPage] = useState(10);

//   useEffect(() => {
//     const updatePagesPerSet = () => {
//       if (window.innerWidth < 640) setPagesPerSet(5);
//       else if (window.innerWidth < 1024) setPagesPerSet(7);
//       else setPagesPerSet(10);
//     };
//     updatePagesPerSet();
//     window.addEventListener("resize", updatePagesPerSet);
//     return () => window.removeEventListener("resize", updatePagesPerSet);
//   }, []);

//   const navigate = useNavigate();
//   // const [currentPage, setCurrentPage] = useState(1);
//   // const itemsPerPage = 10;

//   const { data, isLoading, isError } = useGetDataByIdQuery({
//     page: currentPage,
//     limit: itemsPerPage,
//     userId,
//     branch,
//   });

//   const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

//   const handlePageChange = (pageNumber) => {
//     setCurrentPage(pageNumber);
//     if (pageNumber < startPage) setStartPage(pageNumber);
//     else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
//   };

//   const handlePreviousSet = () =>
//     setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

//   const handleNextSet = () =>
//     setStartPage((prev) =>
//       Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
//     );

//   const [updateNotification] = useUpdateNotificationMutation();

//   const notifications = data?.data || [];
//   // const totalPages = Math.ceil((data?.meta?.count || 0) / limit);

//   const markAsRead = async (id) => {
//     try {
//       const res = await updateNotification({ id, userId }).unwrap();
//       navigate(`/app/${res.data.url}`);
//     } catch (err) {
import { useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { useEffect, useState } from "react";
import Pagination from "../components/common/Pagination";
import {
  useGetDataByIdQuery,
  useUpdateNotificationMutation,
} from "../features/notification/notification";
import { useLayout } from "../context/LayoutContext";
import { translations } from "../utils/translations";

const NotificationPage = () => {
  const branch = localStorage.getItem("branch");
  const userId = localStorage.getItem("userId");

  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const [itemsPerPage] = useState(10);

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

  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetDataByIdQuery({
    page: currentPage,
    limit: itemsPerPage,
    userId,
    branch,
  });

  const notifications = data?.data || [];

  // ✅ totalPages fix
  useEffect(() => {
    const total = data?.meta?.count ?? 0;
    const tp = Math.max(1, Math.ceil(total / itemsPerPage));
    setTotalPages(tp);

    // page range safe
    setStartPage((p) => Math.min(p, Math.max(1, tp - pagesPerSet + 1)));
    if (currentPage > tp) setCurrentPage(tp);
  }, [data, itemsPerPage, pagesPerSet, currentPage]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  const [updateNotification] = useUpdateNotificationMutation();

  const markAsRead = async (id) => {
    try {
      const res = await updateNotification({ id, userId }).unwrap();
      navigate(`/app/${res.data.url}`);
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  return (
    <div className="flex-1 relative z-10">
      <Header title={t.notifications_title} />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <div className="w-full bg-white shadow-sm rounded-xl p-6 border border-gray-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t.notifications_title}
            </h2>

            {/* optional: total count */}
            <span className="text-xs text-gray-500">
              {data?.meta?.count ?? 0} {t.total}
            </span>
          </div>

          {/* Content */}
          <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
            {isLoading && (
              <p className="p-6 text-center text-gray-500">{t.loading}</p>
            )}

            {isError && (
              <p className="p-6 text-center text-red-600">
                {t.failed_load_notifications}
              </p>
            )}

            {!isLoading && !isError && notifications.length === 0 && (
              <p className="p-6 text-center text-gray-500">
                {t.no_notifications}
              </p>
            )}

            {notifications.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 px-5 py-4 transition ${!item.isRead
                  ? "bg-indigo-50 hover:bg-indigo-100/60"
                  : "hover:bg-gray-50"
                  }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                  🔔
                </div>

                {/* Message */}
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {item.message || "No message"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.date ? new Date(item.date).toLocaleString() : "-"}
                  </p>
                </div>

                {/* Action */}
                {!item.isRead && (
                  <button
                    onClick={() => markAsRead(item.id)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    {t.view}
                  </button>
                )}
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </main>
    </div>
  );
};

export default NotificationPage;
