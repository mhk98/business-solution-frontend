import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const warrantyroductApi = createApi({
  reducerPath: "warrantyroductApi",
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

  tagTypes: ["warranty-product"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertWarrantyProduct: build.mutation({
      query: (data) => ({
        url: "/warranty-product/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["warranty-product"], // Invalidate the warranty-product tag after this mutation
    }),

    deleteWarrantyProduct: build.mutation({
      query: (id) => ({
        url: `/warranty-product/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["warranty-product"], // Invalidate the warranty-product tag after deletion
    }),

    updateWarrantyProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/warranty-product/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["warranty-product"], // Invalidate the warranty-product tag after this mutation
    }),

    getAllWarrantyProduct: build.query({
      query: ({ page, limit, startDate, endDate, name, searchTerm }) => ({
        url: "/warranty-product",
        params: { page, limit, startDate, endDate, name, searchTerm }, // Pass the page and limit as query params
      }),
      providesTags: ["warranty-product"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllWarrantyProductWithoutQuery: build.query({
      query: () => ({
        url: "/warranty-product/all",
      }),
      providesTags: ["warranty-product"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertWarrantyProductMutation,
  useGetAllWarrantyProductWithoutQueryQuery,
  useDeleteWarrantyProductMutation,
  useUpdateWarrantyProductMutation,
  useGetAllWarrantyProductQuery,
} = warrantyroductApi;
