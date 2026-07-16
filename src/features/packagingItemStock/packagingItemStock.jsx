import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const packagingItemStockApi = createApi({
  reducerPath: "packagingItemStockApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["packagingItemStock"],
  endpoints: (build) => ({
    getAllPackagingItemStock: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "/packaging-item-stock",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: ["packagingItemStock"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
    getAllPackagingItemStockWithoutQuery: build.query({
      query: () => ({
        url: "/packaging-item-stock/all",
      }),
      providesTags: ["packagingItemStock"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useGetAllPackagingItemStockQuery,
  useGetAllPackagingItemStockWithoutQueryQuery,
} = packagingItemStockApi;
