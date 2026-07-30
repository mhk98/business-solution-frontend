import { baseApi } from "../baseApi/api";

export const stellarAttendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStellarAttendanceLogs: build.query({
      query: (params = {}) => ({
        url: "/stellar-attendance/logs",
        method: "GET",
        params,
      }),
      providesTags: ["Attendance"],
    }),
    getStellarAttendanceUsers: build.query({
      query: () => ({
        url: "/stellar-attendance/users",
        method: "GET",
      }),
      providesTags: ["Attendance"],
    }),
    getStellarAttendanceEmployees: build.query({
      query: (params = {}) => ({
        url: "/employee-list",
        method: "GET",
        params,
      }),
    }),
    getStellarAttendanceHolidays: build.query({
      query: (params = {}) => ({
        url: "/holiday",
        method: "GET",
        params,
      }),
    }),
    getStellarAttendanceLeaves: build.query({
      query: (params = {}) => ({
        url: "/leave-request",
        method: "GET",
        params,
      }),
    }),
  }),
});

export const {
  useGetStellarAttendanceLogsQuery,
  useGetStellarAttendanceUsersQuery,
  useGetStellarAttendanceEmployeesQuery,
  useGetStellarAttendanceHolidaysQuery,
  useGetStellarAttendanceLeavesQuery,
} = stellarAttendanceApi;
