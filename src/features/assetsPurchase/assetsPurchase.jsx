// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const assetsPurchaseApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertAssetsPurchase: build.mutation({
      query: (data) => ({
        url: "assets-purchase/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "AssetsPurchase", id: "LIST" },
        { type: "AssetsStock", id: "LIST" },
        { type: "AssetsSale", id: "LIST" }, // optional
        { type: "Overview", id: "LIST" }, // optional
      ],
    }),

    deleteAssetsPurchase: build.mutation({
      query: (id) => ({
        url: `assets-purchase/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "AssetsPurchase", id: "LIST" },
        { type: "AssetsStock", id: "LIST" },
        { type: "AssetsSale", id: "LIST" }, // optional
        { type: "Overview", id: "LIST" }, // optional
      ],
    }),

    updateAssetsPurchase: build.mutation({
      query: ({ id, data }) => ({
        url: `assets-purchase/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "AssetsPurchase", id: "LIST" },
        { type: "AssetsPurchase", id: arg.id },
        { type: "AssetsStock", id: "LIST" },
        { type: "AssetsSale", id: "LIST" }, // optional
        { type: "Overview", id: "LIST" }, // optional
      ],
    }),

    getAllAssetsPurchase: build.query({
      query: ({ page, limit, startDate, endDate, assetId }) => ({
        url: "assets-purchase",
        params: { page, limit, startDate, endDate, assetId },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
            { type: "AssetsPurchase", id: "LIST" },
            ...result.data.map((r) => ({ type: "AssetsPurchase", id: r.Id })),
          ]
          : [{ type: "AssetsPurchase", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllAssetsPurchaseWithoutQuery: build.query({
      query: () => ({
        url: "assets-purchase/all",
      }),
      providesTags: [{ type: "AssetsPurchase", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertAssetsPurchaseMutation,
  useGetAllAssetsPurchaseQuery,
  useDeleteAssetsPurchaseMutation,
  useUpdateAssetsPurchaseMutation,
  useGetAllAssetsPurchaseWithoutQueryQuery,
} = assetsPurchaseApi;
