// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

// // Helper function to get the auth token
// const getAuthToken = () => {
//   return localStorage.getItem("token"); // Modify this based on your token storage logic
// };

// export const assetsSaleApi = createApi({
//   reducerPath: "assetsSaleApi",
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

//   tagTypes: ["assets-sale"], // Define the tag type for invalidation and refetching
//   endpoints: (build) => ({
//     insertAssetsSale: build.mutation({
//       query: (data) => ({
//         url: "/assets-sale/create",
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["assets-sale"], // Invalidate the product tag after this mutation
//     }),

//     deleteAssetsSale: build.mutation({
//       query: (id) => ({
//         url: `/assets-sale/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["assets-sale"], // Invalidate the product tag after deletion
//     }),

//     updateAssetsSale: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/assets-sale/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["assets-sale"], // Invalidate the product tag after this mutation
//     }),

//     getAllAssetsSale: build.query({
//       query: ({ page, limit, startDate, endDate, name }) => ({
//         url: "/assets-sale",
//         params: { page, limit, startDate, endDate, name }, // Pass the page and limit as query params
//       }),
//       providesTags: ["assets-sale"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),

//     getAllAssetsSaleWithoutQuery: build.query({
//       query: () => ({
//         url: "/assets-sale/all",
//       }),
//       providesTags: ["assets-sale"],

//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// export const {
//   useGetAllAssetsSaleQuery,
//   useInsertAssetsSaleMutation,
//   useUpdateAssetsSaleMutation,
//   useDeleteAssetsSaleMutation,
//   useGetAllAssetsSaleWithoutQueryQuery,
// } = assetsSaleApi;

export const assetsSaleApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertAssetsSale: build.mutation({
      query: (data) => ({
        url: "assets-sale/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "AssetsSale", id: "LIST" },
        { type: "AssetsPurchase", id: "LIST" }, // ✅ stock কমে, তাই purchase refetch
        { type: "AssetsStock", id: "LIST" },
        { type: "Overview", id: "LIST" }, // ✅ stock কমে, তাই purchase refetch
      ],
    }),

    deleteAssetsSale: build.mutation({
      query: (id) => ({
        url: `assets-sale/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "AssetsSale", id: "LIST" },
        { type: "AssetsSale", id },
        { type: "AssetsPurchase", id: "LIST" }, // ✅ stock ফেরত যায়
        { type: "AssetsStock", id: "LIST" },
        { type: "Overview", id: "LIST" }, // ✅ stock ফেরত যায়
      ],
    }),

    updateAssetsSale: build.mutation({
      query: ({ id, data }) => ({
        url: `assets-sale/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "AssetsSale", id: "LIST" },
        { type: "AssetsSale", id: arg.id },
        { type: "AssetsPurchase", id: "LIST" }, // ✅ stock change
        { type: "AssetsStock", id: "LIST" },
        { type: "Overview", id: "LIST" }, // ✅ stock change
      ],
    }),

    getAllAssetsSale: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "assets-sale",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "AssetsSale", id: "LIST" },
              ...result.data.map((r) => ({ type: "AssetsSale", id: r.Id })),
            ]
          : [{ type: "AssetsSale", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllAssetsSaleWithoutQuery: build.query({
      query: () => ({
        url: "assets-sale/all",
      }),
      providesTags: [{ type: "AssetsSale", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllAssetsSaleQuery,
  useInsertAssetsSaleMutation,
  useUpdateAssetsSaleMutation,
  useDeleteAssetsSaleMutation,
  useGetAllAssetsSaleWithoutQueryQuery,
} = assetsSaleApi;
