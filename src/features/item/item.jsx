import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const itemApi = createApi({
  reducerPath: "itemApi",
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

  tagTypes: ["item"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertItem: build.mutation({
      query: (data) => ({
        url: "/item/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["item"], // Invalidate the item tag after this mutation
    }),

    deleteItem: build.mutation({
      query: (id) => ({
        url: `/item/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["item"], // Invalidate the item tag after deletion
    }),

    updateItem: build.mutation({
      query: ({ id, data }) => ({
        url: `/item/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["item"], // Invalidate the item tag after this mutation
    }),

    getAllItem: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "/item",
        params: { page, limit, startDate, endDate, name }, // Pass the page and limit as query params
      }),
      providesTags: ["item"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllItemWithoutQuery: build.query({
      query: () => ({
        url: "/item/all",
      }),
      providesTags: ["item"],

      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertItemMutation,
  useGetAllItemQuery,
  useDeleteItemMutation,
  useUpdateItemMutation,
  useGetAllItemWithoutQueryQuery,
} = itemApi;
