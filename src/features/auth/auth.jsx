// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// // Helper function to get the auth token
// const getAuthToken = () => {
//   return localStorage.getItem("token"); // You can use sessionStorage or other storage methods as well
// };

// export const authApi = createApi({
//   reducerPath: "authApi",
//   baseQuery: fetchBaseQuery({
//     baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,

//     // This will attach the token to every request that requires authorization
//     prepareHeaders: (headers) => {
//       const token = getAuthToken(); // Retrieve token from storage
//       if (token) {
//         headers.set("Authorization", `Bearer ${token}`); // Add token to headers if available
//       }
//       return headers;
//     },
//   }),
//   tagTypes: ["auth"],
//   endpoints: (build) => ({
//     userLogin: build.mutation({
//       query: (loginData) => ({
//         url: "/user/login",
//         method: "POST",
//         body: loginData,
//       }),
//       invalidatesTags: ["auth"],
//     }),

//     userRegister: build.mutation({
//       query: (registerData) => ({
//         url: "/user/register",
//         method: "POST",
//         body: registerData,
//       }),
//       invalidatesTags: ["auth"],
//     }),

//     userDelete: build.mutation({
//       query: (id) => ({
//         url: `/user/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["auth"],
//     }),

//     userUpdate: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/user/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["auth"],
//     }),

//     singleUser: build.mutation({
//       query: (id) => ({
//         url: `/user/${id}`,
//       }),
//       providesTags: ["auth"],
//     }),

//     getAllUser: build.query({
//       query: ({ page, limit, searchTerm }) => ({
//         url: "/user",
//         params: { page, limit, searchTerm },
//       }),
//       providesTags: ["auth"],

//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// // Export hooks to use in your components
// export const {
//   useGetAllUserQuery,
//   useUserRegisterMutation,
//   useUserLoginMutation,
//   useUserDeleteMutation,
//   useUserUpdateMutation,
//   useSingleUserMutation,
// } = authApi;

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const persistAuthSession = (payload) => {
  if (!payload?.accessToken || !payload?.user) return;

  localStorage.setItem("token", payload.accessToken);
  localStorage.setItem("userId", payload.user.Id);
  localStorage.setItem("role", payload.user.role);
  localStorage.setItem("authUser", JSON.stringify(payload.user));
  if (payload.refreshToken) {
    localStorage.setItem("refreshToken", payload.refreshToken);
  }
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["auth", "user"],
  endpoints: (build) => ({
    userLogin: build.mutation({
      query: (loginData) => ({
        url: "/user/login",
        method: "POST",
        body: loginData,
      }),
      invalidatesTags: ["auth"],
    }),

    userRegister: build.mutation({
      query: (registerData) => ({
        url: "/user/register",
        method: "POST",
        body: registerData,
      }),
      invalidatesTags: ["auth"],
    }),

    userLogout: build.mutation({
      query: () => ({
        url: "/user/logout",
        method: "POST",
      }),
      invalidatesTags: ["auth"],
    }),

    refreshToken: build.mutation({
      query: (refreshToken) => ({
        url: "/user/refresh-token",
        method: "POST",
        body: { refreshToken },
      }),
    }),

    userDelete: build.mutation({
      query: (id) => ({
        url: `/user/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["auth"],
    }),

    userStatusUpdate: build.mutation({
      query: ({ id, status }) => ({
        url: `/user/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "user", id },
        "auth",
      ],
    }),

    userImpersonate: build.mutation({
      query: (id) => ({
        url: `/user/${id}/impersonate`,
        method: "POST",
      }),
      invalidatesTags: ["auth"],
    }),

    // ✅ UPDATE
    userUpdate: build.mutation({
      query: ({ id, data }) => ({
        url: `/user/${id}`,
        method: "PUT",
        body: data, // FormData যাবে
      }),
      // ✅ Update হলে singleUser auto refetch হবে
      invalidatesTags: (result, error, { id }) => [
        { type: "user", id },
        "auth",
      ],
    }),

    // ✅ single user MUST be query (not mutation)
    singleUser: build.query({
      query: (id) => `/user/${id}`,
      providesTags: (result, error, id) => [{ type: "user", id }],
      refetchOnMountOrArgChange: true,
    }),

    getAllUser: build.query({
      query: ({ page, limit, searchTerm }) => ({
        url: "/user",
        params: { page, limit, searchTerm },
      }),
      providesTags: ["auth"],
      refetchOnMountOrArgChange: true,
      // pollingInterval: 1000, // heavy; দরকার হলে চালু করুন
    }),

    getRolePermissions: build.query({
      query: () => ({
        url: "/role-permissions",
      }),
      providesTags: ["auth"],
      refetchOnMountOrArgChange: true,
    }),

    getMyRolePermissions: build.query({
      query: () => ({
        url: "/role-permissions/self",
      }),
      providesTags: [{ type: "auth", id: "MY_PERMISSIONS" }],
      refetchOnMountOrArgChange: true,
    }),

    getRolePermissionByRole: build.query({
      query: (role) => ({
        url: `/role-permissions/${role}`,
      }),
      providesTags: ["auth"],
      refetchOnMountOrArgChange: true,
    }),

    updateRolePermissions: build.mutation({
      query: ({ role, menuPermissions }) => ({
        url: `/role-permissions/${role}`,
        method: "PUT",
        body: { menuPermissions },
      }),
      invalidatesTags: ["auth"],
    }),
  }),
});

export const {
  useGetAllUserQuery,
  useUserRegisterMutation,
  useUserLoginMutation,
  useUserLogoutMutation,
  useUserDeleteMutation,
  useUserStatusUpdateMutation,
  useUserImpersonateMutation,
  useUserUpdateMutation,
  useSingleUserQuery,
  useGetMyRolePermissionsQuery,
  useGetRolePermissionsQuery,
  useGetRolePermissionByRoleQuery,
  useUpdateRolePermissionsMutation,
  useRefreshTokenMutation,
} = authApi;
