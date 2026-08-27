import { baseApi } from "../baseApi/api";

export const accountBalanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAccountBalanceSummary: build.query({
      query: () => ({ url: "/account-balance" }),
      providesTags: [{ type: "AccountBalance", id: "SUMMARY" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const { useGetAccountBalanceSummaryQuery } = accountBalanceApi;
