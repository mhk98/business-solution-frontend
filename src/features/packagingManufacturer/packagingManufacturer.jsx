import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const packagingManufacturerApi = createApi({
  reducerPath: "packagingManufacturerApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["packagingManufacturer"],
  endpoints: (build) => ({
    insertPackagingManufacturer: build.mutation({
      query: (data) => ({ url: "/packaging-manufacturer/create", method: "POST", body: data }),
      invalidatesTags: ["packagingManufacturer"],
    }),
    updatePackagingManufacturer: build.mutation({
      query: ({ id, data }) => ({ url: `/packaging-manufacturer/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["packagingManufacturer"],
    }),
    deletePackagingManufacturer: build.mutation({
      query: (id) => ({ url: `/packaging-manufacturer/${id}`, method: "DELETE" }),
      invalidatesTags: ["packagingManufacturer"],
    }),
    payPackagingManufacturer: build.mutation({
      query: ({ id, data }) => ({
        url: `/packaging-manufacturer/${id}/pay`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["packagingManufacturer"],
    }),
    getAllPackagingManufacturer: build.query({
      query: ({ page, limit, searchTerm }) => ({
        url: "/packaging-manufacturer",
        params: { page, limit, searchTerm },
      }),
      providesTags: ["packagingManufacturer"],
      refetchOnMountOrArgChange: true,
    }),
    getAllPackagingManufacturerWithoutQuery: build.query({
      query: () => ({ url: "/packaging-manufacturer/all" }),
      providesTags: ["packagingManufacturer"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertPackagingManufacturerMutation,
  useUpdatePackagingManufacturerMutation,
  useDeletePackagingManufacturerMutation,
  usePayPackagingManufacturerMutation,
  useGetAllPackagingManufacturerQuery,
  useGetAllPackagingManufacturerWithoutQueryQuery,
} = packagingManufacturerApi;
