import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const metaApi = createApi({
  reducerPath: "metaApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken(); // Fetch the token
      if (token) {
        // If the token exists, add it to the headers
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: ["meta"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertMeta: build.mutation({
      query: (data) => ({
        url: "/meta/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["meta"], // Invalidate the meta tag after this mutation
    }),

    deleteMeta: build.mutation({
      query: (id) => ({
        url: `/meta/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["meta"], // Invalidate the meta tag after deletion
    }),

    updateMeta: build.mutation({
      query: ({ id, data }) => ({
        url: `/meta/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["meta"], // Invalidate the meta tag after this mutation
    }),

    getAllMeta: build.query({
      query: ({ page, limit, startDate, endDate, platform, productId }) => ({
        url: "/meta",
        params: { page, limit, startDate, endDate, platform, productId }, // Pass the page and limit as query params
      }),
      providesTags: ["meta"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllMetaWithoutQuery: build.query({
      query: () => ({
        url: "/meta/all",
      }),
      providesTags: ["meta"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useGetAllMetaQuery,
  useGetAllMetaWithoutQueryQuery,
  useDeleteMetaMutation,
  useUpdateMetaMutation,
  useInsertMetaMutation,
} = metaApi;
