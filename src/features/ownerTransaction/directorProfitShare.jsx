import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const directorProfitShareApi = createApi({
  reducerPath: "directorProfitShareApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Director", "DirectorProfitShare"],
  endpoints: (build) => ({
    insertDirector: build.mutation({
      query: (data) => ({
        url: "/director/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Director"],
    }),
    updateDirector: build.mutation({
      query: ({ id, data }) => ({
        url: `/director/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Director"],
    }),
    deleteDirector: build.mutation({
      query: (id) => ({
        url: `/director/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Director"],
    }),
    getAllDirector: build.query({
      query: ({ page, limit, searchTerm, status } = {}) => ({
        url: "/director",
        params: { page, limit, searchTerm, status },
      }),
      providesTags: ["Director"],
      refetchOnMountOrArgChange: true,
    }),
    getAllDirectorWithoutQuery: build.query({
      query: () => ({ url: "/director/all" }),
      providesTags: ["Director"],
      refetchOnMountOrArgChange: true,
    }),
    getSingleDirector: build.query({
      query: (id) => ({ url: `/director/${id}` }),
      providesTags: ["Director"],
      refetchOnMountOrArgChange: true,
    }),
    insertDirectorProfitShare: build.mutation({
      query: (data) => ({
        url: "/director-profit-share/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DirectorProfitShare", "Director"],
    }),
    updateDirectorProfitShare: build.mutation({
      query: ({ id, data }) => ({
        url: `/director-profit-share/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["DirectorProfitShare", "Director"],
    }),
    deleteDirectorProfitShare: build.mutation({
      query: (id) => ({
        url: `/director-profit-share/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DirectorProfitShare", "Director"],
    }),
    getAllDirectorProfitShare: build.query({
      query: ({
        page,
        limit,
        searchTerm,
        startDate,
        endDate,
        directorId,
        bookId,
        type,
        status,
      } = {}) => ({
        url: "/director-profit-share",
        params: {
          page,
          limit,
          searchTerm,
          startDate,
          endDate,
          directorId,
          bookId,
          type,
          status,
        },
      }),
      providesTags: ["DirectorProfitShare"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDirectorMutation,
  useUpdateDirectorMutation,
  useDeleteDirectorMutation,
  useGetAllDirectorQuery,
  useGetAllDirectorWithoutQueryQuery,
  useGetSingleDirectorQuery,
  useInsertDirectorProfitShareMutation,
  useUpdateDirectorProfitShareMutation,
  useDeleteDirectorProfitShareMutation,
  useGetAllDirectorProfitShareQuery,
} = directorProfitShareApi;
