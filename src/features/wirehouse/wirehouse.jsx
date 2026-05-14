import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token (adjust the logic if needed)
const getAuthToken = () => {
  return localStorage.getItem("token"); // Retrieve the token from localStorage or other storage
};

export const wirehouseApi = createApi({
  reducerPath: "wirehouseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,

    // Prepare headers to include Authorization token if present
    prepareHeaders: (headers) => {
      const token = getAuthToken(); // Get the token from localStorage
      if (token) {
        headers.set("Authorization", `Bearer ${token}`); // Attach the token to the headers
      }
      return headers;
    },
  }),

  tagTypes: ["warehouse"], // Define the tag type for cache management
  endpoints: (build) => ({
    // Insert a new wirehouse (POST request)
    insertWirehouse: build.mutation({
      query: (data) => ({
        url: "/warehouse/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["warehouse"], // Invalidate the warehouse cache after insertion
    }),

    // Delete a wirehouse (DELETE request)
    deleteWirehouse: build.mutation({
      query: (id) => ({
        url: `/warehouse/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["warehouse"], // Invalidate the warehouse cache after deletion
    }),

    // Update wirehouse details (PATCH request)
    updateWirehouse: build.mutation({
      query: ({ id, data }) => ({
        url: `/warehouse/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["warehouse"], // Invalidate the warehouse cache after update
    }),

    // Get a single wirehouse (GET request)
    getSingleWirehouse: build.query({
      query: (id) => ({
        url: `/warehouse/${id}`,
      }),
      providesTags: ["warehouse"], // Provides the 'warehouse' tag for caching and invalidation
    }),

    getAllWirehouse: build.query({
      query: ({ page, limit, searchTerm }) => ({
        url: "/warehouse",
        params: { page, limit, searchTerm }, // Pass the page and limit as query params
      }),
      providesTags: ["warehouse"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllWirehouseWithoutQuery: build.query({
      query: () => ({
        url: "/warehouse/all",
      }),
      providesTags: ["warehouse"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertWirehouseMutation,
  useGetAllWirehouseQuery,
  useGetSingleWirehouseQuery,
  useDeleteWirehouseMutation,
  useUpdateWirehouseMutation,
  useGetAllWirehouseWithoutQueryQuery,
} = wirehouseApi;
