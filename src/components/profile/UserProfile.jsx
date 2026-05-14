// import toast from "react-hot-toast";
// import { useEffect, useMemo, useState } from "react";
// import {
//   useSingleUserQuery,
//   useUserUpdateMutation,
// } from "../../features/auth/auth";
// import Modal from "../common/Modal";

// const API_BASE = import.meta.env.VITE_API_URL;

// const UserProfile = () => {
//   const [userUpdate] = useUserUpdateMutation();

//   const [user, setUser] = useState(null);
//   const [currentProfile, setCurrentProfile] = useState(null);

//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const [previewUrl, setPreviewUrl] = useState("");
//   const [imageFile, setImageFile] = useState(null);

//   const id = useMemo(() => localStorage.getItem("userId"), []);

//   // ✅ Fetch user (query)
//   const {
//     data: userRes,
//     isLoading,
//     isError,
//     error,
//     refetch,
//   } = useSingleUserQuery(id, { skip: !id });

//   useEffect(() => {
//     if (isError) console.error("Error:", error);
//     if (!isLoading && userRes?.data) {
//       setUser(userRes.data);
//     }
//   }, [userRes, isLoading, isError, error]);

//   // File change
//   const handleChange = (e) => {
//     const selected = e.target.files?.[0];
//     if (!selected) return;

//     setImageFile(selected);
//     const url = URL.createObjectURL(selected);
//     setPreviewUrl(url);
//   };

//   // Open modal with data
//   const handleEditUser = () => {
//     setCurrentProfile(user ? { ...user } : null);
//     setImageFile(null);
//     setPreviewUrl("");
//     setIsModalOpen(true);
//   };

//   // Close modal
//   const closeModal = () => setIsModalOpen(false);

//   // helper: append non-empty only (prevents PostalCode "" issue)
//   const appendIfNotEmpty = (fd, key, val) => {
//     const v = typeof val === "string" ? val.trim() : val;
//     if (v === "" || v === undefined || v === null) return;
//     fd.append(key, v);
//   };

//   // Save
//   const handleSave = async (e) => {
//     e.preventDefault();
//     if (!currentProfile) return;

//     try {
//       const fd = new FormData();

//       // ✅ send empty strings for text fields is OK,
//       // but for PostalCode (integer in DB) we must NOT send empty string
//       fd.append("FirstName", currentProfile.FirstName?.trim() || "");
//       fd.append("LastName", currentProfile.LastName?.trim() || "");
//       fd.append("Email", currentProfile.Email?.trim() || "");
//       fd.append("Phone", currentProfile.Phone?.trim() || "");
//       fd.append("Address", currentProfile.Address?.trim() || "");
//       fd.append("Country", currentProfile.Country?.trim() || "");
//       fd.append("City", currentProfile.City?.trim() || "");

//       // ✅ PostalCode: only append when not empty
//       appendIfNotEmpty(fd, "PostalCode", currentProfile.PostalCode);

//       if (imageFile) fd.append("image", imageFile);

//       const res = await userUpdate({ id, data: fd }).unwrap();

//       if (res?.success) {
//         toast.success("Profile updated successfully");

//         // ✅ instant UI update (optional)
//         setUser((prev) => ({ ...(prev || {}), ...currentProfile }));

//         closeModal();

//         // ✅ ensure latest server data (image path, db changes)
//         refetch();
//       } else {
//         toast.error(res?.message || "Update failed. Please try again.");
//       }
//     } catch (err) {
//       console.error("Profile update failed", err);
//       toast.error(
//         err?.data?.message || "Profile update failed. Please try again.",
//       );
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center text-gray-600">
//         Loading profile...
//       </div>
//     );
//   }

//   if (isError || !user) {
//     return (
//       <div className="min-h-screen flex items-center justify-center text-red-600">
//         Error fetching user data
//       </div>
//     );
//   }

//   const avatarSrc = user?.image
//     ? `${API_BASE}/${user.image}`
//     : "https://i.ibb.co/2kR0w9c/user.png";

