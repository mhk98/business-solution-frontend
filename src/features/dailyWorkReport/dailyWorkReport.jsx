import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const dailyWorkReportApi = createApi({
  reducerPath: "dailyWorkReportApi",
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
  tagTypes: ["DailyWorkReport"],
  endpoints: (build) => ({
    createDailyWorkReport: build.mutation({
      query: (data) => ({
        url: "/daily-work-reports/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DailyWorkReport"],
    }),
    updateDailyWorkReport: build.mutation({
      query: ({ id, data }) => ({
        url: `/daily-work-reports/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["DailyWorkReport"],
    }),
    reviewDailyWorkReport: build.mutation({
      query: ({ id, data }) => ({
        url: `/daily-work-reports/${id}/review`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["DailyWorkReport"],
    }),
    deleteDailyWorkReport: build.mutation({
      query: (id) => ({
        url: `/daily-work-reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DailyWorkReport"],
    }),
    calculateDailyWorkReportScore: build.mutation({
      query: (id) => ({
        url: `/daily-work-reports/${id}/calculate-score`,
        method: "POST",
      }),
      invalidatesTags: ["DailyWorkReport"],
    }),
    sendDailyWorkReportReminders: build.mutation({
      query: (data) => ({
        url: "/daily-work-reports/send-reminders",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DailyWorkReport"],
    }),
    uploadDailyWorkReportProof: build.mutation({
      query: (data) => ({
        url: "/daily-work-reports/upload-proof",
        method: "POST",
        body: data,
      }),
    }),
    getMyDailyWorkReports: build.query({
      query: (params = {}) => ({
        url: "/daily-work-reports/me",
        params,
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getAssignedDailyWorkTasks: build.query({
      query: (params = {}) => ({
        url: "/daily-work-reports/assigned-tasks",
        params,
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getAllDailyWorkReports: build.query({
      query: (params = {}) => ({
        url: "/daily-work-reports",
        params,
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getSingleDailyWorkReport: build.query({
      query: (id) => ({
        url: `/daily-work-reports/${id}`,
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getDailyWorkReportLeaderboard: build.query({
      query: (params = {}) => ({
        url: "/daily-work-reports/leaderboard",
        params,
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getDailyWorkEmployeeDashboard: build.query({
      query: () => ({
        url: "/daily-work-reports/dashboard/employee",
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getDailyWorkAdminDashboard: build.query({
      query: (params = {}) => ({
        url: "/daily-work-reports/dashboard/admin",
        params,
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
    getDailyWorkEligibleSubmitters: build.query({
      query: () => ({
        url: "/daily-work-reports/eligible-submitters",
      }),
      providesTags: ["DailyWorkReport"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateDailyWorkReportMutation,
  useUpdateDailyWorkReportMutation,
  useReviewDailyWorkReportMutation,
  useDeleteDailyWorkReportMutation,
  useCalculateDailyWorkReportScoreMutation,
  useSendDailyWorkReportRemindersMutation,
  useUploadDailyWorkReportProofMutation,
  useGetMyDailyWorkReportsQuery,
  useGetAssignedDailyWorkTasksQuery,
  useGetAllDailyWorkReportsQuery,
  useGetSingleDailyWorkReportQuery,
  useGetDailyWorkReportLeaderboardQuery,
  useGetDailyWorkEmployeeDashboardQuery,
  useGetDailyWorkAdminDashboardQuery,
  useGetDailyWorkEligibleSubmittersQuery,
} = dailyWorkReportApi;
