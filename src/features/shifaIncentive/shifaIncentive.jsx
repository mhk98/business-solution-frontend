import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const shifaIncentiveApi = createApi({
  reducerPath: "shifaIncentiveApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["ShifaIncentive"],
  endpoints: (build) => ({
    createShifaIncentive: build.mutation({
      query: (data) => ({
        url: "/shifa-incentives/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ShifaIncentive"],
    }),
    updateShifaIncentive: build.mutation({
      query: ({ id, data }) => ({
        url: `/shifa-incentives/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ShifaIncentive"],
    }),
    deleteShifaIncentive: build.mutation({
      query: (id) => ({
        url: `/shifa-incentives/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ShifaIncentive"],
    }),
    getShifaIncentives: build.query({
      query: (params = {}) => ({
        url: "/shifa-incentives",
        params,
      }),
      providesTags: ["ShifaIncentive"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateShifaIncentiveMutation,
  useUpdateShifaIncentiveMutation,
  useDeleteShifaIncentiveMutation,
  useGetShifaIncentivesQuery,
} = shifaIncentiveApi;
