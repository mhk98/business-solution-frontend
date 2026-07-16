import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const packagingFactoryApi = createApi({
  reducerPath: "packagingFactoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["packagingFactory", "packagingFactoryStock", "packagingItemStock"],
  endpoints: (build) => ({
    insertPackagingFactory: build.mutation({
      query: (data) => ({ url: "/packaging-factory/create", method: "POST", body: data }),
      invalidatesTags: ["packagingFactory", "packagingFactoryStock", "packagingItemStock"],
    }),
    updatePackagingFactory: build.mutation({
      query: ({ id, data }) => ({ url: `/packaging-factory/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["packagingFactory", "packagingFactoryStock", "packagingItemStock"],
    }),
    deletePackagingFactory: build.mutation({
      query: (id) => ({ url: `/packaging-factory/${id}`, method: "DELETE" }),
      invalidatesTags: ["packagingFactory", "packagingFactoryStock", "packagingItemStock"],
    }),
    getAllPackagingFactory: build.query({
      query: ({ page, limit, startDate, endDate, name, manufacturerId }) => ({
        url: "/packaging-factory",
        params: { page, limit, startDate, endDate, name, manufacturerId },
      }),
      providesTags: ["packagingFactory"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertPackagingFactoryMutation,
  useUpdatePackagingFactoryMutation,
  useDeletePackagingFactoryMutation,
  useGetAllPackagingFactoryQuery,
} = packagingFactoryApi;
