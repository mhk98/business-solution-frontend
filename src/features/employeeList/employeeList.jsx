import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const employeeListApi = createApi({
  reducerPath: "employeeListApi",
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

  tagTypes: ["EmployeeList"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertEmployeeList: build.mutation({
      query: (data) => ({
        url: "/employee-list/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["EmployeeList"], // Invalidate the EmployeeList tag after this mutation
    }),

    deleteEmployeeList: build.mutation({
      query: ({ id, note }) => ({
        url: `/employee-list/${id}`,
        method: "DELETE",
        body: note ? { note } : undefined,
      }),
      invalidatesTags: ["EmployeeList"], // Invalidate the EmployeeList tag after deletion
    }),
    getSingleEmployeeList: build.mutation({
      query: (id) => ({
        url: `/employee-list/${id}`,
        method: "GET",
      }),
      invalidatesTags: ["EmployeeList"], // Invalidate the EmployeeList tag after deletion
    }),

    updateEmployeeList: build.mutation({
      query: ({ id, data }) => ({
        url: `/employee-list/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["EmployeeList"], // Invalidate the EmployeeList tag after this mutation
    }),
    approveEmployeeList: build.mutation({
      query: (id) => ({
        url: `/employee-list/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["EmployeeList"],
    }),

    getAllEmployeeList: build.query({
      query: (params = {}) => ({
        url: "/employee-list",
        params,
      }),
      providesTags: ["EmployeeList"],
      refetchOnMountOrArgChange: true,
    }),

    getAllEmployeeListWithoutQuery: build.query({
      query: () => ({
        url: "/employee-list/all",
      }),
      providesTags: ["EmployeeList"],
      refetchOnMountOrArgChange: true,
    }),
    getMyEmployeeProfile: build.query({
      query: () => ({
        url: "/employee-list/me",
      }),
      providesTags: ["EmployeeList"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertEmployeeListMutation,
  useGetAllEmployeeListQuery,
  useDeleteEmployeeListMutation,
  useUpdateEmployeeListMutation,
  useApproveEmployeeListMutation,
  useGetAllEmployeeListWithoutQueryQuery,
  useGetSingleEmployeeListMutation,
  useGetMyEmployeeProfileQuery,
} = employeeListApi;
