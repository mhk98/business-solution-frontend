

import { baseApi } from "../baseApi/api";

export const cashInOutApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertCashInOut: build.mutation({
      query: (data) => ({
        url: "/cash-in-out/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "CashInOut", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    updateCashInOut: build.mutation({
      query: ({ id, data }) => ({
        url: `/cash-in-out/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "CashInOut", id: arg.id },
        { type: "CashInOut", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    deleteCashInOut: build.mutation({
      query: (arg) => {
        const id = arg?.id ?? arg;
        const note = arg?.note;

        return {
          url: `/cash-in-out/${id}`,
          method: "DELETE",
          headers: note ? { "x-delete-note": note } : undefined,
        };
      },
      invalidatesTags: (res, err, arg) => {
        const id = arg?.id ?? arg;
        return [
          { type: "CashInOut", id },
          { type: "CashInOut", id: "LIST" },
          { type: "Overview", id: "LIST" },
        ];
      },
    }),

    getAllCashInOut: build.query({
      query: (arg = {}) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          paymentMode,
          paymentStatus,
          category,
          lender,
          loanId,
          bookId,
        } = arg;

        const params = {
          page,
          limit,
          bookId,
          startDate,
          endDate,
          searchTerm,
          paymentMode,
          paymentStatus,
          category,
          lender,
          loanId,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/cash-in-out", params };
      },

      providesTags: (result) => {
        const rows = result?.data;
        if (Array.isArray(rows) && rows.length) {
          return [
            { type: "CashInOut", id: "LIST" },
            ...rows.map((r) => ({
              type: "CashInOut",
              id: r.Id ?? r.id,
            })),
          ];
        }
        return [{ type: "CashInOut", id: "LIST" }];
      },

      refetchOnMountOrArgChange: true,
    }),

    getLoanSummaries: build.query({
      query: (arg = {}) => {
        const { page, limit, searchTerm, startDate, endDate } = arg;
        const params = { page, limit, searchTerm, startDate, endDate };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/cash-in-out/loans", params };
      },
      providesTags: [{ type: "CashInOut", id: "LOANS" }],
      refetchOnMountOrArgChange: true,
    }),

    getLoanHistory: build.query({
      query: ({ loanId, lender, page, limit, searchTerm, startDate, endDate }) => {
        const params = { page, limit, searchTerm, startDate, endDate };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return {
          url: `/cash-in-out/loans/${encodeURIComponent(loanId || lender)}`,
          params,
        };
      },
      providesTags: (result, err, arg) => [
        { type: "CashInOut", id: `LOAN-${arg?.loanId || arg?.lender || ""}` },
      ],
      refetchOnMountOrArgChange: true,
    }),

    getSingleCashInOut: build.query({
      query: (id) => ({ url: `/cash-in-out/${id}` }),

      providesTags: (result, err, id) => [{ type: "CashInOut", id }],
    }),

    getAllCashInOutWithoutQuery: build.query({
      query: () => ({ url: "/cash-in-out/all" }),
      providesTags: [{ type: "CashInOut", id: "LIST" }],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000, // দরকার না হলে off করুন
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllCashInOutQuery,
  useGetSingleCashInOutQuery,
  useInsertCashInOutMutation,
  useUpdateCashInOutMutation,
  useDeleteCashInOutMutation,
  useGetLoanSummariesQuery,
  useGetLoanHistoryQuery,
  useGetAllCashInOutWithoutQueryQuery,
} = cashInOutApi;
