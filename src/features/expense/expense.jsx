import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const expenseApi = createApi({
  reducerPath: "expenseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken(); // Fetch the token
      if (token) {
        // If the token exists, add it to the headers
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: ["expense"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertExpense: build.mutation({
      query: (data) => ({
        url: "/expense/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["expense"], // Invalidate the Expense tag after this mutation
    }),

    deleteExpense: build.mutation({
      query: (id) => ({
        url: `/expense/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["expense"], // Invalidate the Expense tag after deletion
    }),

    updateExpense: build.mutation({
      query: ({ id, data }) => ({
        url: `/expense/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["expense"], // Invalidate the Expense tag after this mutation
    }),

    getAllExpense: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "/expense",
        params: { page, limit, startDate, endDate, name }, // Pass the page and limit as query params
      }),
      providesTags: ["expense"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllExpenseWithoutQuery: build.query({
      query: () => ({
        url: "/expense/all",
      }),
      providesTags: ["expense"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useGetAllExpenseQuery,
  useGetAllExpenseWithoutQueryQuery,
  useDeleteExpenseMutation,
  useUpdateExpenseMutation,
  useInsertExpenseMutation,
} = expenseApi;
