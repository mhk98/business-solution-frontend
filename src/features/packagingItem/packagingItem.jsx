import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const packagingItemApi = createApi({
  reducerPath: "packagingItemApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["packagingItem"],
  endpoints: (build) => ({
    insertPackagingItem: build.mutation({
      query: (data) => ({
        url: "/packaging-item/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["packagingItem"],
    }),
    deletePackagingItem: build.mutation({
      query: (id) => ({
        url: `/packaging-item/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["packagingItem"],
    }),
    updatePackagingItem: build.mutation({
      query: ({ id, data }) => ({
        url: `/packaging-item/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["packagingItem"],
    }),
    getAllPackagingItem: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "/packaging-item",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: ["packagingItem"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
    getAllPackagingItemWithoutQuery: build.query({
      query: () => ({
        url: "/packaging-item/all",
      }),
      providesTags: ["packagingItem"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertPackagingItemMutation,
  useGetAllPackagingItemQuery,
  useDeletePackagingItemMutation,
  useUpdatePackagingItemMutation,
  useGetAllPackagingItemWithoutQueryQuery,
} = packagingItemApi;
