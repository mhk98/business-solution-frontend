import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const loanApi = createApi({
  reducerPath: "loanApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["loan"],
  endpoints: (build) => ({
    insertLoan: build.mutation({
      query: (data) => ({
        url: "/loan/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["loan"],
    }),

    deleteLoan: build.mutation({
      query: (id) => ({
        url: `/loan/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["loan"],
    }),

    updateLoan: build.mutation({
      query: ({ id, data }) => ({
        url: `/loan/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["loan"],
    }),

    getSingleLoan: build.query({
      query: (id) => ({ url: `/loan/${id}` }),
      providesTags: ["loan"],
    }),

    getAllLoan: build.query({
      query: ({ page, limit, searchTerm, status, startDate, endDate } = {}) => ({
        url: "/loan",
        params: { page, limit, searchTerm, status, startDate, endDate },
      }),
      providesTags: ["loan"],
      refetchOnMountOrArgChange: true,
    }),

    getAllLoanWithoutQuery: build.query({
      query: () => ({ url: "/loan/all" }),
      providesTags: ["loan"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertLoanMutation,
  useGetAllLoanQuery,
  useGetSingleLoanQuery,
  useDeleteLoanMutation,
  useUpdateLoanMutation,
  useGetAllLoanWithoutQueryQuery,
} = loanApi;
