import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const attendanceSummaryApi = createApi({
  reducerPath: "attendanceSummaryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["AttendanceSummary"],
  endpoints: (build) => ({
    getAllAttendanceSummaries: build.query({
      query: (params) => ({
        url: "/attendance-summary",
        params,
      }),
      providesTags: ["AttendanceSummary"],
      refetchOnMountOrArgChange: true,
    }),
    getMyAttendanceSummaries: build.query({
      query: () => ({
        url: "/attendance-summary/me",
      }),
      providesTags: ["AttendanceSummary"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useGetAllAttendanceSummariesQuery,
  useGetMyAttendanceSummariesQuery,
} = attendanceSummaryApi;
