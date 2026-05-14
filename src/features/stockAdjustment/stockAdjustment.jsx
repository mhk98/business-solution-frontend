// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const stockAdjustmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertStockAdjustment: build.mutation({
      query: (data) => ({
        url: "stock-adjustment/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "StockAdjustment", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
      ],
    }),

    deleteStockAdjustment: build.mutation({
      query: (id) => ({
        url: `stock-adjustment/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "StockAdjustment", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
      ],
    }),

    getSingleStockAdjustmentDataById: build.mutation({
      query: (id) => ({
        url: `stock-adjustment/${id}`,
        method: "GET",
      }),
      invalidatesTags: [
        { type: "StockAdjustment", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
      ],
    }),

    updateStockAdjustment: build.mutation({
      query: ({ id, data }) => ({
        url: `stock-adjustment/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "StockAdjustment", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
        { type: "StockAdjustment", id: arg.id },
      ],
    }),

    getAllStockAdjustment: build.query({
      query: ({ page, limit, startDate, endDate, name, supplierId }) => ({
        url: "stock-adjustment",
        params: { page, limit, startDate, endDate, name, supplierId },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "StockAdjustment", id: "LIST" },
              ...result.data.map((r) => ({
                type: "StockAdjustment",
                id: r.Id,
              })),
            ]
          : [{ type: "StockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllStockAdjustmentWithoutQuery: build.query({
      query: () => ({
        url: "stock-adjustment/all",
      }),
      providesTags: [{ type: "StockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertStockAdjustmentMutation,
  useGetAllStockAdjustmentQuery,
  useDeleteStockAdjustmentMutation,
  useUpdateStockAdjustmentMutation,
  useGetAllStockAdjustmentWithoutQueryQuery,
  useGetSingleStockAdjustmentDataByIdMutation,
} = stockAdjustmentApi;
