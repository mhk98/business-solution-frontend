// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const assetsRequisitionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertAssetsRequisition: build.mutation({
      query: (data) => ({
        url: "assets-requisition/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "AssetsRequisition", id: "LIST" },
        { type: "AssetsSale", id: "LIST" }, // optional
      ],
    }),

    deleteAssetsRequisition: build.mutation({
      query: (id) => ({
        url: `assets-requisition/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "AssetsRequisition", id: "LIST" },
        { type: "AssetsSale", id: "LIST" }, // optional
      ],
    }),

    updateAssetsRequisition: build.mutation({
      query: ({ id, data }) => ({
        url: `assets-requisition/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "AssetsRequisition", id: "LIST" },
        { type: "AssetsRequisition", id: arg.id },
        { type: "AssetsSale", id: "LIST" }, // optional
      ],
    }),

    getAllAssetsRequisition: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "assets-requisition",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
            { type: "AssetsRequisition", id: "LIST" },
            ...result.data.map((r) => ({
              type: "AssetsRequisition",
              id: r.Id,
            })),
          ]
          : [{ type: "AssetsRequisition", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllAssetsRequisitionWithoutQuery: build.query({
      query: () => ({
        url: "assets-requisition/all",
      }),
      providesTags: [{ type: "AssetsRequisition", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertAssetsRequisitionMutation,
  useGetAllAssetsRequisitionQuery,
  useDeleteAssetsRequisitionMutation,
  useUpdateAssetsRequisitionMutation,
  useGetAllAssetsRequisitionWithoutQueryQuery,
} = assetsRequisitionApi;
