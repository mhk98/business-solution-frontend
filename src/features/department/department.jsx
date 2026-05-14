import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const departmentApi = createApi({
  reducerPath: "departmentApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Department"],
  endpoints: (build) => ({
    createDepartment: build.mutation({
      query: (data) => ({
        url: "/department/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Department"],
    }),
    updateDepartment: build.mutation({
      query: ({ id, data }) => ({
        url: `/department/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Department"],
    }),
    deleteDepartment: build.mutation({
      query: ({ id, note }) => ({
        url: `/department/${id}`,
        method: "DELETE",
        body: note ? { note } : undefined,
      }),
      invalidatesTags: ["Department"],
    }),
    approveDepartment: build.mutation({
      query: (id) => ({
        url: `/department/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["Department"],
    }),
    getAllDepartments: build.query({
      query: (params) => ({
        url: "/department",
        params,
      }),
      providesTags: ["Department"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useApproveDepartmentMutation,
  useGetAllDepartmentsQuery,
} = departmentApi;
