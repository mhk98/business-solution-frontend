import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const bankAccountApi = createApi({
  reducerPath: "bankAccountApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["bankAccount"],
  endpoints: (build) => ({
    insertBankAccount: build.mutation({
      query: (data) => ({
        url: "/bank-account/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["bankAccount"],
    }),
    deleteBankAccount: build.mutation({
      query: (id) => ({
        url: `/bank-account/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["bankAccount"],
    }),
    updateBankAccount: build.mutation({
      query: ({ id, data }) => ({
        url: `/bank-account/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["bankAccount"],
    }),
    getAllBankAccount: build.query({
      query: ({ page = 1, limit = 200 } = {}) => ({
        url: "/bank-account",
        params: { page, limit },
      }),
      providesTags: ["bankAccount"],
      refetchOnMountOrArgChange: true,
    }),
    getAllBankAccountWithoutQuery: build.query({
      query: () => ({
        url: "/bank-account/all",
      }),
      providesTags: ["bankAccount"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useGetAllBankAccountQuery,
  useGetAllBankAccountWithoutQueryQuery,
  useDeleteBankAccountMutation,
  useUpdateBankAccountMutation,
  useInsertBankAccountMutation,
} = bankAccountApi;
