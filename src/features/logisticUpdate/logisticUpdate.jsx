import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const logisticUpdateApi = createApi({
  reducerPath: "logisticUpdateApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["LogisticUpdate"],
  endpoints: (build) => ({
    getLogisticUpdates: build.query({
      query: (params) => ({ url: "/logistic-updates", params }),
      providesTags: ["LogisticUpdate"],
    }),
    getLogisticUpdateDepartments: build.query({
      query: () => "/logistic-updates/departments",
    }),
    createLogisticUpdate: build.mutation({
      query: (body) => ({ url: "/logistic-updates/create", method: "POST", body }),
      invalidatesTags: ["LogisticUpdate"],
    }),
    updateLogisticUpdate: build.mutation({
      query: ({ id, data }) => ({ url: `/logistic-updates/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["LogisticUpdate"],
    }),
  }),
});

export const {
  useGetLogisticUpdatesQuery,
  useGetLogisticUpdateDepartmentsQuery,
  useCreateLogisticUpdateMutation,
  useUpdateLogisticUpdateMutation,
} = logisticUpdateApi;
