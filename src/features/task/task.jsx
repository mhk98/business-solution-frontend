import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const taskApi = createApi({
  reducerPath: "taskApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["task"],
  endpoints: (build) => ({
    getAssignableUsers: build.query({
      query: () => "/task/users",
      providesTags: ["task"],
    }),
    getTasks: build.query({
      query: ({
        page = 1,
        limit = 20,
        searchTerm,
        status,
        assignedToUserId,
      } = {}) => ({
        url: "/task",
        params: { page, limit, searchTerm, status, assignedToUserId },
      }),
      providesTags: ["task"],
    }),
    createTask: build.mutation({
      query: (data) => ({
        url: "/task/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["task"],
    }),
    updateTask: build.mutation({
      query: ({ id, data }) => ({
        url: `/task/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["task"],
    }),
    deleteTask: build.mutation({
      query: (id) => ({
        url: `/task/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["task"],
    }),
  }),
});

export const {
  useGetAssignableUsersQuery,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = taskApi;
