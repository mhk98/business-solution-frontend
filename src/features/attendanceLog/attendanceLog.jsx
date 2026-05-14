import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const attendanceLogApi = createApi({
  reducerPath: "attendanceLogApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["AttendanceLog", "AttendanceSummary"],
  endpoints: (build) => ({
    createAttendanceLog: build.mutation({
      query: (data) => ({
        url: "/attendance-log/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AttendanceLog"],
    }),
    receiveRealtimeAttendanceLog: build.mutation({
      query: (data) => ({
        url: "/attendance-log/realtime-ingest",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AttendanceLog", "AttendanceSummary"],
    }),
    updateAttendanceLog: build.mutation({
      query: ({ id, data }) => ({
        url: `/attendance-log/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AttendanceLog"],
    }),
    deleteAttendanceLog: build.mutation({
      query: (id) => ({
        url: `/attendance-log/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AttendanceLog"],
    }),
    getAllAttendanceLogs: build.query({
      query: (params) => ({
        url: "/attendance-log",
        params,
      }),
      providesTags: ["AttendanceLog"],
      refetchOnMountOrArgChange: true,
    }),
    getAttendanceRealtimeMonitor: build.query({
      query: (date) => ({
        url: "/attendance-log/monitor",
        params: { date },
      }),
      providesTags: ["AttendanceLog", "AttendanceSummary"],
      refetchOnMountOrArgChange: true,
    }),
    processDailyAttendance: build.mutation({
      query: (date) => ({
        url: "/attendance-log/process-daily",
        method: "POST",
        body: { date },
      }),
      invalidatesTags: ["AttendanceLog", "AttendanceSummary"],
    }),
  }),
});

export const {
  useCreateAttendanceLogMutation,
  useReceiveRealtimeAttendanceLogMutation,
  useUpdateAttendanceLogMutation,
  useDeleteAttendanceLogMutation,
  useGetAllAttendanceLogsQuery,
  useGetAttendanceRealtimeMonitorQuery,
  useProcessDailyAttendanceMutation,
} = attendanceLogApi;
