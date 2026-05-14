import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const shiftApi = createApi({
  reducerPath: "shiftApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Shift"],
  endpoints: (build) => ({
    createShift: build.mutation({
      query: (data) => ({
        url: "/shift/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Shift"],
    }),
    updateShift: build.mutation({
      query: ({ id, data }) => ({
        url: `/shift/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Shift"],
    }),
    deleteShift: build.mutation({
      query: ({ id, note }) => ({
        url: `/shift/${id}`,
        method: "DELETE",
        body: note ? { note } : undefined,
      }),
      invalidatesTags: ["Shift"],
    }),
    approveShift: build.mutation({
      query: (id) => ({
        url: `/shift/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["Shift"],
    }),
    getAllShifts: build.query({
      query: (params) => ({
        url: "/shift",
        params,
      }),
      providesTags: ["Shift"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  useApproveShiftMutation,
  useGetAllShiftsQuery,
} = shiftApi;
