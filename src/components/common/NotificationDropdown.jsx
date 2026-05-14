// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import {
//   useGetDataByIdQuery,
//   useUpdateNotificationMutation,
// } from "../../features/notification/notification";

// /* -------- Time Ago Helper -------- */
// const timeAgo = (dateString) => {
//   const now = new Date();
//   const past = new Date(dateString);
//   const diff = Math.floor((now - past) / 1000);

//   if (diff < 60) return "Just now";
//   const min = Math.floor(diff / 60);
//   if (min < 60) return `${min}m ago`;
//   const hr = Math.floor(min / 60);
//   if (hr < 24) return `${hr}h ago`;
//   return `${Math.floor(hr / 24)}d ago`;
// };

// const NotificationDropdown = () => {
//   const userId = localStorage.getItem("userId");

//   const navigate = useNavigate();

//   const { data, isLoading, refetch } = useGetDataByIdQuery(
//     {
//       page: 1,
//       limit: 5,
//       userId,
//     },
//     { pollingInterval: 1000 },
//   );

//   const notifications = data?.data ?? [];

//   const [showAll, setShowAll] = useState(false);

//   const [updateNotification] = useUpdateNotificationMutation();

//   const markAsRead = async (id) => {
//     const res = await updateNotification({ id, userId }).unwrap();

//     if (res.success === true) {
//       // history.push(`/app/${res.data.url}`);
//       refetch();
//       navigate(`/${res.data.url}`);
//     }
//   };

//   const visibleNotifications = showAll
//     ? notifications
//     : notifications.slice(0, 4);

//   if (isLoading) {
//     return (
//       <div className="w-[360px] md:w-[400px] p-4 text-center text-sm text-gray-500 bg-white shadow-xl rounded-xl border">
//         Loading notifications...
//       </div>
//     );
//   }

//   return (
//     <div
//       className="
//       absolute right-32 top-10 mt-2
//     bg-white rounded-xl shadow-2xl border border-gray-200
//     z-50 flex flex-col py-3

//       "
//       style={{ width: "350px" }}
//     >
//       {/* ---------- Header ---------- */}
//       <div className="px-4 py-3 border-b border-gray-100">
//         <h3 className="font-bold text-lg text-gray-900">Notifications</h3>
//       </div>

//       <ul
//         className="
//           flex-1
//           divide-y divide-gray-100"
//       >
//         {visibleNotifications.length === 0 ? (
//           <li className="px-4 py-8 text-sm text-gray-500 text-center">
//             No notifications yet
//           </li>
//         ) : (
//           visibleNotifications.map((notif) => (
//             <li
//               key={notif.id}
//               onClick={() => markAsRead(notif.id)}
//               className={`
//                 flex gap-3 px-4 py-3 cursor-pointer transition
//                 ${
//                   notif.isRead
//                     ? "bg-white hover:bg-gray-50"
//                     : "bg-blue-50 hover:bg-blue-100/50"
//                 }
//               `}
//             >
//               {/* Icon */}
//               <div className="flex-shrink-0">
//                 <div
//                   className={`
//                     w-11 h-11 rounded-full flex items-center justify-center text-white
//                     ${notif.isRead ? "bg-gray-400" : "bg-blue-600"}
//                   `}
//                 >
//                   🔔
//                 </div>
//               </div>

//               {/* Content */}
//               <div className="flex-1 min-w-0">
//                 <p
//                   className={`text-sm leading-snug ${
//                     notif.isRead ? "text-gray-600" : "text-gray-900 font-medium"
//                   }`}
//                 >
//                   {notif.message}
//                 </p>

//                 <div className="flex items-center gap-2 mt-1">
//                   <span
//                     className={`text-xs ${
//                       notif.isRead
//                         ? "text-gray-500"
//                         : "text-blue-600 font-semibold"
//                     }`}
//                   >
//                     {timeAgo(notif.createdAt)}
//                   </span>

