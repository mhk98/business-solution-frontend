// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// const getAuthToken = () => localStorage.getItem("token");

// export const receiveableApi = createApi({
//   reducerPath: "receiveableApi",
//   baseQuery: fetchBaseQuery({
//     baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
//     prepareHeaders: (headers) => {
//       const token = getAuthToken();
//       if (token) headers.set("Authorization", `Bearer ${token}`);
//       return headers;
//     },
//   }),
//   tagTypes: ["receiveable"],
//   endpoints: (build) => ({
//     insertReceiveable: build.mutation({
//       query: (data) => ({
//         url: "/receiveable/create",
//         method: "POST",
//         body: data, // FormData
//       }),
//       invalidatesTags: ["receiveable"],
//     }),

//     updateReceiveable: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/receiveable/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["receiveable"],
//     }),

//     deleteReceiveable: build.mutation({
//       query: (id) => ({
//         url: `/receiveable/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["receiveable"],
//     }),

//     // ✅ FIXED: FILTER PARAMS PASSING
//     getAllReceiveable: build.query({
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
//           url: "/receiveable",
//           params,
//         };
//       },
//       providesTags: ["receiveable"],
//       refetchOnMountOrArgChange: true,
//       // ✅ pollingInterval off (debug এ সমস্যা করে)
//       // pollingInterval: 1000,
//     }),

//     getAllReceiveableWithoutQuery: build.query({
//       query: () => ({
//         url: "/receiveable/all",
//       }),
//       providesTags: ["receiveable"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// export const {
//   useGetAllReceiveableQuery,
//   useInsertReceiveableMutation,
//   useUpdateReceiveableMutation,
//   useDeleteReceiveableMutation,
//   useGetAllReceiveableWithoutQueryQuery,
// } = receiveableApi;

import { baseApi } from "../baseApi/api";

export const receiveableApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertReceiveable: build.mutation({
      query: (data) => ({
        url: "/receiveable/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Receiveable", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    updateReceiveable: build.mutation({
      query: ({ id, data }) => ({
        url: `/receiveable/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "Receiveable", id: arg.id },
        { type: "Receiveable", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    deleteReceiveable: build.mutation({
      query: (id) => ({
        url: `/receiveable/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "Receiveable", id },
        { type: "Receiveable", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    getAllReceiveable: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm } = arg;

        const params = { page, limit, startDate, endDate, searchTerm };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/receiveable", params };
      },

      // list + each row
      providesTags: (result) => {
        const rows = result?.data;
        if (Array.isArray(rows) && rows.length) {
          return [
            { type: "Receiveable", id: "LIST" },
            ...rows.map((r) => ({
              type: "Receiveable",
              id: r.Id ?? r.id,
            })),
          ];
        }
        return [{ type: "Receiveable", id: "LIST" }];
      },

      refetchOnMountOrArgChange: true,
    }),

    getAllReceiveableWithoutQuery: build.query({
      query: () => ({ url: "/receiveable/all" }),
      providesTags: [{ type: "Receiveable", id: "LIST" }],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000, // চাইলে off করবেন
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllReceiveableQuery,
  useInsertReceiveableMutation,
  useUpdateReceiveableMutation,
  useDeleteReceiveableMutation,
  useGetAllReceiveableWithoutQueryQuery,
} = receiveableApi;
