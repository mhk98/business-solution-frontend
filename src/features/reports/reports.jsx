import { baseApi } from "../baseApi/api";

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getGenericReport: build.query({
      query: ({ endpoint, params }) => ({
        url: endpoint,
        params,
      }),
      transformResponse: (response) => ({
        rows: Array.isArray(response?.data) ? response.data : [],
        meta: response?.meta || {},
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetGenericReportQuery } = reportsApi;
