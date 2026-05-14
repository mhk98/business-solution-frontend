// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// // Helper function to get the auth token
// const getAuthToken = () => {
//   return localStorage.getItem("token"); // Modify this based on your token storage logic
// };

// export const confirmOrderApi = createApi({
//   reducerPath: "confirmOrderApi",
//   baseQuery: fetchBaseQuery({
//     baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
//     prepareHeaders: (headers) => {
//       const token = getAuthToken(); // Fetch the token
//       if (token) {
//         // If the token exists, add it to the headers
//         headers.set("Authorization", `Bearer ${token}`);
//       }
//       return headers;
//     },
//   }),

//   tagTypes: ["confirm-order"], // Define the tag type for invalidation and refetching
//   endpoints: (build) => ({
//     insertConfirmOrder: build.mutation({
//       query: (data) => ({
//         url: "/confirm-order/create",
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["confirm-order"], // Invalidate the confirm-order tag after this mutation
//     }),

//     deleteConfirmOrder: build.mutation({
//       query: (id) => ({
//         url: `/confirm-order/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["confirm-order"], // Invalidate the confirm-order tag after deletion
//     }),

//     updateConfirmOrder: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/confirm-order/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["confirm-order"], // Invalidate the confirm-order tag after this mutation
//     }),

//     getAllConfirmOrder: build.query({
//       query: ({ page, limit, startDate, endDate, name, searchTerm }) => ({
//         url: "/confirm-order",
//         params: { page, limit, startDate, endDate, name, searchTerm }, // Pass the page and limit as query params
//       }),
//       providesTags: ["confirm-order"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),

//     getAllConfirmOrderApiWithoutQuery: build.query({
//       query: () => ({
//         url: "/confirm-order/all",
//       }),
//       providesTags: ["confirm-order"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// export const {
//   useInsertConfirmOrderMutation,
//   useGetAllConfirmOrderApiWithoutQueryQuery,
//   useDeleteConfirmOrderMutation,
//   useUpdateConfirmOrderMutation,
//   useGetAllConfirmOrderQuery,
// } = confirmOrderApi;

import { baseApi } from "../baseApi/api";

export const confirmOrderApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertConfirmOrder: build.mutation({
      query: (data) => ({
        url: "/confirm-order/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "ConfirmOrder", id: "LIST" },
        { type: "Overview", id: "TRENDING" }, // ✅ Trending refresh
      ],
    }),

    updateConfirmOrder: build.mutation({
      query: ({ id, data }) => ({
        url: `/confirm-order/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ConfirmOrder", id: arg.id },
        { type: "ConfirmOrder", id: "LIST" },
        { type: "Overview", id: "TRENDING" }, // ✅ Trending refresh
      ],
    }),

    deleteConfirmOrder: build.mutation({
      query: (id) => ({
        url: `/confirm-order/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "ConfirmOrder", id },
        { type: "ConfirmOrder", id: "LIST" },
        { type: "Overview", id: "TRENDING" }, // ✅ Trending refresh
      ],
    }),

    getAllConfirmOrder: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;

        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/confirm-order", params };
      },

      providesTags: (result) =>
        result?.data
          ? [
              { type: "ConfirmOrder", id: "LIST" },
              ...result.data.map((r) => ({ type: "ConfirmOrder", id: r.Id })),
            ]
          : [{ type: "ConfirmOrder", id: "LIST" }],

      refetchOnMountOrArgChange: true,
      // pollingInterval: 1000, // ❌ এটা off রাখাই ভালো (performance)
    }),

    getAllConfirmOrderWithoutQuery: build.query({
      query: () => ({ url: "/confirm-order/all" }),
      providesTags: [{ type: "ConfirmOrder", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    // ✅ NEW: Trending Products API
    getTrendingProducts: build.query({
      query: (arg = {}) => {
        const { days = 7, limit = 10, sortBy = "soldQty" } = arg;

        const params = { days, limit, sortBy };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/confirm-order/trending-products", params };
      },

      providesTags: [{ type: "Overview", id: "TRENDING" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertConfirmOrderMutation,
  useDeleteConfirmOrderMutation,
  useUpdateConfirmOrderMutation,
  useGetAllConfirmOrderQuery,
  useGetAllConfirmOrderWithoutQueryQuery,
  useGetTrendingProductsQuery, // ✅ export hook
} = confirmOrderApi;
