import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token (you can store and retrieve it as needed)
const getAuthToken = () => {
  return localStorage.getItem("token"); // Replace with your token retrieval logic
};

export const accountingApi = createApi({
  reducerPath: "accountingApi",
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
  tagTypes: ["accounting"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertAccounting: build.mutation({
      query: (data) => ({
        url: "/accounting/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["accounting"], // Invalidate the accounting tag after this mutation
    }),

    deleteAccounting: build.mutation({
      query: (id) => ({
        url: `/accounting/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["accounting"], // Invalidate the accounting tag after deletion
    }),

    updateAccounting: build.mutation({
      query: ({ id, data }) => ({
        url: `/accounting/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["accounting"], // Invalidate the accounting tag after this mutation
    }),

    // getAllAccounting: build.query({
    //   query: () => ({
    //     url: "/accounting",
    //   }),
    //   providesTags: ["accounting"],  // Provide the accounting tag to manage caching and invalidation
    //   refetchOnMountOrArgChange: true,
    //   pollingInterval: 1000,
    // }),

    getAllAccounting: build.query({
      query: ({ page, limit }) => ({
        url: "/accounting",
        params: { page, limit }, // Pass the page and limit as query params
      }),
      providesTags: ["accounting"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertAccountingMutation,
  useGetAllAccountingQuery,
  useDeleteAccountingMutation,
  useUpdateAccountingMutation,
} = accountingApi;