//   return (
//     <div className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8">
//       <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
//         {/* Header Card */}
//         <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-5 md:p-7">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
//             <div className="flex items-center gap-4">
//               <img
//                 src={avatarSrc}
//                 alt="Profile"
//                 className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-indigo-100"
//               />
//               <div>
//                 <h2 className="text-lg md:text-2xl font-semibold text-gray-900">
//                   {user?.FirstName || "-"} {user?.LastName || ""}
//                 </h2>
//                 <div className="mt-1 flex flex-wrap gap-2 items-center">
//                   <span className="text-xs md:text-sm px-2 py-1 rounded-full bg-indigo-600 text-white">
//                     {user?.role || "Staff"}
//                   </span>
//                   <span className="text-sm text-gray-600">
//                     {user?.City || "-"}, {user?.Country || "-"}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             <button
//               onClick={handleEditUser}
//               className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
//               type="button"
//             >
//               Edit Profile
//             </button>
//           </div>
//         </div>

//         {/* Details Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
//           {/* Personal Info */}
//           <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-5 md:p-7">
//             <h3 className="md:text-lg font-semibold text-gray-900">
//               Personal Information
//             </h3>

//             <div className="mt-4 space-y-3">
//               <InfoRow label="First Name" value={user?.FirstName} />
//               <InfoRow label="Last Name" value={user?.LastName} />
//               <InfoRow label="Email" value={user?.Email} />
//               <InfoRow label="Phone" value={user?.Phone} />
//               <InfoRow label="Role" value={user?.role} />
//             </div>
//           </div>

//           {/* Address */}
//           <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-5 md:p-7">
//             <h3 className="md:text-lg font-semibold text-gray-900">Address</h3>

//             <div className="mt-4 space-y-3">
//               <InfoRow label="Address" value={user?.Address} />
//               <InfoRow label="Country" value={user?.Country} />
//               <InfoRow label="City" value={user?.City} />
//               <InfoRow label="Postal Code" value={user?.PostalCode} />
//             </div>
//           </div>
//         </div>

//         <Modal
//           isOpen={isModalOpen}
//           onClose={closeModal}
//           title="Edit Profile"
//           maxWidth="max-w-4xl"
//         >
//           <div className="mb-5">
//             <p className="text-sm text-slate-500">
//               Update your personal information and profile photo.
//             </p>
//           </div>

//           <form onSubmit={handleSave} className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <Input
//                 label="First Name"
//                 value={currentProfile?.FirstName || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     FirstName: e.target.value,
//                   }))
//                 }
//               />
//               <Input
//                 label="Last Name"
//                 value={currentProfile?.LastName || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     LastName: e.target.value,
//                   }))
//                 }
//               />
//               <Input
//                 label="Email"
//                 type="email"
//                 value={currentProfile?.Email || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     Email: e.target.value,
//                   }))
//                 }
//               />
//               <Input
//                 label="Phone"
//                 value={currentProfile?.Phone || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     Phone: e.target.value,
//                   }))
//                 }
//               />
//               <Input
//                 label="Country"
//                 value={currentProfile?.Country || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     Country: e.target.value,
//                   }))
//                 }
//               />
//               <Input
//                 label="City"
//                 value={currentProfile?.City || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     City: e.target.value,
//                   }))
//                 }
//               />
//               <Input
//                 label="Postal Code"
//                 value={currentProfile?.PostalCode || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     PostalCode: e.target.value,
//                   }))
//                 }
//               />
//               <Input
//                 label="Address"
//                 value={currentProfile?.Address || ""}
//                 onChange={(e) =>
//                   setCurrentProfile((p) => ({
//                     ...p,
//                     Address: e.target.value,
//                   }))
//                 }
//               />
//             </div>

//             {/* Image */}
//             <div className="pt-2">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Profile Image
//               </label>

//               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
//                 <img
//                   src={previewUrl || avatarSrc}
//                   alt="Preview"
//                   className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 shrink-0"
//                 />

//                 <div className="flex-1 w-full">
//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={handleChange}
//                     className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
//                   />
//                   <p className="text-xs text-gray-500 mt-1">
//                     PNG, JPG allowed. Recommended square image.
//                   </p>
//                 </div>
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="pt-4 flex items-center justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={closeModal}
//                 className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
//               >
//                 Save Changes
//               </button>
//             </div>
//           </form>
//         </Modal>
//       </div>
//     </div>
//   );
// };

// // Small UI helpers
// const InfoRow = ({ label, value }) => (
//   <div className="flex items-start justify-between gap-4">
//     <p className="text-sm text-gray-500">{label}</p>
//     <p className="text-sm font-medium text-gray-900 text-right break-words">
//       {value || "-"}
//     </p>
//   </div>
// );

