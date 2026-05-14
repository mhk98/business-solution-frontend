// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const inventoryOverviewApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllInventoryOverview: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm, name } = arg;

        const params = { page, limit, startDate, endDate, searchTerm, name };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/inventory-master", params };
      },

      // ✅ list + each row
      providesTags: (result) =>
        result?.data
          ? [
              { type: "InventoryOverview", id: "LIST" },
              ...result.data.map((r) => ({
                type: "InventoryOverview",
                id: r.Id,
              })),
            ]
          : [{ type: "InventoryOverview", id: "LIST" }],

      refetchOnMountOrArgChange: true,
    }),

    getAllInventoryOverviewWithoutQuery: build.query({
      query: () => ({ url: "/inventory-master/all" }),
      providesTags: [{ type: "InventoryOverview", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getInventoryOverviewLowStock: build.query({
      query: () => ({ url: "/inventory-master/low-stock" }),
      providesTags: [{ type: "InventoryOverview", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    insertInventoryOverview: build.mutation({
      query: (data) => ({
        url: "/inventory-master/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "InventoryOverview", id: "LIST" }],
    }),

    updateInventoryOverview: build.mutation({
      query: ({ id, data }) => ({
        url: `/inventory-master/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "InventoryOverview", id: arg.id },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),

    deleteInventoryOverview: build.mutation({
      query: (id) => ({
        url: `/inventory-master/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "InventoryOverview", id },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllInventoryOverviewQuery,
  useGetAllInventoryOverviewWithoutQueryQuery,
  useInsertInventoryOverviewMutation,
  useUpdateInventoryOverviewMutation,
  useDeleteInventoryOverviewMutation,
  useGetInventoryOverviewLowStockQuery,
} = inventoryOverviewApi;
