import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const packagingMixerApi = createApi({
  reducerPath: "packagingMixerApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["packagingMixer", "packagingFactoryStock", "ItemMaster", "packagingManufacturer"],
  endpoints: (build) => ({
    insertPackagingMixer: build.mutation({
      query: (data) => ({ url: "/packaging-mixer/create", method: "POST", body: data }),
      invalidatesTags: ["packagingMixer", "packagingFactoryStock", "ItemMaster", "packagingManufacturer"],
    }),
    updatePackagingMixer: build.mutation({
      query: ({ id, data }) => ({ url: `/packaging-mixer/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["packagingMixer", "packagingFactoryStock", "ItemMaster", "packagingManufacturer"],
    }),
    deletePackagingMixer: build.mutation({
      query: (id) => ({ url: `/packaging-mixer/${id}`, method: "DELETE" }),
      invalidatesTags: ["packagingMixer", "packagingFactoryStock", "ItemMaster", "packagingManufacturer"],
    }),
    getAllPackagingMixer: build.query({
      query: ({ page, limit, startDate, endDate, name, manufacturerId }) => ({
        url: "/packaging-mixer",
        params: { page, limit, startDate, endDate, name, manufacturerId },
      }),
      providesTags: ["packagingMixer"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertPackagingMixerMutation,
  useUpdatePackagingMixerMutation,
  useDeletePackagingMixerMutation,
  useGetAllPackagingMixerQuery,
} = packagingMixerApi;
