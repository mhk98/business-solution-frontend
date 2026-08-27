import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => {
  return localStorage.getItem("token");
};

export const companyInfoApi = createApi({
  reducerPath: "companyInfoApi",
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

  tagTypes: ["companyInfo"],
  endpoints: (build) => ({
    insertCompanyInfo: build.mutation({
      query: (data) => ({
        url: "/company-info/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["companyInfo"],
    }),

    deleteCompanyInfo: build.mutation({
      query: (id) => ({
        url: `/company-info/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["companyInfo"],
    }),

    updateCompanyInfo: build.mutation({
      query: ({ id, data }) => ({
        url: `/company-info/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["companyInfo"],
    }),

    getAllCompanyInfo: build.query({
      query: () => ({
        url: "/company-info",
      }),
      providesTags: ["companyInfo"],
      refetchOnMountOrArgChange: true,
    }),

    getAllCompanyInfoWithoutQuery: build.query({
      query: () => ({
        url: "/company-info/all",
      }),
      providesTags: ["companyInfo"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertCompanyInfoMutation,
  useGetAllCompanyInfoQuery,
  useDeleteCompanyInfoMutation,
  useUpdateCompanyInfoMutation,
  useGetAllCompanyInfoWithoutQueryQuery,
} = companyInfoApi;
