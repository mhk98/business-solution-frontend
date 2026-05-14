import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token from localStorage (or sessionStorage)
const getAuthToken = () => {
  return localStorage.getItem("token"); // Adjust as per your storage method
};

export const buyerApi = createApi({
  reducerPath: "buyerApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,

    // Attach Authorization header to all requests
    prepareHeaders: (headers) => {
      const token = getAuthToken(); // Get the token from storage
      if (token) {
        headers.set("Authorization", `Bearer ${token}`); // Set the Authorization header if token exists
      }
      return headers;
    },
  }),

  tagTypes: ["buyer"], // Define the tag type for invalidation and caching
  endpoints: (build) => ({
    // Insert a new buyer (POST request)
    insertBuyer: build.mutation({
      query: (data) => ({
        url: "/buyer/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["buyer"], // Invalidate buyer tag for cache management
    }),

    // Delete a buyer (DELETE request)
    deleteBuyer: build.mutation({
      query: (id) => ({
        url: `/buyer/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["buyer"], // Invalidate buyer tag after deletion
    }),

    // Update buyer details (PATCH request)
    updateBuyer: build.mutation({
      query: ({ id, data }) => ({
        url: `/buyer/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["buyer"], // Invalidate buyer tag after update
    }),

    // Get a single buyer by ID (GET request)
    getSingleBuyer: build.query({
      query: (id) => `/buyer/${id}`,
    }),
    providesTags: ["buyer"], // Provide the "buyer" tag to manage cache

    // Get all buyers (GET request)
    getAllBuyer: build.query({
      query: ({ page, limit, startDate, endDate, buyerId }) => ({
        url: "/buyer",
        params: { page, limit, startDate, endDate, buyerId }, // Pass the page and limit as query params
      }),
      providesTags: ["buyer"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllBuyerWithoutQuery: build.query({
      query: () => ({
        url: "/buyer/all",
      }),
      providesTags: ["buyer"],

      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertBuyerMutation,
  useGetAllBuyerQuery,
  useGetSingleBuyerQuery,
  useDeleteBuyerMutation,
  useUpdateBuyerMutation,
  useGetAllBuyerWithoutQueryQuery,
} = buyerApi;
