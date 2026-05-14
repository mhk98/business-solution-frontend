import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const teamApi = createApi({
  reducerPath: "teamApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Team"],
  endpoints: (build) => ({
    createTeam: build.mutation({
      query: (data) => ({
        url: "/team/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Team"],
    }),
    updateTeam: build.mutation({
      query: ({ id, data }) => ({
        url: `/team/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Team"],
    }),
    deleteTeam: build.mutation({
      query: ({ id, note }) => ({
        url: `/team/${id}`,
        method: "DELETE",
        body: note ? { note } : undefined,
      }),
      invalidatesTags: ["Team"],
    }),
    approveTeam: build.mutation({
      query: (id) => ({
        url: `/team/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["Team"],
    }),
    getAllTeams: build.query({
      query: (params) => ({
        url: "/team",
        params,
      }),
      providesTags: ["Team"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useApproveTeamMutation,
  useGetAllTeamsQuery,
} = teamApi;
