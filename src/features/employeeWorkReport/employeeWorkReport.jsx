import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const employeeWorkReportApi = createApi({
  reducerPath: "employeeWorkReportApi",
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
  tagTypes: ["EmployeeWorkReport"],
  endpoints: (build) => ({
    createEmployeeWorkReport: build.mutation({
      query: (data) => ({
        url: "/employee-work-reports/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["EmployeeWorkReport"],
    }),
    updateEmployeeWorkReport: build.mutation({
      query: ({ id, data }) => ({
        url: `/employee-work-reports/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["EmployeeWorkReport"],
    }),
    deleteEmployeeWorkReport: build.mutation({
      query: (id) => ({
        url: `/employee-work-reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EmployeeWorkReport"],
    }),
    getMyEmployeeWorkReports: build.query({
      query: (params = {}) => ({
        url: "/employee-work-reports/me",
        params,
      }),
      providesTags: ["EmployeeWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getAllEmployeeWorkReports: build.query({
      query: (params = {}) => ({
        url: "/employee-work-reports",
        params,
      }),
      providesTags: ["EmployeeWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getSingleEmployeeWorkReport: build.query({
      query: (id) => ({
        url: `/employee-work-reports/${id}`,
      }),
      providesTags: ["EmployeeWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateEmployeeWorkReportMutation,
  useUpdateEmployeeWorkReportMutation,
  useDeleteEmployeeWorkReportMutation,
  useGetMyEmployeeWorkReportsQuery,
  useGetAllEmployeeWorkReportsQuery,
  useGetSingleEmployeeWorkReportQuery,
} = employeeWorkReportApi;
