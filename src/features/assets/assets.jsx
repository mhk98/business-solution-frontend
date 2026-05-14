// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const assetsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertAsset: build.mutation({
      query: (data) => ({
        url: "asset/create",
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

    deleteAsset: build.mutation({
      query: (id) => ({
        url: `asset/${id}`,
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

    updateAsset: build.mutation({
      query: ({ id, data }) => ({
        url: `asset/${id}`,
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

    getAllAsset: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "asset",
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

    getAllAssetWithoutQuery: build.query({
      query: () => ({
        url: "asset/all",
      }),
      providesTags: [{ type: "AssetsSale", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllAssetQuery,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useInsertAssetMutation,
  useGetAllAssetWithoutQueryQuery,
} = assetsApi;
