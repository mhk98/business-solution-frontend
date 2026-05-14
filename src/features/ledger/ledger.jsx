// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const ledgerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertLedger: build.mutation({
      query: (data) => ({
        url: "ledger/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Ledger", id: "LIST" }],
    }),

    deleteLedger: build.mutation({
      query: (id) => ({
        url: `ledger/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Ledger", id: "LIST" }],
    }),

    updateLedger: build.mutation({
      query: ({ id, data }) => ({
        url: `ledger/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "Ledger", id: "LIST" },
        { type: "Ledger", id: arg.id },
      ],
    }),

    getAllLedger: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "ledger",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "Ledger", id: "LIST" },
              ...result.data.map((r) => ({ type: "Ledger", id: r.Id })),
            ]
          : [{ type: "Ledger", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllLedgerWithoutQuery: build.query({
      query: () => ({
        url: "ledger/all",
      }),
      providesTags: [{ type: "Ledger", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertLedgerMutation,
  useGetAllLedgerQuery,
  useDeleteLedgerMutation,
  useUpdateLedgerMutation,
  useGetAllLedgerWithoutQueryQuery,
} = ledgerApi;
