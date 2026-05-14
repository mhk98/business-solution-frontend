import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const bookApi = createApi({
  reducerPath: "bookApi",
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

  tagTypes: ["book"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertBook: build.mutation({
      query: (data) => ({
        url: "/book/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["book"], // Invalidate the Book tag after this mutation
    }),

    deleteBook: build.mutation({
      query: (id) => ({
        url: `/book/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["book"], // Invalidate the Book tag after deletion
    }),

    updateBook: build.mutation({
      query: ({ id, data }) => ({
        url: `/book/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["book"], // Invalidate the Book tag after this mutation
    }),

    getAllBook: build.query({
      query: ({
        page,
        limit,
        startDate,
        endDate,
        bookId,
        searchTerm,
        paymentMode,
        paymentStatus,
      }) => ({
        url: "/book",
        params: {
          page,
          limit,
          startDate,
          endDate,
          bookId,
          searchTerm,
          paymentMode,
          paymentStatus,
        },
      }),
      providesTags: ["book"],
      refetchOnMountOrArgChange: true,
      // pollingInterval: 1000,  // ❌ remove
    }),

    getAllBookWithoutQuery: build.query({
      query: () => ({
        url: "/book/all",
      }),
      providesTags: ["book"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
    getSingleBookDataById: build.query({
      query: (id) => ({
        url: `/book/${id}`,
      }),
      providesTags: ["book"], // Provides the 'supplier' tag for caching and invalidation
    }),
  }),
});

export const {
  useGetAllBookQuery,
  useGetAllBookWithoutQueryQuery,
  useDeleteBookMutation,
  useUpdateBookMutation,
  useInsertBookMutation,
  useGetSingleBookDataByIdQuery,
} = bookApi;
