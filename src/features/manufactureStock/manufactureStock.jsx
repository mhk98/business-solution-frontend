// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const itemMasterApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertItemMaster: build.mutation({
      query: (data) => ({
        url: "item-master/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "ItemMaster", id: "LIST" }],
    }),

    deleteItemMaster: build.mutation({
      query: (id) => ({
        url: `item-master/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ItemMaster", id: "LIST" }],
    }),

    // Unit Cost edit — admin & superAdmin only (backend enforces it).
    updateItemMasterUnitCost: build.mutation({
      query: ({ id, unitCost }) => ({
        url: `item-master/${id}/unit-cost`,
        method: "PATCH",
        body: { unitCost },
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ItemMaster", id: "LIST" },
        { type: "ItemMaster", id: arg.id },
      ],
    }),

    updateItemMaster: build.mutation({
      query: ({ id, data }) => ({
        url: `item-master/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ItemMaster", id: "LIST" },
        { type: "ItemMaster", id: arg.id },
      ],
    }),

    getAllItemMaster: build.query({
      query: ({ page, limit, startDate, endDate, name, itemIds }) => ({
        url: "item-master",
        params: { page, limit, startDate, endDate, name, itemIds },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "ItemMaster", id: "LIST" },
              ...result.data.map((r) => ({ type: "ItemMaster", id: r.Id })),
            ]
          : [{ type: "ItemMaster", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getSingleItemMasterDataById: build.mutation({
      query: (id) => ({
        url: `item-master/${id}`,
        method: "GET",
      }),
      invalidatesTags: [{ type: "ItemMaster", id: "LIST" }],
    }),

    getAllItemMasterWithoutQuery: build.query({
      query: () => ({
        url: "item-master/all",
      }),
      providesTags: [{ type: "ItemMaster", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  // Refresh the query definition during Vite HMR so new filters reach the API.
  overrideExisting: import.meta.env.DEV,
});

export const {
  useInsertItemMasterMutation,
  useGetAllItemMasterQuery,
  useDeleteItemMasterMutation,
  useUpdateItemMasterMutation,
  useUpdateItemMasterUnitCostMutation,
  useGetAllItemMasterWithoutQueryQuery,
  useGetSingleItemMasterDataByIdMutation,
} = itemMasterApi;
