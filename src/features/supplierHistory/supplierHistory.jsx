// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const supplierHistoryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllSupplierHistory: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, bookId, supplierId } = arg;

        const params = { page, limit, startDate, endDate, bookId, supplierId };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "supplier-history", params };
      },

      // ✅ list + each row
      providesTags: (result) =>
        result?.data
          ? [
              { type: "SupplierHistory", id: "LIST" },
              ...result.data.map((r) => ({
                type: "SupplierHistory",
                id: r.Id,
              })),
            ]
          : [{ type: "SupplierHistory", id: "LIST" }],

      refetchOnMountOrArgChange: true,
    }),

    getAllSupplierHistoryWithoutQuery: build.query({
      query: () => ({ url: "supplier-history/all" }),
      providesTags: [
        { type: "SupplierHistory", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
      refetchOnMountOrArgChange: true,
    }),

    // ✅ Get all suppliers summary (total paid, unpaid, net balance)
    getAllSupplierSummary: build.query({
      query: (arg = {}) => {
        const { startDate, endDate, bookId } = arg;
        const params = { startDate, endDate, bookId };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });
        return { url: "supplier-history/summary", params };
      },
      providesTags: [{ type: "SupplierHistory", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    insertSupplierHistory: build.mutation({
      query: (data) => ({
        url: "supplier-history/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "SupplierHistory", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),

    updateSupplierHistory: build.mutation({
      query: ({ id, data }) => ({
        url: `supplier-history/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "SupplierHistory", id: arg.id },
        { type: "SupplierHistory", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),

    deleteSupplierHistory: build.mutation({
      query: (id) => ({
        url: `supplier-history/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "SupplierHistory", id },
        { type: "SupplierHistory", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),
    getSingleSupplierHistory: build.mutation({
      query: (id) => ({
        url: `supplier-history/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "SupplierHistory", id },
        { type: "SupplierHistory", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllSupplierHistoryQuery,
  useGetAllSupplierHistoryWithoutQueryQuery,
  useGetAllSupplierSummaryQuery,
  useInsertSupplierHistoryMutation,
  useUpdateSupplierHistoryMutation,
  useDeleteSupplierHistoryMutation,
  useGetSingleSupplierHistoryMutation,
} = supplierHistoryApi;
