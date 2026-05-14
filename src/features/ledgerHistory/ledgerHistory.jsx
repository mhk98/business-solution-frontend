// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const ledgerHistoryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertLedgerHistory: build.mutation({
      query: (data) => ({
        url: "ledger-history/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "LedgerHistory", id: "LIST" },
        { type: "SupplierHistory", id: "LIST" },
        { type: "CashInOut", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    deleteLedgerHistory: build.mutation({
      query: (id) => ({
        url: `ledger-history/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "LedgerHistory", id: "LIST" },
        { type: "SupplierHistory", id: "LIST" },
        { type: "CashInOut", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    updateLedgerHistory: build.mutation({
      query: ({ id, data }) => ({
        url: `ledger-history/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "LedgerHistory", id: "LIST" },
        { type: "LedgerHistory", id: arg.id },
        { type: "SupplierHistory", id: "LIST" },
        { type: "CashInOut", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    getAllLedgerHistory: build.query({
      query: ({
        page,
        limit,
        startDate,
        endDate,
        name,
        searchTerm,
        ledgerId,
        employeeId,
        supplierId,
      }) => ({
        url: "ledger-history",
        params: {
          page,
          limit,
          startDate,
          endDate,
          name,
          searchTerm,
          ledgerId,
          employeeId,
          supplierId,
        },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "LedgerHistory", id: "LIST" },
              ...result.data.map((r) => ({ type: "LedgerHistory", id: r.Id })),
            ]
          : [{ type: "LedgerHistory", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllLedgerHistoryWithoutQuery: build.query({
      query: () => ({
        url: "ledger-history/all",
      }),
      providesTags: [{ type: "LedgerHistory", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertLedgerHistoryMutation,
  useGetAllLedgerHistoryQuery,
  useDeleteLedgerHistoryMutation,
  useUpdateLedgerHistoryMutation,
  useGetAllLedgerHistoryWithoutQueryQuery,
} = ledgerHistoryApi;
