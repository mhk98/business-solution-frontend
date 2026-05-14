// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const profitLossApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertProfitLoss: build.mutation({
      query: (data) => ({
        url: "profit-loss/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "ProfitLoss", id: "LIST" }],
    }),
    sendProfitLossInvoice: build.mutation({
      query: (data) => ({
        url: "profit-loss/invoice",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "ProfitLoss", id: "LIST" }],
    }),

    deleteProfitLoss: build.mutation({
      query: (id) => ({
        url: `profit-loss/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ProfitLoss", id: "LIST" }],
    }),

    updateProfitLoss: build.mutation({
      query: ({ id, data }) => ({
        url: `profit-loss/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ProfitLoss", id: "LIST" },
        { type: "ProfitLoss", id: arg.id },
      ],
    }),

    getAllProfitLoss: build.query({
      query: ({ page, limit, startDate, endDate, name, searchTerm, mode }) => ({
        url: "profit-loss",
        params: { page, limit, startDate, endDate, name, searchTerm, mode },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "ProfitLoss", id: "LIST" },
              ...result.data.map((r) => ({ type: "ProfitLoss", id: r.Id })),
            ]
          : [{ type: "ProfitLoss", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllProfitLossWithoutQuery: build.query({
      query: () => ({
        url: "profit-loss/all",
      }),
      providesTags: [{ type: "ProfitLoss", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertProfitLossMutation,
  useSendProfitLossInvoiceMutation,
  useGetAllProfitLossQuery,
  useDeleteProfitLossMutation,
  useUpdateProfitLossMutation,
  useGetAllProfitLossWithoutQueryQuery,
} = profitLossApi;
