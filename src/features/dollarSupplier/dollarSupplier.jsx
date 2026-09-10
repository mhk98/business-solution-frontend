import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const dollarSupplierApi = createApi({
  reducerPath: "dollarSupplierApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["dollarSupplier"],
  endpoints: (build) => ({
    insertDollarSupplier: build.mutation({
      query: (data) => ({
        url: "/dollar-supplier/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["dollarSupplier"],
    }),
    deleteDollarSupplier: build.mutation({
      query: (id) => ({
        url: `/dollar-supplier/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["dollarSupplier"],
    }),
    updateDollarSupplier: build.mutation({
      query: ({ id, data }) => ({
        url: `/dollar-supplier/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["dollarSupplier"],
    }),
    getSingleDollarSupplier: build.query({
      query: (id) => ({ url: `/dollar-supplier/${id}` }),
      providesTags: ["dollarSupplier"],
    }),
    getAllDollarSupplier: build.query({
      query: ({ page, limit, searchTerm, startDate, endDate } = {}) => ({
        url: "/dollar-supplier",
        params: { page, limit, searchTerm, startDate, endDate },
      }),
      providesTags: ["dollarSupplier"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
    getAllDollarSupplierWithoutQuery: build.query({
      query: ({ startDate, endDate } = {}) => ({
        url: "/dollar-supplier/all",
        params: { startDate, endDate },
      }),
      providesTags: ["dollarSupplier"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertDollarSupplierMutation,
  useGetAllDollarSupplierQuery,
  useGetSingleDollarSupplierQuery,
  useDeleteDollarSupplierMutation,
  useUpdateDollarSupplierMutation,
  useGetAllDollarSupplierWithoutQueryQuery,
} = dollarSupplierApi;
