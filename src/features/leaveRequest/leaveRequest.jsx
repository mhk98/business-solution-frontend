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
    // Requests the logged-in user must approve (as team leader).
    getMyLeaveApprovals: build.query({
      query: () => ({ url: "/leave-request/approvals" }),
      providesTags: ["LeaveRequest"],
    }),
    decideLeaveRequest: build.mutation({
      // id + timestamp in the body keep the backend duplicate-POST guard
      // from treating two different decisions as the same request.
      query: ({ id, decision, note }) => ({
        url: `/leave-request/${id}/decide`,
        method: "POST",
        body: { decision, note, leaveRequestId: id, requestedAt: Date.now() },
      }),
      invalidatesTags: ["LeaveRequest"],
    }),
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
  useGetMyLeaveApprovalsQuery,
  useDecideLeaveRequestMutation,
  useCreateLeaveRequestMutation,
  useUpdateLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
  useGetAllLeaveRequestsQuery,
  useGetMyLeaveRequestsQuery,
} = leaveRequestApi;
