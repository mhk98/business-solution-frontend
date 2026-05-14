import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const leaveRequestApi = createApi({
  reducerPath: "leaveRequestApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["LeaveRequest"],
  endpoints: (build) => ({
    createLeaveRequest: build.mutation({
      query: (data) => ({
        url: "/leave-request/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["LeaveRequest"],
    }),
    updateLeaveRequest: build.mutation({
      query: ({ id, data }) => ({
        url: `/leave-request/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["LeaveRequest"],
    }),
    deleteLeaveRequest: build.mutation({
      query: (id) => ({ url: `/leave-request/${id}`, method: "DELETE" }),
      invalidatesTags: ["LeaveRequest"],
    }),
    getAllLeaveRequests: build.query({
      query: (params) => ({ url: "/leave-request", params }),
      providesTags: ["LeaveRequest"],
      refetchOnMountOrArgChange: true,
    }),
    getMyLeaveRequests: build.query({
      query: () => ({ url: "/leave-request/me" }),
      providesTags: ["LeaveRequest"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateLeaveRequestMutation,
  useUpdateLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
  useGetAllLeaveRequestsQuery,
  useGetMyLeaveRequestsQuery,
} = leaveRequestApi;
