import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  tagTypes: ["notification"], // Define the tag type
  endpoints: (build) => ({
    createNotification: build.mutation({
      query: (data) => ({
        url: "/notification/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["notification"],
    }),

    updateNotification: build.mutation({
      query: ({ id, userId }) => ({
        url: `/notification/${id}/read`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["notification"],
    }),

    getDataById: build.query({
      query: ({ userId, page, limit }) => ({
        url: `/notification/${userId}`,
        params: {
          page,
          limit,
        },
      }),
      providesTags: ["notification"],
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useCreateNotificationMutation,
  useUpdateNotificationMutation,
  useGetDataByIdQuery,
} = notificationApi;
