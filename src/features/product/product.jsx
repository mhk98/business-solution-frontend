import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const productApi = createApi({
  reducerPath: "productApi",
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

  tagTypes: ["product"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertProduct: build.mutation({
      query: (data) => ({
        url: "/product/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["product"], // Invalidate the product tag after this mutation
    }),

    deleteProduct: build.mutation({
      query: (id) => ({
        url: `/product/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["product"], // Invalidate the product tag after deletion
    }),

    updateProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/product/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["product"], // Invalidate the product tag after this mutation
    }),

    getAllProduct: build.query({
      query: ({ page, limit, startDate, endDate, name, warehouseId }) => ({
        url: "/product",
        params: { page, limit, startDate, endDate, name, warehouseId }, // Pass the page and limit as query params
      }),
      providesTags: ["product"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllProductWithoutQuery: build.query({
      query: () => ({
        url: "/product/all",
      }),
      providesTags: ["product"],

      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getSingleProductById: build.query({
      query: (id) => ({
        url: `/product/stock/${id}`,
      }),
      providesTags: ["product"], // Provides the 'product' tag for caching and invalidation
    }),

    getSingleReceivedProductById: build.query({
      query: (id) => ({
        url: `/product/${id}`,
      }),
      providesTags: ["product"], // Provides the 'product' tag for caching and invalidation
    }),
  }),
});

export const {
  useInsertProductMutation,
  useGetAllProductQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
  useGetAllProductWithoutQueryQuery,
  useGetSingleProductByIdQuery,
  useGetSingleReceivedProductByIdQuery,
} = productApi;
