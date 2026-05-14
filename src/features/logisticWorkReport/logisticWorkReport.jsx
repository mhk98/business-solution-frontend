import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const logisticWorkReportApi = createApi({
  reducerPath: "logisticWorkReportApi",
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
  tagTypes: ["LogisticWorkReport"],
  endpoints: (build) => ({
    createLogisticWorkReport: build.mutation({
      query: (data) => ({
        url: "/logistic-work-reports/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["LogisticWorkReport"],
    }),
    updateLogisticWorkReport: build.mutation({
      query: ({ id, data }) => ({
        url: `/logistic-work-reports/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["LogisticWorkReport"],
    }),
    deleteLogisticWorkReport: build.mutation({
      query: (id) => ({
        url: `/logistic-work-reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LogisticWorkReport"],
    }),
    getMyLogisticWorkReports: build.query({
      query: (params = {}) => ({
        url: "/logistic-work-reports/me",
        params,
      }),
      providesTags: ["LogisticWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getAllLogisticWorkReports: build.query({
      query: (params = {}) => ({
        url: "/logistic-work-reports",
        params,
      }),
      providesTags: ["LogisticWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateLogisticWorkReportMutation,
  useUpdateLogisticWorkReportMutation,
  useDeleteLogisticWorkReportMutation,
  useGetMyLogisticWorkReportsQuery,
  useGetAllLogisticWorkReportsQuery,
} = logisticWorkReportApi;
