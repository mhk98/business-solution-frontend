import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const shifaReportApi = createApi({
  reducerPath: "shifaReportApi",
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
  tagTypes: ["ShifaReport"],
  endpoints: (build) => ({
    createShifaReport: build.mutation({
      query: (data) => ({
        url: "/shifa-reports/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ShifaReport"],
    }),
    updateShifaReport: build.mutation({
      query: ({ id, data }) => ({
        url: `/shifa-reports/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ShifaReport"],
    }),
    deleteShifaReport: build.mutation({
      query: (id) => ({
        url: `/shifa-reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ShifaReport"],
    }),
    getMyShifaReports: build.query({
      query: (params = {}) => ({
        url: "/shifa-reports/me",
        params,
      }),
      providesTags: ["ShifaReport"],
      refetchOnMountOrArgChange: true,
    }),
    getAllShifaReports: build.query({
      query: (params = {}) => ({
        url: "/shifa-reports",
        params,
      }),
      providesTags: ["ShifaReport"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateShifaReportMutation,
  useUpdateShifaReportMutation,
  useDeleteShifaReportMutation,
  useGetMyShifaReportsQuery,
  useGetAllShifaReportsQuery,
} = shifaReportApi;
