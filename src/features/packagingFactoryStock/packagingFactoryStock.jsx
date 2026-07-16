import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const packagingFactoryStockApi = createApi({
  reducerPath: "packagingFactoryStockApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["packagingFactoryStock"],
  endpoints: (build) => ({
    getAllPackagingFactoryStock: build.query({
      query: ({ page, limit, startDate, endDate, name, manufacturerId }) => ({
        url: "/packaging-factory-stock",
        params: { page, limit, startDate, endDate, name, manufacturerId },
      }),
      providesTags: ["packagingFactoryStock"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const { useGetAllPackagingFactoryStockQuery } = packagingFactoryStockApi;
