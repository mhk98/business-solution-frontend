import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const chargeSettingApi = createApi({
  reducerPath: "chargeSettingApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["chargeSetting"],
  endpoints: (build) => ({
    createChargeSetting: build.mutation({
      query: (data) => ({
        url: "/charge-settings/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["chargeSetting"],
    }),
    updateChargeSetting: build.mutation({
      query: ({ id, data }) => ({
        url: `/charge-settings/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["chargeSetting"],
    }),
    deleteChargeSetting: build.mutation({
      query: ({ id, chargeType }) => ({
        url: `/charge-settings/${id}`,
        method: "DELETE",
        params: { chargeType },
      }),
      invalidatesTags: ["chargeSetting"],
    }),
    getChargeSettings: build.query({
      query: ({ page = 1, limit = 10, chargeType, searchTerm } = {}) => ({
        url: "/charge-settings",
        params: { page, limit, chargeType, searchTerm },
      }),
      providesTags: ["chargeSetting"],
    }),
  }),
});

export const {
  useCreateChargeSettingMutation,
  useUpdateChargeSettingMutation,
  useDeleteChargeSettingMutation,
  useGetChargeSettingsQuery,
} = chargeSettingApi;
