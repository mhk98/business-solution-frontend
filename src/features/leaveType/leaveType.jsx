import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const leaveTypeApi = createApi({
  reducerPath: "leaveTypeApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["LeaveType"],
  endpoints: (build) => ({
    createLeaveType: build.mutation({
      query: (data) => ({
        url: "/leave-type/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["LeaveType"],
    }),
    updateLeaveType: build.mutation({
      query: ({ id, data }) => ({
        url: `/leave-type/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["LeaveType"],
    }),
    deleteLeaveType: build.mutation({
      query: (id) => ({ url: `/leave-type/${id}`, method: "DELETE" }),
      invalidatesTags: ["LeaveType"],
    }),
    getAllLeaveTypes: build.query({
      query: (params) => ({ url: "/leave-type", params }),
      providesTags: ["LeaveType"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetAllLeaveTypesQuery,
} = leaveTypeApi;
