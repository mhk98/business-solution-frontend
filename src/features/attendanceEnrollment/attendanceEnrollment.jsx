import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const attendanceEnrollmentApi = createApi({
  reducerPath: "attendanceEnrollmentApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["AttendanceEnrollment"],
  endpoints: (build) => ({
    createAttendanceEnrollment: build.mutation({
      query: (data) => ({
        url: "/attendance-enrollment/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AttendanceEnrollment"],
    }),
    updateAttendanceEnrollment: build.mutation({
      query: ({ id, data }) => ({
        url: `/attendance-enrollment/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AttendanceEnrollment"],
    }),
    deleteAttendanceEnrollment: build.mutation({
      query: (id) => ({
        url: `/attendance-enrollment/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AttendanceEnrollment"],
    }),
    getAllAttendanceEnrollments: build.query({
      query: (params) => ({
        url: "/attendance-enrollment",
        params,
      }),
      providesTags: ["AttendanceEnrollment"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateAttendanceEnrollmentMutation,
  useUpdateAttendanceEnrollmentMutation,
  useDeleteAttendanceEnrollmentMutation,
  useGetAllAttendanceEnrollmentsQuery,
} = attendanceEnrollmentApi;
