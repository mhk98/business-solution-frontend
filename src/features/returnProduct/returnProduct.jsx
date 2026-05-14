// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// // Helper function to get the auth token
// const getAuthToken = () => {
//   return localStorage.getItem("token"); // Modify this based on your token storage logic
// };

// export const returnProductApi = createApi({
//   reducerPath: "returnProductApi",
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

//   tagTypes: ["return-product"], // Define the tag type for invalidation and refetching
//   endpoints: (build) => ({
//     insertReturnProduct: build.mutation({
//       query: (data) => ({
//         url: "/return-product/create",
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["return-product"], // Invalidate the return-product tag after this mutation
//     }),

//     deleteReturnProduct: build.mutation({
//       query: (id) => ({
//         url: `/return-product/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["return-product"], // Invalidate the return-product tag after deletion
//     }),

//     updateReturnProduct: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/return-product/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["return-product"], // Invalidate the return-product tag after this mutation
//     }),

//     getAllReturnProduct: build.query({
//       query: ({ page, limit, startDate, endDate, name }) => ({
//         url: "/return-product",
//         params: { page, limit, startDate, endDate, name }, // Pass the page and limit as query params
//       }),
//       providesTags: ["return-product"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),

//     getAllReturnProductWithoutQuery: build.query({
//       query: () => ({
//         url: "/return-product/all",
//       }),
//       providesTags: ["return-product"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// export const {
//   useInsertReturnProductMutation,
//   useGetAllReturnProductQuery,
//   useDeleteReturnProductMutation,
//   useUpdateReturnProductMutation,
//   useGetAllReturnProductWithoutQueryQuery,
// } = returnProductApi;

import { baseApi } from "../baseApi/api";

export const returnProductApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertReturnProduct: build.mutation({
      query: (data) => ({
        url: "/return-product/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "ReturnProduct", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" }, // ✅ receive stock affected
        { type: "Overview", id: "LIST" }, // ✅ receive stock affected
      ],
    }),

    deleteReturnProduct: build.mutation({
      query: (id) => ({
        url: `/return-product/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "ReturnProduct", id },
        { type: "ReturnProduct", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ stock return/update
        { type: "Overview", id: "LIST" }, // ✅ stock return/update
      ],
    }),

    updateReturnProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/return-product/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ReturnProduct", id: arg.id },
        { type: "ReturnProduct", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ if update changes qty/status
        { type: "Overview", id: "LIST" }, // ✅ if update changes qty/status
      ],
    }),

    getAllReturnProduct: build.query({
      query: (arg = {}) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          name,
          searchTerm,
          sortBy,
          sortOrder,
        } = arg;
        const params = {
          page,
          limit,
          startDate,
          endDate,
          name,
          searchTerm,
          sortBy,
          sortOrder,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/return-product", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "ReturnProduct", id: "LIST" },
              ...result.data.map((r) => ({
                type: "ReturnProduct",
                id: r.Id,
              })),
            ]
          : [{ type: "ReturnProduct", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllReturnProductWithoutQuery: build.query({
      query: () => ({ url: "/return-product/all" }),
      providesTags: [{ type: "ReturnProduct", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertReturnProductMutation,
  useGetAllReturnProductQuery,
  useDeleteReturnProductMutation,
  useUpdateReturnProductMutation,
  useGetAllReturnProductWithoutQueryQuery,
} = returnProductApi;
