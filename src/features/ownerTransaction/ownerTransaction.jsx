import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const ownerTransactionApi = createApi({
  reducerPath: "ownerTransactionApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Owner", "OwnerTransaction"],
  endpoints: (build) => ({
    insertOwner: build.mutation({
      query: (data) => ({
        url: "/owner/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Owner"],
    }),
    updateOwner: build.mutation({
      query: ({ id, data }) => ({
        url: `/owner/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Owner"],
    }),
    deleteOwner: build.mutation({
      query: (id) => ({
        url: `/owner/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Owner"],
    }),
    getAllOwner: build.query({
      query: ({ page, limit, searchTerm, status } = {}) => ({
        url: "/owner",
        params: { page, limit, searchTerm, status },
      }),
      providesTags: ["Owner"],
      refetchOnMountOrArgChange: true,
    }),
    getAllOwnerWithoutQuery: build.query({
      query: () => ({ url: "/owner/all" }),
      providesTags: ["Owner"],
      refetchOnMountOrArgChange: true,
    }),
    getSingleOwner: build.query({
      query: (id) => ({ url: `/owner/${id}` }),
      providesTags: ["Owner"],
      refetchOnMountOrArgChange: true,
    }),
    insertOwnerTransaction: build.mutation({
      query: (data) => ({
        url: "/owner-transaction/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["OwnerTransaction", "Owner"],
    }),
    updateOwnerTransaction: build.mutation({
      query: ({ id, data }) => ({
        url: `/owner-transaction/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["OwnerTransaction", "Owner"],
    }),
    deleteOwnerTransaction: build.mutation({
      query: (id) => ({
        url: `/owner-transaction/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["OwnerTransaction", "Owner"],
    }),
    getAllOwnerTransaction: build.query({
      query: ({
        page,
        limit,
        searchTerm,
        startDate,
        endDate,
        ownerId,
        bookId,
        type,
        status,
      } = {}) => ({
        url: "/owner-transaction",
        params: {
          page,
          limit,
          searchTerm,
          startDate,
          endDate,
          ownerId,
          bookId,
          type,
          status,
        },
      }),
      providesTags: ["OwnerTransaction"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertOwnerMutation,
  useUpdateOwnerMutation,
  useDeleteOwnerMutation,
  useGetAllOwnerQuery,
  useGetAllOwnerWithoutQueryQuery,
  useGetSingleOwnerQuery,
  useInsertOwnerTransactionMutation,
  useUpdateOwnerTransactionMutation,
  useDeleteOwnerTransactionMutation,
  useGetAllOwnerTransactionQuery,
} = ownerTransactionApi;