//                   {!notif.isRead && (
//                     <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
//                   )}
//                 </div>
//               </div>
//             </li>
//           ))
//         )}
//       </ul>

//       {/* {notifications.length > 3 && !showAll && (
//         <div className=" border-t border-gray-100 text-center my-4">
//           <Link
//             className="w-full text-sm font-semibold py-1 rounded bg-gray-300 py-3 px-8 "
//             to="/notifications"
//           >
//             <button>See previous notifications</button>
//           </Link>
//         </div>
//       )} */}
//       {notifications.length > 3 && !showAll && (
//         <div className="border-t border-gray-100 text-center my-4">
//           <button
//             type="button"
//             onClick={() => navigate("/notifications")}
//             className="text-sm font-semibold rounded bg-gray-300 py-3 px-8"
//           >
//             See previous notifications
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NotificationDropdown;


import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetDataByIdQuery,
  useUpdateNotificationMutation,
} from "../../features/notification/notification";

/* -------- Time Ago Helper -------- */
const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60) return "Just now";
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const NotificationDropdown = () => {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();

  // ✅ first load 5, then +5 করে বাড়বে
  const [visibleCount, setVisibleCount] = useState(5);

  const { data, isLoading, refetch } = useGetDataByIdQuery(
    {
      page: 1,
      limit: 50, // ✅ max 50 notifications fetch করবে
      userId,
    },
    { pollingInterval: 1000 },
  );

  const notifications = data?.data ?? [];

  const [updateNotification] = useUpdateNotificationMutation();

  const markAsRead = async (id) => {
    try {
      const res = await updateNotification({ id, userId }).unwrap();

      if (res.success === true) {
        refetch();
        navigate(`/${res.data.url}`);
      }
    } catch (err) {
      console.error("Failed to update notification", err);
    }
  };

  const visibleNotifications = useMemo(() => {
    return notifications.slice(0, visibleCount);
  }, [notifications, visibleCount]);

  const canLoadMore = notifications.length > visibleCount && visibleCount < 50;
  const showPreviousButton = visibleCount >= 50 || notifications.length > 50;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, 50));
  };

  if (isLoading) {
    return (
      <div className="absolute right-0 top-12 mt-2 w-[92vw] max-w-[400px] p-4 text-center text-sm text-gray-500 bg-white shadow-xl rounded-xl border border-gray-200 z-50">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-12 mt-2 w-[92vw] max-w-[400px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col py-3">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-bold text-lg text-gray-900">Notifications</h3>
      </div>

      <ul className="flex-1 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {visibleNotifications.length === 0 ? (
          <li className="px-4 py-8 text-sm text-gray-500 text-center">
            No notifications yet
          </li>
        ) : (
          visibleNotifications.map((notif) => (
            <li
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`flex gap-3 px-4 py-3 cursor-pointer transition ${notif.isRead
                  ? "bg-white hover:bg-gray-50"
                  : "bg-blue-50 hover:bg-blue-100/50"
                }`}
            >
              <div className="flex-shrink-0">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white ${notif.isRead ? "bg-gray-400" : "bg-blue-600"
                    }`}
                >
                  🔔
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${notif.isRead ? "text-gray-600" : "text-gray-900 font-medium"
                    }`}
                >
                  {notif.message}
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs ${notif.isRead
                        ? "text-gray-500"
                        : "text-blue-600 font-semibold"
                      }`}
                  >
                    {timeAgo(notif.createdAt)}
                  </span>

                  {!notif.isRead && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Load More */}
      {canLoadMore && (
        <div className="border-t border-gray-100 text-center py-3">
          <button
            type="button"
            onClick={handleLoadMore}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Load more
          </button>
        </div>
      )}

      {/* See previous notifications */}
      {showPreviousButton && (
        <div className="border-t border-gray-100 text-center py-3">
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="text-sm font-semibold rounded bg-gray-300 py-3 px-8"
          >
            See previous notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;