import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const payrollItemApi = createApi({
  reducerPath: "payrollItemApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["PayrollItem"],
  endpoints: (build) => ({
    getAllPayrollItems: build.query({
      query: (params) => ({ url: "/payroll-item", params }),
      providesTags: ["PayrollItem"],
      refetchOnMountOrArgChange: true,
    }),
    getPayrollItemById: build.query({
      query: (id) => ({ url: `/payroll-item/${id}` }),
      providesTags: ["PayrollItem"],
      refetchOnMountOrArgChange: true,
    }),
    getMyPayrollItems: build.query({
      query: () => ({ url: "/payroll-item/me" }),
      providesTags: ["PayrollItem"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useGetAllPayrollItemsQuery,
  useGetPayrollItemByIdQuery,
  useGetMyPayrollItemsQuery,
} = payrollItemApi;
