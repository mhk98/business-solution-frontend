import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const dollarSupplierHistoryApi = createApi({
  reducerPath: "dollarSupplierHistoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["DollarSupplierHistory"],
  endpoints: (build) => ({
    getAllDollarSupplierHistory: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, bookId, dollarSupplierId } =
          arg;
        const params = {
          page,
          limit,
          startDate,
          endDate,
          bookId,
          dollarSupplierId,
        };
        Object.keys(params).forEach((k) => {
          if (
            params[k] === undefined ||
            params[k] === null ||
            params[k] === ""
          )
            delete params[k];
        });
        return { url: "dollar-supplier-history", params };
      },
      providesTags: [{ type: "DollarSupplierHistory", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
    getAllDollarSupplierHistoryWithoutQuery: build.query({
      query: () => ({ url: "dollar-supplier-history/all" }),
      providesTags: [{ type: "DollarSupplierHistory", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
    insertDollarSupplierHistory: build.mutation({
      query: (data) => ({
        url: "dollar-supplier-history/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "DollarSupplierHistory", id: "LIST" }],
    }),
    updateDollarSupplierHistory: build.mutation({
      query: ({ id, data }) => ({
        url: `dollar-supplier-history/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [{ type: "DollarSupplierHistory", id: "LIST" }],
    }),
    deleteDollarSupplierHistory: build.mutation({
      query: (id) => ({
        url: `dollar-supplier-history/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "DollarSupplierHistory", id: "LIST" }],
    }),
  }),
});

export const {
  useGetAllDollarSupplierHistoryQuery,
  useGetAllDollarSupplierHistoryWithoutQueryQuery,
  useInsertDollarSupplierHistoryMutation,
  useUpdateDollarSupplierHistoryMutation,
  useDeleteDollarSupplierHistoryMutation,
} = dollarSupplierHistoryApi;
