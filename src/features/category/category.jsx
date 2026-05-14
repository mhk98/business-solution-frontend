import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const categoryApi = createApi({
  reducerPath: "categoryApi",
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

  tagTypes: ["category"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertCategory: build.mutation({
      query: (data) => ({
        url: "/category/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["category"], // Invalidate the Category tag after this mutation
    }),

    deleteCategory: build.mutation({
      query: (id) => ({
        url: `/category/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["category"], // Invalidate the Category tag after deletion
    }),

    updateCategory: build.mutation({
      query: ({ id, data }) => ({
        url: `/category/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["category"], // Invalidate the Category tag after this mutation
    }),

    getAllCategory: build.query({
      query: ({ page = 1, limit = 200, startDate, endDate, name } = {}) => ({
        url: "/category",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: ["category"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllCategoryWithoutQuery: build.query({
      query: () => ({
        url: "/category/all",
      }),
      providesTags: ["category"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useGetAllCategoryQuery,
  useGetAllCategoryWithoutQueryQuery,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
  useInsertCategoryMutation,
} = categoryApi;
