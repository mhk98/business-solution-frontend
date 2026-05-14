import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const noticeApi = createApi({
  reducerPath: "noticeApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["notice"],
  endpoints: (build) => ({
    createNotice: build.mutation({
      query: (data) => ({
        url: "/notice/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["notice"],
    }),
    updateNotice: build.mutation({
      query: ({ id, data }) => ({
        url: `/notice/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["notice"],
    }),
    deleteNotice: build.mutation({
      query: (id) => ({
        url: `/notice/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["notice"],
    }),
    getLatestNotice: build.query({
      query: () => "/notice/latest",
      providesTags: ["notice"],
    }),
    getNotices: build.query({
      query: ({ page = 1, limit = 10, status, searchTerm } = {}) => ({
        url: "/notice",
        params: { page, limit, status, searchTerm },
      }),
      providesTags: ["notice"],
    }),
  }),
});

export const {
  useCreateNoticeMutation,
  useUpdateNoticeMutation,
  useDeleteNoticeMutation,
  useGetLatestNoticeQuery,
  useGetNoticesQuery,
} = noticeApi;
