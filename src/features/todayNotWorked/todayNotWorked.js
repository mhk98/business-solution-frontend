import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

export const todayNotWorkedApi = createApi({
  reducerPath: "todayNotWorkedApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["TodayNotWorked"],
  endpoints: (build) => ({
    getTodayNotWorked: build.query({
      query: (params = {}) => ({
        url: "/today-not-worked",
        params: cleanParams(params),
      }),
      providesTags: ["TodayNotWorked"],
      refetchOnMountOrArgChange: true,
    }),
    getUserDayActivity: build.query({
      query: (params = {}) => ({
        url: "/today-not-worked/activity",
        params: cleanParams(params),
      }),
      providesTags: ["TodayNotWorked"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const { useGetTodayNotWorkedQuery, useGetUserDayActivityQuery } =
  todayNotWorkedApi;
