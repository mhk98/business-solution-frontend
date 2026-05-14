import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const attendanceDeviceApi = createApi({
  reducerPath: "attendanceDeviceApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["AttendanceDevice"],
  endpoints: (build) => ({
    createAttendanceDevice: build.mutation({
      query: (data) => ({
        url: "/attendance-device/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AttendanceDevice"],
    }),
    updateAttendanceDevice: build.mutation({
      query: ({ id, data }) => ({
        url: `/attendance-device/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AttendanceDevice"],
    }),
    deleteAttendanceDevice: build.mutation({
      query: ({ id, note }) => ({
        url: `/attendance-device/${id}`,
        method: "DELETE",
        body: note ? { note } : undefined,
      }),
      invalidatesTags: ["AttendanceDevice"],
    }),
    approveAttendanceDevice: build.mutation({
      query: (id) => ({
        url: `/attendance-device/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["AttendanceDevice"],
    }),
    getAllAttendanceDevices: build.query({
      query: (params) => ({
        url: "/attendance-device",
        params,
      }),
      providesTags: ["AttendanceDevice"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateAttendanceDeviceMutation,
  useUpdateAttendanceDeviceMutation,
  useDeleteAttendanceDeviceMutation,
  useApproveAttendanceDeviceMutation,
  useGetAllAttendanceDevicesQuery,
} = attendanceDeviceApi;