// const Input = ({ label, type = "text", value, onChange }) => (
//   <div>
//     <label className="block text-sm text-gray-700 mb-1">{label}</label>
//     <input
//       type={type}
//       className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
//       value={value}
//       onChange={onChange}
//     />
//   </div>
// );

// export default UserProfile;

import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import {
  useSingleUserQuery,
  useUserUpdateMutation,
} from "../../features/auth/auth";
import Modal from "../common/Modal";

const API_BASE = import.meta.env.VITE_API_URL;
const DOCUMENT_LABELS = {
  image: "Profile Photo",
  idCard: "ID Card",
  cv: "CV",
  guardianPhoto: "Guardian Photo",
  guardianIdCard: "Guardian ID Card",
};

const UserProfile = () => {
  const [userUpdate] = useUserUpdateMutation();

  const [user, setUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [documentPreviewUrls, setDocumentPreviewUrls] = useState({});
  const [documentFiles, setDocumentFiles] = useState({});

  const id = localStorage.getItem("userId");

  const {
    data: userRes,
    isLoading,
    isError,
    error,
    refetch,
  } = useSingleUserQuery(id, { skip: !id });

  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && userRes?.data) {
      setUser(userRes.data);
    }
  }, [userRes, isLoading, isError, error]);

  useEffect(() => {
    return () => {
      Object.values(documentPreviewUrls).forEach(
        (url) => url && URL.revokeObjectURL(url),
      );
    };
  }, [documentPreviewUrls]);

  const handleChange = (field, e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setDocumentFiles((prev) => ({ ...prev, [field]: selected }));
    setDocumentPreviewUrls((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      return { ...prev, [field]: URL.createObjectURL(selected) };
    });
  };

  const handleEditUser = () => {
    setCurrentProfile(
      user
        ? {
            ...user,
            Password: "",
          }
        : {
            Password: "",
          },
    );
    setDocumentFiles({});
    Object.values(documentPreviewUrls).forEach(
      (url) => url && URL.revokeObjectURL(url),
    );
    setDocumentPreviewUrls({});
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const appendIfNotEmpty = (fd, key, val) => {
    const v = typeof val === "string" ? val.trim() : val;
    if (v === "" || v === undefined || v === null) return;
    fd.append(key, v);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentProfile) return;

    try {
      const fd = new FormData();

      fd.append("FirstName", currentProfile.FirstName?.trim() || "");
      fd.append("LastName", currentProfile.LastName?.trim() || "");
      fd.append("Email", currentProfile.Email?.trim() || "");
      fd.append("Phone", currentProfile.Phone?.trim() || "");
      fd.append("Address", currentProfile.Address?.trim() || "");
      fd.append("Country", currentProfile.Country?.trim() || "");
      fd.append("City", currentProfile.City?.trim() || "");

      appendIfNotEmpty(fd, "PostalCode", currentProfile.PostalCode);
      appendIfNotEmpty(fd, "Password", currentProfile.Password);
      Object.keys(DOCUMENT_LABELS).forEach((field) => {
        if (documentFiles[field]) {
          fd.append(field, documentFiles[field]);
        }
      });

      const res = await userUpdate({ id, data: fd }).unwrap();

      if (res?.success) {
        toast.success("Profile updated successfully");

        setUser((prev) => ({
          ...(prev || {}),
          ...currentProfile,
          Password: "",
        }));

        closeModal();
        refetch();
      } else {
        toast.error(res?.message || "Update failed. Please try again.");
      }
    } catch (err) {
      console.error("Profile update failed", err);
      toast.error(
        err?.data?.message || "Profile update failed. Please try again.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading profile...
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error fetching user data
      </div>
    );
  }

  const avatarSrc = user?.image
    ? `${API_BASE}/${user.image}`
    : "https://i.ibb.co/2kR0w9c/user.png";

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <img
                src={avatarSrc}
                alt="Profile"
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-indigo-100"
              />
              <div>
                <h2 className="text-lg md:text-2xl font-semibold text-gray-900">
                  {user?.FirstName || "-"} {user?.LastName || ""}
                </h2>
                <div className="mt-1 flex flex-wrap gap-2 items-center">
                  <span className="text-xs md:text-sm px-2 py-1 rounded-full bg-indigo-600 text-white">
                    {user?.role || "Staff"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {user?.City || "-"}, {user?.Country || "-"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleEditUser}
              className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              type="button"
            >
              Edit Profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-5 md:p-7">
            <h3 className="md:text-lg font-semibold text-gray-900">
              Personal Information
            </h3>

            <div className="mt-4 space-y-3">
              <InfoRow label="First Name" value={user?.FirstName} />
              <InfoRow label="Last Name" value={user?.LastName} />
              <InfoRow label="Email" value={user?.Email} />
              <InfoRow label="Phone" value={user?.Phone} />
              <InfoRow label="Role" value={user?.role} />
            </div>
          </div>

          <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-5 md:p-7">
            <h3 className="md:text-lg font-semibold text-gray-900">Address</h3>

            <div className="mt-4 space-y-3">
              <InfoRow label="Address" value={user?.Address} />
              <InfoRow label="Country" value={user?.Country} />
              <InfoRow label="City" value={user?.City} />
              <InfoRow label="Postal Code" value={user?.PostalCode} />
            </div>
          </div>

          <div className="rounded-2xl shadow-sm border border-gray-200 bg-white p-5 md:p-7 md:col-span-2">
            <h3 className="md:text-lg font-semibold text-gray-900">
              Documents
            </h3>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(DOCUMENT_LABELS).map(([field, label]) => (
                <DocumentLinkCard
                  key={field}
                  label={label}
                  path={user?.[field]}
                />
              ))}
            </div>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Edit Profile"
          maxWidth="max-w-4xl"
        >
          <div className="mb-5">
            <p className="text-sm text-slate-500">
              Update your personal information, password and profile photo.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={currentProfile?.FirstName || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    FirstName: e.target.value,
                  }))
                }
              />

              <Input
                label="Last Name"
                value={currentProfile?.LastName || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    LastName: e.target.value,
                  }))
                }
              />

              <Input
                label="Email"
                type="email"
                value={currentProfile?.Email || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    Email: e.target.value,
                  }))
                }
              />

              <Input
                label="Phone"
                value={currentProfile?.Phone || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    Phone: e.target.value,
                  }))
                }
              />

              <Input
                label="New Password"
                type="password"
                value={currentProfile?.Password || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    Password: e.target.value,
                  }))
                }
              />

              <Input
                label="Country"
                value={currentProfile?.Country || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    Country: e.target.value,
                  }))
                }
              />

              <Input
                label="City"
                value={currentProfile?.City || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    City: e.target.value,
                  }))
                }
              />

              <Input
                label="Postal Code"
                value={currentProfile?.PostalCode || ""}
                onChange={(e) =>
                  setCurrentProfile((p) => ({
                    ...p,
                    PostalCode: e.target.value,
                  }))
                }
              />

              <div className="md:col-span-2">
                <Input
                  label="Address"
                  value={currentProfile?.Address || ""}
                  onChange={(e) =>
                    setCurrentProfile((p) => ({
                      ...p,
                      Address: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <DocumentUploaderGrid
              currentProfile={currentProfile}
              previewUrls={documentPreviewUrls}
              onChange={handleChange}
            />

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900 text-right break-words">
      {value || "-"}
    </p>
  </div>
);

const Input = ({ label, type = "text", value, onChange }) => (
  <div>
    <label className="block text-sm text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
      value={value}
      onChange={onChange}
    />
  </div>
);

export default UserProfile;

const DocumentLinkCard = ({ label, path }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="text-xs text-slate-500">
        {path ? "Uploaded" : "Not uploaded"}
      </div>
    </div>
    {path ? (
      <a
        href={`${API_BASE}/${path}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-slate-100"
      >
        View
      </a>
    ) : (
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
        Optional
      </span>
    )}
  </div>
);

const DocumentUploaderGrid = ({ currentProfile, previewUrls, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {Object.entries(DOCUMENT_LABELS).map(([field, label]) => {
      const currentPath = currentProfile?.[field];
      const previewUrl = previewUrls?.[field];
      const isImageField = field !== "cv";
      return (
        <div
          key={field}
          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
          <input
            type="file"
            accept={isImageField ? "image/*,.pdf" : ".pdf,image/*"}
            onChange={(e) => onChange(field, e)}
            className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />
          <div className="mt-3">
            {previewUrl ? (
              isImageField ? (
                <img
                  src={previewUrl}
                  alt={label}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-gray-100"
                />
              ) : (
                <span className="inline-flex rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                  New file selected
                </span>
              )
            ) : currentPath ? (
              <a
                href={`${API_BASE}/${currentPath}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-slate-100"
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
