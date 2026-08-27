import { baseApi } from "../baseApi/api";
import { bookApi } from "../book/book";
import { bankAccountApi } from "../bankAccount/bankAccount";

// Fund transfers move money between a book's Cash balance and/or a Bank
// account's balance, both of which are computed from FundTransfer +
// CashInOut rows in separate RTK Query caches. Invalidate them here so the
// Cash Balance card / Bank Account balance column refresh automatically.
const invalidateBalanceCaches = async (dispatch, queryFulfilled) => {
  try {
    await queryFulfilled;
    dispatch(bookApi.util.invalidateTags(["book"]));
    dispatch(bankAccountApi.util.invalidateTags(["bankAccount"]));
  } catch {
    // request failed; nothing to invalidate
  }
};

export const fundTransferApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertFundTransfer: build.mutation({
      query: (data) => ({
        url: "/fund-transfer/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "FundTransfer" },
        { type: "Overview", id: "LIST" },
        { type: "Overview", id: "DASHBOARD" },
        { type: "AccountBalance", id: "SUMMARY" },
      ],
      onQueryStarted: (arg, { dispatch, queryFulfilled }) =>
        invalidateBalanceCaches(dispatch, queryFulfilled),
    }),

    updateFundTransfer: build.mutation({
      query: ({ id, data }) => ({
        url: `/fund-transfer/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "FundTransfer", id: arg.id },
        { type: "FundTransfer" },
        { type: "Overview", id: "LIST" },
        { type: "Overview", id: "DASHBOARD" },
        { type: "AccountBalance", id: "SUMMARY" },
      ],
      onQueryStarted: (arg, { dispatch, queryFulfilled }) =>
        invalidateBalanceCaches(dispatch, queryFulfilled),
    }),

    deleteFundTransfer: build.mutation({
      query: (arg) => {
        const id = arg?.id ?? arg;
        const note = arg?.note;

        return {
          url: `/fund-transfer/${id}`,
          method: "DELETE",
          headers: note ? { "x-delete-note": note } : undefined,
        };
      },
      invalidatesTags: (res, err, arg) => {
        const id = arg?.id ?? arg;
        return [
          { type: "FundTransfer", id },
          { type: "FundTransfer" },
          { type: "Overview", id: "LIST" },
          { type: "Overview", id: "DASHBOARD" },
        ];
      },
      onQueryStarted: (arg, { dispatch, queryFulfilled }) =>
        invalidateBalanceCaches(dispatch, queryFulfilled),
    }),

    approveFundTransfer: build.mutation({
      query: (id) => ({
        url: `/fund-transfer/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "FundTransfer", id },
        { type: "FundTransfer" },
        { type: "AccountBalance", id: "SUMMARY" },
      ],
      onQueryStarted: (arg, { dispatch, queryFulfilled }) =>
        invalidateBalanceCaches(dispatch, queryFulfilled),
    }),

    getAllFundTransfer: build.query({
      query: (arg = {}) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          bookId,
          fromPaymentMode,
          toPaymentMode,
          fromBankAccount,
          toBankAccount,
          voucherNo,
          status,
        } = arg;

        const params = {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          bookId,
          fromPaymentMode,
          toPaymentMode,
          fromBankAccount,
          toBankAccount,
          voucherNo,
          status,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/fund-transfer", params };
      },

      providesTags: (result) => {
        const rows = result?.data;
        if (Array.isArray(rows) && rows.length) {
          return [
            { type: "FundTransfer", id: "LIST" },
            ...rows.map((r) => ({ type: "FundTransfer", id: r.Id ?? r.id })),
          ];
        }
        return [{ type: "FundTransfer", id: "LIST" }];
      },

      refetchOnMountOrArgChange: true,
    }),

    getSingleFundTransfer: build.query({
      query: (id) => ({ url: `/fund-transfer/${id}` }),
      providesTags: (result, err, id) => [{ type: "FundTransfer", id }],
    }),

    getAllFundTransferWithoutQuery: build.query({
      query: () => ({ url: "/fund-transfer/all" }),
      providesTags: [{ type: "FundTransfer", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllFundTransferQuery,
  useGetSingleFundTransferQuery,
  useGetAllFundTransferWithoutQueryQuery,
  useInsertFundTransferMutation,
  useUpdateFundTransferMutation,
  useDeleteFundTransferMutation,
  useApproveFundTransferMutation,
} = fundTransferApi;
