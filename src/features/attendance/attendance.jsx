import { baseApi } from "../baseApi/api";

// POSTs that may legitimately repeat with the same body (recompute, re-lock
// a day…) carry a timestamp so the backend's 5-minute duplicate guard
// doesn't reject them.
const withNonce = (body = {}) => ({ ...body, requestedAt: Date.now() });

const DAY_TAGS = ["AttendanceDay", "Attendance"];

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAttendanceDaily: build.query({
      query: (params = {}) => ({ url: "/attendance/daily", params }),
      providesTags: DAY_TAGS,
    }),
    getAttendanceMonthly: build.query({
      query: (params = {}) => ({ url: "/attendance/monthly", params }),
      providesTags: DAY_TAGS,
    }),
    getAttendanceJobCard: build.query({
      query: (params = {}) => ({ url: "/attendance/job-card", params }),
      providesTags: DAY_TAGS,
    }),
    getAttendancePunches: build.query({
      query: (params = {}) => ({ url: "/attendance/punches", params }),
      providesTags: DAY_TAGS,
    }),
    getAttendanceDashboard: build.query({
      query: (params = {}) => ({ url: "/attendance/dashboard", params }),
      providesTags: DAY_TAGS,
    }),
    // Users who can be picked as an attendance person (Id = device PIN).
    // scope: "all" also returns exempt users (approvers, requesters).
    getAttendancePeople: build.query({
      query: (params = {}) => ({ url: "/attendance/people", params }),
      providesTags: ["AttendanceSetup"],
    }),
    getLeaveBalance: build.query({
      query: (params = {}) => ({ url: "/attendance/leave-balance", params }),
      providesTags: DAY_TAGS,
    }),

    recomputeAttendance: build.mutation({
      query: (body) => ({ url: "/attendance/recompute", method: "POST", body: withNonce(body) }),
      invalidatesTags: DAY_TAGS,
    }),
    addManualPunch: build.mutation({
      query: (body) => ({ url: "/attendance/manual-punch", method: "POST", body: withNonce(body) }),
      invalidatesTags: DAY_TAGS,
    }),
    deleteManualPunch: build.mutation({
      query: (id) => ({ url: `/attendance/manual-punch/${id}`, method: "DELETE" }),
      invalidatesTags: DAY_TAGS,
    }),
    overrideAttendanceDay: build.mutation({
      query: (body) => ({ url: "/attendance/override", method: "POST", body: withNonce(body) }),
      invalidatesTags: DAY_TAGS,
    }),
    clearAttendanceOverride: build.mutation({
      query: (body) => ({ url: "/attendance/override/clear", method: "POST", body: withNonce(body) }),
      invalidatesTags: DAY_TAGS,
    }),

    getShiftAssignments: build.query({
      query: (params = {}) => ({ url: "/attendance/shift-assignments", params }),
      // HrmCrudManager reads { data, meta }; employeeIds lets its edit form
      // show the row's employee in the create-time multi-select.
      transformResponse: (res) => ({
        ...res,
        data: (res?.data || []).map((row) => ({ ...row, employeeIds: [row.userId] })),
        meta: { count: res?.data?.length || 0 },
      }),
      providesTags: ["ShiftAssignment"],
    }),
    createShiftAssignment: build.mutation({
      query: (body) => ({ url: "/attendance/shift-assignments", method: "POST", body: withNonce(body) }),
      invalidatesTags: ["ShiftAssignment", "AttendanceSetup", ...DAY_TAGS],
    }),
    updateShiftAssignment: build.mutation({
      query: ({ id, data }) => ({ url: `/attendance/shift-assignments/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["ShiftAssignment", "AttendanceSetup", ...DAY_TAGS],
    }),
    deleteShiftAssignment: build.mutation({
      query: (arg) => ({ url: `/attendance/shift-assignments/${arg?.id ?? arg}`, method: "DELETE" }),
      invalidatesTags: ["ShiftAssignment", "AttendanceSetup", ...DAY_TAGS],
    }),

    getAttendanceSetup: build.query({
      query: () => ({ url: "/attendance/setup" }),
      providesTags: ["AttendanceSetup"],
    }),
    updateEmployeeAttendanceSetup: build.mutation({
      query: ({ id, data }) => ({ url: `/attendance/setup/employee/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["AttendanceSetup", ...DAY_TAGS],
    }),

    getAttendancePolicy: build.query({
      query: () => ({ url: "/attendance/policy" }),
      providesTags: ["AttendancePolicy"],
    }),
    saveAttendancePolicy: build.mutation({
      query: (body) => ({ url: "/attendance/policy", method: "PUT", body }),
      invalidatesTags: ["AttendancePolicy", ...DAY_TAGS],
    }),
  }),
});

export const {
  useGetAttendanceDailyQuery,
  useGetAttendanceMonthlyQuery,
  useGetAttendanceJobCardQuery,
  useGetAttendancePunchesQuery,
  useGetAttendanceDashboardQuery,
  useGetLeaveBalanceQuery,
  useGetAttendancePeopleQuery,
  useRecomputeAttendanceMutation,
  useAddManualPunchMutation,
  useDeleteManualPunchMutation,
  useOverrideAttendanceDayMutation,
  useClearAttendanceOverrideMutation,
  useGetShiftAssignmentsQuery,
  useCreateShiftAssignmentMutation,
  useUpdateShiftAssignmentMutation,
  useDeleteShiftAssignmentMutation,
  useGetAttendanceSetupQuery,
  useUpdateEmployeeAttendanceSetupMutation,
  useGetAttendancePolicyQuery,
  useSaveAttendancePolicyMutation,
} = attendanceApi;
