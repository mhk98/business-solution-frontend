// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

// // Helper function to get the auth token
// const getAuthToken = () => {
//   return localStorage.getItem("token"); // Modify this based on your token storage logic
// };

// export const assetsDamageApi = createApi({
//   reducerPath: "assetsDamageApi",
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

//   tagTypes: ["assets-damage"], // Define the tag type for invalidation and refetching
//   endpoints: (build) => ({
//     insertAssetsDamage: build.mutation({
//       query: (data) => ({
//         url: "/assets-damage/create",
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["assets-damage"], // Invalidate the product tag after this mutation
//     }),

//     deleteAssetsDamage: build.mutation({
//       query: (id) => ({
//         url: `/assets-damage/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["assets-damage"], // Invalidate the product tag after deletion
//     }),

//     updateAssetsDamage: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/assets-damage/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["assets-damage"], // Invalidate the product tag after this mutation
//     }),

//     getAllAssetsDamage: build.query({
//       query: ({ page, limit, startDate, endDate, name }) => ({
//         url: "/assets-damage",
//         params: { page, limit, startDate, endDate, name }, // Pass the page and limit as query params
//       }),
//       providesTags: ["assets-damage"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),

//     getAllAssetsDamageWithoutQuery: build.query({
//       query: () => ({
//         url: "/assets-damage/all",
//       }),
//       providesTags: ["assets-damage"],

//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//   }),
// });

// export const {
//   useGetAllAssetsDamageQuery,
//   useInsertAssetsDamageMutation,
//   useUpdateAssetsDamageMutation,
//   useDeleteAssetsDamageMutation,
//   useGetAllAssetsDamageWithoutQueryQuery,
// } = assetsDamageApi;

export const assetsDamageApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertAssetsDamage: build.mutation({
      query: (data) => ({
        url: "assets-damage/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "AssetsDamage", id: "LIST" },
        { type: "AssetsPurchase", id: "LIST" }, // ✅ damage হলে stock কমে (যদি তোমার backend এ purchase qty update হয়)
        { type: "AssetsStock", id: "LIST" },
        { type: "Overview", id: "LIST" }, // ✅ damage হলে stock কমে (যদি তোমার backend এ purchase qty update হয়)
      ],
    }),

    deleteAssetsDamage: build.mutation({
      query: (id) => ({
        url: `assets-damage/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "AssetsDamage", id: "LIST" },
        { type: "AssetsDamage", id },
        { type: "AssetsPurchase", id: "LIST" }, // ✅ delete হলে stock ফেরত যেতে পারে (তোমার logic অনুযায়ী)
        { type: "AssetsStock", id: "LIST" },
        { type: "Overview", id: "LIST" }, // ✅ delete হলে stock ফেরত যেতে পারে (তোমার logic অনুযায়ী)
      ],
    }),

    updateAssetsDamage: build.mutation({
      query: ({ id, data }) => ({
        url: `assets-damage/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "AssetsDamage", id: "LIST" },
        { type: "AssetsDamage", id: arg.id },
        { type: "AssetsPurchase", id: "LIST" }, // ✅ update হলে stock adjust হতে পারে
        { type: "AssetsStock", id: "LIST" },
        { type: "Overview", id: "LIST" }, // ✅ update হলে stock adjust হতে পারে
      ],
    }),

    getAllAssetsDamage: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "assets-damage",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "AssetsDamage", id: "LIST" },
              ...result.data.map((r) => ({ type: "AssetsDamage", id: r.Id })),
            ]
          : [{ type: "AssetsDamage", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllAssetsDamageWithoutQuery: build.query({
      query: () => ({
        url: "assets-damage/all",
      }),
      providesTags: [{ type: "AssetsDamage", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllAssetsDamageQuery,
  useInsertAssetsDamageMutation,
  useUpdateAssetsDamageMutation,
  useDeleteAssetsDamageMutation,
  useGetAllAssetsDamageWithoutQueryQuery,
} = assetsDamageApi;
