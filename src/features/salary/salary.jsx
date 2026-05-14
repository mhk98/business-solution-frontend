import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const salaryApi = createApi({
  reducerPath: "salaryApi",
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

  tagTypes: ["salary"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertSalary: build.mutation({
      query: (data) => ({
        url: "/salary/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["salary"], // Invalidate the Salary tag after this mutation
    }),

    deleteSalary: build.mutation({
      query: (id) => ({
        url: `/salary/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["salary"], // Invalidate the Salary tag after deletion
    }),

    updateSalary: build.mutation({
      query: ({ id, data }) => ({
        url: `/salary/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["salary"], // Invalidate the Salary tag after this mutation
    }),

    getAllSalary: build.query({
      query: () => ({
        url: "/salary",
        params: {}, // Pass the page and limit as query params
      }),
      providesTags: ["salary"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllSalaryWithoutQuery: build.query({
      query: () => ({
        url: "/salary/all",
      }),
      providesTags: ["salary"],

      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertSalaryMutation,
  useGetAllSalaryQuery,
  useDeleteSalaryMutation,
  useUpdateSalaryMutation,
  useGetAllSalaryWithoutQueryQuery,
} = salaryApi;
