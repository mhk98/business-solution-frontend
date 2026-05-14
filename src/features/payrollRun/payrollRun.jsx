import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const payrollRunApi = createApi({
  reducerPath: "payrollRunApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["PayrollRun", "PayrollItem"],
  endpoints: (build) => ({
    createPayrollRun: build.mutation({
      query: (data) => ({
        url: "/payroll-run/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["PayrollRun", "PayrollItem"],
    }),
    updatePayrollRun: build.mutation({
      query: ({ id, data }) => ({
        url: `/payroll-run/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["PayrollRun", "PayrollItem"],
    }),
    getAllPayrollRuns: build.query({
      query: (params) => ({ url: "/payroll-run", params }),
      providesTags: ["PayrollRun"],
      refetchOnMountOrArgChange: true,
    }),
    getPayrollRunById: build.query({
      query: (id) => ({ url: `/payroll-run/${id}` }),
      providesTags: ["PayrollRun", "PayrollItem"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreatePayrollRunMutation,
  useUpdatePayrollRunMutation,
  useGetAllPayrollRunsQuery,
  useGetPayrollRunByIdQuery,
} = payrollRunApi;
