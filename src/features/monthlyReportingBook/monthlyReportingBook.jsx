import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => {
  return localStorage.getItem("token");
};

export const monthlyReportingBookApi = createApi({
  reducerPath: "monthlyReportingBookApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: ["monthlyReportingBook"],
  endpoints: (build) => ({
    getMonthlyReportingSummary: build.query({
      query: ({
        month,
        startDate,
        endDate,
        bookId,
        categoryId,
        searchTerm,
        page,
        limit,
      } = {}) => ({
        url: "/monthly-reporting-book/summary",
        params: {
          month,
          startDate,
          endDate,
          bookId,
          categoryId,
          searchTerm,
          page,
          limit,
        },
      }),
      providesTags: ["monthlyReportingBook"],
      refetchOnMountOrArgChange: true,
    }),

    getMonthlyReportingTransactions: build.query({
      query: ({
        month,
        startDate,
        endDate,
        bookId,
        categoryId,
        page,
        limit,
      } = {}) => ({
        url: "/monthly-reporting-book/transactions",
        params: { month, startDate, endDate, bookId, categoryId, page, limit },
      }),
      providesTags: ["monthlyReportingBook"],
      refetchOnMountOrArgChange: true,
    }),

    getBookStatement: build.query({
      query: ({ month, startDate, endDate, bookId } = {}) => ({
        url: "/monthly-reporting-book/book-statement",
        params: { month, startDate, endDate, bookId },
      }),
      providesTags: ["monthlyReportingBook"],
    }),
  }),
});

export const {
  useGetMonthlyReportingSummaryQuery,
  useLazyGetMonthlyReportingSummaryQuery,
  useGetMonthlyReportingTransactionsQuery,
  useLazyGetBookStatementQuery,
} = monthlyReportingBookApi;
