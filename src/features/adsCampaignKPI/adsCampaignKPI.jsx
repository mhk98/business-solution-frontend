import { baseApi } from "../baseApi/api";

export const adsCampaignKPIApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertAdsCampaignKPI: build.mutation({
      query: (data) => ({
        url: "/ads-campaign-kpi/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "AdsCampaignKPI", id: "LIST" }],
    }),

    updateAdsCampaignKPI: build.mutation({
      query: ({ id, data }) => ({
        url: `/ads-campaign-kpi/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "AdsCampaignKPI", id: arg.id },
        { type: "AdsCampaignKPI", id: "LIST" },
      ],
    }),

    deleteAdsCampaignKPI: build.mutation({
      query: (id) => ({
        url: `/ads-campaign-kpi/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "AdsCampaignKPI", id },
        { type: "AdsCampaignKPI", id: "LIST" },
      ],
    }),

    getAllAdsCampaignKPI: build.query({
      query: (arg = {}) => {
        const params = { ...arg };
        Object.keys(params).forEach((key) => {
          if (params[key] === undefined || params[key] === null || params[key] === "") {
            delete params[key];
          }
        });

        return { url: "/ads-campaign-kpi", params };
      },
      providesTags: (result) => {
        const rows = result?.data;
        if (Array.isArray(rows) && rows.length) {
          return [
            { type: "AdsCampaignKPI", id: "LIST" },
            ...rows.map((row) => ({
              type: "AdsCampaignKPI",
              id: row.Id ?? row.id,
            })),
          ];
        }
        return [{ type: "AdsCampaignKPI", id: "LIST" }];
      },
      refetchOnMountOrArgChange: true,
    }),

    getAdsCampaignKPISummary: build.query({
      query: (arg = {}) => {
        const params = { ...arg };
        Object.keys(params).forEach((key) => {
          if (params[key] === undefined || params[key] === null || params[key] === "") {
            delete params[key];
          }
        });

        return { url: "/ads-campaign-kpi/summary", params };
      },
      providesTags: [{ type: "AdsCampaignKPI", id: "SUMMARY" }],
      refetchOnMountOrArgChange: true,
    }),

    getAdsCampaignKPIPerformanceGraph: build.query({
      query: (arg = {}) => {
        const params = { ...arg };
        Object.keys(params).forEach((key) => {
          if (params[key] === undefined || params[key] === null || params[key] === "") {
            delete params[key];
          }
        });

        return { url: "/ads-campaign-kpi/performance-graph", params };
      },
      providesTags: [{ type: "AdsCampaignKPI", id: "GRAPH" }],
      refetchOnMountOrArgChange: true,
    }),

    getAdsAccounts: build.query({
      query: (arg = {}) => {
        const params = { ...arg };
        Object.keys(params).forEach((key) => {
          if (params[key] === undefined || params[key] === null || params[key] === "") {
            delete params[key];
          }
        });

        return { url: "/ads-campaign-kpi/ads-accounts", params };
      },
      providesTags: [{ type: "AdsAccount", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    createAdsAccount: build.mutation({
      query: (data) => ({
        url: "/ads-campaign-kpi/ads-accounts/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "AdsAccount", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useInsertAdsCampaignKPIMutation,
  useUpdateAdsCampaignKPIMutation,
  useDeleteAdsCampaignKPIMutation,
  useGetAllAdsCampaignKPIQuery,
  useGetAdsCampaignKPISummaryQuery,
  useGetAdsCampaignKPIPerformanceGraphQuery,
  useGetAdsAccountsQuery,
  useCreateAdsAccountMutation,
} = adsCampaignKPIApi;
