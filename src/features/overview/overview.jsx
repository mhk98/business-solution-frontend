import { baseApi } from "../baseApi/api";

export const overviewApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOverviewSummary: build.query({
      query: (arg = {}) => {
        const params = { ...arg };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/overview/summary", params };
      },

      providesTags: [{ type: "Overview", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const { useGetOverviewSummaryQuery } = overviewApi;
