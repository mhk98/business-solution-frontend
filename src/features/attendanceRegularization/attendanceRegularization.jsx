import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const attendanceRegularizationApi = createApi({
  reducerPath: "attendanceRegularizationApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["AttendanceRegularization"],
  endpoints: (build) => ({
    createAttendanceRegularization: build.mutation({
      query: (data) => ({
        url: "/attendance-regularization/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AttendanceRegularization"],
    }),
    updateAttendanceRegularization: build.mutation({
      query: ({ id, data }) => ({
        url: `/attendance-regularization/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AttendanceRegularization"],
    }),
    deleteAttendanceRegularization: build.mutation({
      query: (id) => ({
        url: `/attendance-regularization/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AttendanceRegularization"],
    }),
    getAllAttendanceRegularizations: build.query({
      query: (params) => ({
        url: "/attendance-regularization",
        params,
      }),
      providesTags: ["AttendanceRegularization"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateAttendanceRegularizationMutation,
  useUpdateAttendanceRegularizationMutation,
  useDeleteAttendanceRegularizationMutation,
  useGetAllAttendanceRegularizationsQuery,
} = attendanceRegularizationApi;
