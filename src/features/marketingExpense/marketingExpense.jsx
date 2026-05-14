import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const marketingExpenseApi = createApi({
  reducerPath: "marketingExpenseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["marketingExpense"],
  endpoints: (build) => ({
    insertMarketingExpense: build.mutation({
      query: (data) => ({
        url: "/marketing-expense/create",
        method: "POST",
        body: data, // FormData
      }),
      invalidatesTags: ["marketingExpense"],
    }),

    updateMarketingExpense: build.mutation({
      query: ({ id, data }) => ({
        url: `/marketing-expense/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["marketingExpense"],
    }),

    deleteMarketingExpense: build.mutation({
      query: (id) => ({
        url: `/marketing-expense/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["marketingExpense"],
    }),

    // ✅ FIXED: FILTER PARAMS PASSING
    getAllMarketingExpense: build.query({
      query: (arg) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          paymentMode,
          paymentStatus,
          category,
          bookId,
        } = arg || {};

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
        };

        // ✅ remove undefined/empty
        Object.keys(params).forEach((k) => {
          if (
            params[k] === undefined ||
            params[k] === null ||
            params[k] === ""
          ) {
            delete params[k];
          }
        });

        return {
          url: "/marketing-expense",
          params,
        };
      },
      providesTags: ["marketingExpense"],
      refetchOnMountOrArgChange: true,
      // ✅ pollingInterval off (debug এ সমস্যা করে)
      // pollingInterval: 1000,
    }),

    getSingleMarketingExpense: build.query({
      query: (id) => ({
        url: `/marketing-expense/${id}`,
      }),
      providesTags: ["marketingExpense"], // Provides the 'supplier' tag for caching and invalidation
    }),

    getAllMarketingExpenseWithoutQuery: build.query({
      query: () => ({
        url: "/marketing-expense/all",
      }),
      providesTags: ["marketingExpense"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getOverviewSummary: build.query({
      query: (arg = {}) => {
        const { from, to } = arg;

        const params = { from, to };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/marketing-expense//summary", params };
      },

      providesTags: [{ type: "marketingExpense", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useGetAllMarketingExpenseQuery,
  useGetSingleMarketingExpenseQuery,
  useInsertMarketingExpenseMutation,
  useUpdateMarketingExpenseMutation,
  useDeleteMarketingExpenseMutation,
  useGetAllMarketingExpenseWithoutQueryQuery,
  useGetOverviewSummaryQuery,
} = marketingExpenseApi;
