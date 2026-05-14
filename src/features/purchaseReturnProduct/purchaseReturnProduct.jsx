// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

// // Helper function to get the auth token
// const getAuthToken = () => {
//   return localStorage.getItem("token"); // Modify this based on your token storage logic
// };

// export const purchaseReturnProductApi = createApi({
//   reducerPath: "purchaseReturnProductApi",
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

//   tagTypes: ["purchase-return-product"], // Define the tag type for invalidation and refetching
//   endpoints: (build) => ({
//     insertPurchaseReturnProduct: build.mutation({
//       query: (data) => ({
//         url: "/purchase-return-product/create",
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["purchase-return-product"], // Invalidate the purchase-return-product tag after this mutation
//     }),

//     deletePurchaseReturnProduct: build.mutation({
//       query: (id) => ({
//         url: `/purchase-return-product/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["purchase-return-product"], // Invalidate the purchase-return-product tag after deletion
//     }),

//     updatePurchaseReturnProduct: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/purchase-return-product/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["purchase-return-product"], // Invalidate the purchase-return-product tag after this mutation
//     }),

//     getAllPurchaseReturnProduct: build.query({
//       query: ({ page, limit, startDate, endDate, name }) => ({
//         url: "/purchase-return-product",
//         params: { page, limit, startDate, endDate, name }, // Pass the page and limit as query params
//       }),
//       providesTags: ["purchase-return-product"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),

//     getAllPurchaseReturnProductWithoutQuery: build.query({
//       query: () => ({
//         url: "/purchase-return-product/all",
//       }),
//       providesTags: ["purchase-return-product"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// export const {
//   useInsertPurchaseReturnProductMutation,
//   useGetAllPurchaseReturnProductQuery,
//   useDeletePurchaseReturnProductMutation,
//   useUpdatePurchaseReturnProductMutation,
//   useGetAllPurchaseReturnProductWithoutQueryQuery,
// } = purchaseReturnProductApi;

export const purchaseReturnProductApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllPurchaseReturnProduct: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm, name } = arg;

        const params = { page, limit, startDate, endDate, searchTerm, name };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/purchase-return-product", params };
      },

      providesTags: (result) =>
        result?.data
          ? [
              { type: "PurchaseReturn", id: "LIST" },
              ...result.data.map((r) => ({ type: "PurchaseReturn", id: r.Id })),
            ]
          : [{ type: "PurchaseReturn", id: "LIST" }],

      refetchOnMountOrArgChange: true,
    }),

    getAllPurchaseReturnProductWithoutQuery: build.query({
      query: () => ({ url: "/purchase-return-product/all" }),
      providesTags: [{ type: "PurchaseReturn", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    insertPurchaseReturnProduct: build.mutation({
      query: (data) => ({
        url: "/purchase-return-product/create",
        method: "POST",
        body: data,
      }),

      // ✅ return insert affects InventoryOverview stock too
      invalidatesTags: [
        { type: "PurchaseReturn", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),

    updatePurchaseReturnProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/purchase-return-product/${id}`,
        method: "PUT",
        body: data,
      }),

      // ✅ update also affects received stock (if approved)
      invalidatesTags: (res, err, arg) => [
        { type: "PurchaseReturn", id: arg.id },
        { type: "PurchaseReturn", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),

    deletePurchaseReturnProduct: build.mutation({
      query: (id) => ({
        url: `/purchase-return-product/${id}`,
        method: "DELETE",
      }),

      // ✅ delete also restores received stock
      invalidatesTags: (res, err, id) => [
        { type: "PurchaseReturn", id },
        { type: "PurchaseReturn", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllPurchaseReturnProductQuery,
  useGetAllPurchaseReturnProductWithoutQueryQuery,
  useInsertPurchaseReturnProductMutation,
  useUpdatePurchaseReturnProductMutation,
  useDeletePurchaseReturnProductMutation,
} = purchaseReturnProductApi;
