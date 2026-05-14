import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token (adjust the logic if needed)
const getAuthToken = () => {
  return localStorage.getItem("token"); // Retrieve the token from localStorage or other storage
};

export const supplierApi = createApi({
  reducerPath: "supplierApi",
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

  tagTypes: ["supplier"], // Define the tag type for cache management
  endpoints: (build) => ({
    // Insert a new supplier (POST request)
    insertSupplier: build.mutation({
      query: (data) => ({
        url: "/supplier/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["supplier"], // Invalidate the supplier cache after insertion
    }),

    // Delete a supplier (DELETE request)
    deleteSupplier: build.mutation({
      query: (id) => ({
        url: `/supplier/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["supplier"], // Invalidate the supplier cache after deletion
    }),

    // Update supplier details (PATCH request)
    updateSupplier: build.mutation({
      query: ({ id, data }) => ({
        url: `/supplier/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["supplier"], // Invalidate the supplier cache after update
    }),

    // Get a single supplier (GET request)
    getSingleSupplier: build.query({
      query: (id) => ({
        url: `/supplier/${id}`,
      }),
      providesTags: ["supplier"], // Provides the 'supplier' tag for caching and invalidation
    }),

    getAllSupplier: build.query({
      query: ({ page, limit, searchTerm }) => ({
        url: "/supplier",
        params: { page, limit, searchTerm }, // Pass the page and limit as query params
      }),
      providesTags: ["supplier"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllSupplierWithoutQuery: build.query({
      query: () => ({
        url: "/supplier/all",
      }),
      providesTags: ["supplier"],

      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertSupplierMutation,
  useGetAllSupplierQuery,
  useGetSingleSupplierQuery,
  useDeleteSupplierMutation,
  useUpdateSupplierMutation,
  useGetAllSupplierWithoutQueryQuery,
} = supplierApi;
