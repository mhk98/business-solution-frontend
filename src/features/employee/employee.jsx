import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const employeeApi = createApi({
  reducerPath: "employeeApi",
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

  tagTypes: ["employee"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertEmployee: build.mutation({
      query: (data) => ({
        url: "/employee/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["employee"], // Invalidate the Employee tag after this mutation
    }),

    deleteEmployee: build.mutation({
      query: (id) => ({
        url: `/employee/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["employee"], // Invalidate the Employee tag after deletion
    }),

    updateEmployee: build.mutation({
      query: ({ id, data }) => ({
        url: `/employee/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["employee"], // Invalidate the Employee tag after this mutation
    }),

    getAllEmployee: build.query({
      query: ({
        page,
        limit,
        startDate,
        endDate,
        name,
        departmentId,
        status,
      }) => ({
        url: "/employee",
        params: { page, limit, startDate, endDate, name, departmentId, status }, // Pass the page and limit as query params
      }),
      providesTags: ["employee"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllEmployeeWithoutQuery: build.query({
      query: () => ({
        url: "/employee/all",
      }),
      providesTags: ["employee"],

      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertEmployeeMutation,
  useGetAllEmployeeQuery,
  useDeleteEmployeeMutation,
  useUpdateEmployeeMutation,
  useGetAllEmployeeWithoutQueryQuery,
} = employeeApi;
