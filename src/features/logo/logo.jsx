import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper function to get the auth token
const getAuthToken = () => {
  return localStorage.getItem("token"); // Modify this based on your token storage logic
};

export const logoApi = createApi({
  reducerPath: "logoApi",
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

  tagTypes: ["logo"], // Define the tag type for invalidation and refetching
  endpoints: (build) => ({
    insertLogo: build.mutation({
      query: (data) => ({
        url: "/logo/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["logo"], // Invalidate the Logo tag after this mutation
    }),

    deleteLogo: build.mutation({
      query: (id) => ({
        url: `/logo/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["logo"], // Invalidate the Logo tag after deletion
    }),

    updateLogo: build.mutation({
      query: ({ id, data }) => ({
        url: `/logo/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["logo"], // Invalidate the Logo tag after this mutation
    }),

    getAllLogo: build.query({
      query: () => ({
        url: "/logo",
        params: {}, // Pass the page and limit as query params
      }),
      providesTags: ["logo"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),

    getAllLogoWithoutQuery: build.query({
      query: () => ({
        url: "/logo/all",
      }),
      providesTags: ["logo"],

      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useInsertLogoMutation,
  useGetAllLogoQuery,
  useDeleteLogoMutation,
  useUpdateLogoMutation,
  useGetAllLogoWithoutQueryQuery,
} = logoApi;
