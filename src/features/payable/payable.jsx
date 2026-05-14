// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// const getAuthToken = () => localStorage.getItem("token");

// export const payableApi = createApi({
//   reducerPath: "payableApi",
//   baseQuery: fetchBaseQuery({
//     baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
//     prepareHeaders: (headers) => {
//       const token = getAuthToken();
//       if (token) headers.set("Authorization", `Bearer ${token}`);
//       return headers;
//     },
//   }),
//   tagTypes: ["payable"],
//   endpoints: (build) => ({
//     insertPayable: build.mutation({
//       query: (data) => ({
//         url: "/payable/create",
//         method: "POST",
//         body: data, // FormData
//       }),
//       invalidatesTags: ["payable"],
//     }),

//     updatePayable: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/payable/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["payable"],
//     }),

//     deletePayable: build.mutation({
//       query: (id) => ({
//         url: `/payable/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["payable"],
//     }),

//     // ✅ FIXED: FILTER PARAMS PASSING
//     getAllPayable: build.query({
//       query: (arg) => {
//         const { page, limit, startDate, endDate, searchTerm } = arg || {};

//         const params = {
//           page,
//           limit,
//           startDate,
//           endDate,
//           searchTerm,
//         };

//         // ✅ remove undefined/empty
//         Object.keys(params).forEach((k) => {
//           if (
//             params[k] === undefined ||
//             params[k] === null ||
//             params[k] === ""
//           ) {
//             delete params[k];
//           }
//         });

//         return {
//           url: "/payable",
//           params,
//         };
//       },
//       providesTags: ["payable"],
//       refetchOnMountOrArgChange: true,
//       // ✅ pollingInterval off (debug এ সমস্যা করে)
//       // pollingInterval: 1000,
//     }),

//     getAllPayableWithoutQuery: build.query({
//       query: () => ({
//         url: "/payable/all",
//       }),
//       providesTags: ["payable"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// export const {
//   useGetAllPayableQuery,
//   useInsertPayableMutation,
//   useUpdatePayableMutation,
//   useDeletePayableMutation,
//   useGetAllPayableWithoutQueryQuery,
// } = payableApi;

import { baseApi } from "../baseApi/api";

export const payableApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertPayable: build.mutation({
      query: (data) => ({
        url: "/payable/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Payable", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    updatePayable: build.mutation({
      query: ({ id, data }) => ({
        url: `/payable/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "Payable", id: arg.id },
        { type: "Payable", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    deletePayable: build.mutation({
      query: (id) => ({
        url: `/payable/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "Payable", id },
        { type: "Payable", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    getAllPayable: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm } = arg;

        const params = { page, limit, startDate, endDate, searchTerm };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/payable", params };
      },

      providesTags: (result) => {
        const rows = result?.data;
        if (Array.isArray(rows) && rows.length) {
          return [
            { type: "Payable", id: "LIST" },
            ...rows.map((r) => ({
              type: "Payable",
              id: r.Id ?? r.id,
            })),
          ];
        }
        return [{ type: "Payable", id: "LIST" }];
      },

      refetchOnMountOrArgChange: true,
    }),

    getAllPayableWithoutQuery: build.query({
      query: () => ({ url: "/payable/all" }),
      providesTags: [{ type: "Payable", id: "LIST" }],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000, // দরকার না হলে off করুন
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllPayableQuery,
  useInsertPayableMutation,
  useUpdatePayableMutation,
  useDeletePayableMutation,
  useGetAllPayableWithoutQueryQuery,
} = payableApi;
