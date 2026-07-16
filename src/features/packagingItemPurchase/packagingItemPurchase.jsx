import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const packagingItemPurchaseApi = createApi({
  reducerPath: "packagingItemPurchaseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["packagingItemPurchase", "packagingItemStock"],
  endpoints: (build) => ({
    insertPackagingItemPurchase: build.mutation({
      query: (data) => ({
        url: "/packaging-item-purchase/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["packagingItemPurchase", "packagingItemStock"],
    }),
    deletePackagingItemPurchase: build.mutation({
      query: (id) => ({
        url: `/packaging-item-purchase/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["packagingItemPurchase", "packagingItemStock"],
    }),
    updatePackagingItemPurchase: build.mutation({
      query: ({ id, data }) => ({
        url: `/packaging-item-purchase/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["packagingItemPurchase", "packagingItemStock"],
    }),
    getAllPackagingItemPurchase: build.query({
      query: ({ page, limit, startDate, endDate, name, supplierId }) => ({
        url: "/packaging-item-purchase",
        params: { page, limit, startDate, endDate, name, supplierId },
      }),
      providesTags: ["packagingItemPurchase"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertPackagingItemPurchaseMutation,
  useGetAllPackagingItemPurchaseQuery,
  useDeletePackagingItemPurchaseMutation,
  useUpdatePackagingItemPurchaseMutation,
} = packagingItemPurchaseApi;
