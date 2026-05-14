import { baseApi } from "../baseApi/api";

export const kpiApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertKPI: build.mutation({
      query: (data) => ({
        url: "/kpi/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "KPI", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    updateKPI: build.mutation({
      query: ({ id, data }) => ({
        url: `/kpi/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "KPI", id: arg.id },
        { type: "KPI", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    deleteKPI: build.mutation({
      query: (id) => ({
        url: `/kpi/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "KPI", id },
        { type: "KPI", id: "LIST" },
        { type: "Overview", id: "LIST" },
      ],
    }),

    getAllKPI: build.query({
      query: (arg = {}) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          status,
          searchTerm,
          userId,
          employeeId,
          paymentMode,
          paymentStatus,
          category,
          lender,
          bookId,
        } = arg;

        const params = {
          page,
          limit,
          bookId,
          startDate,
          endDate,
          status,
          searchTerm,
          userId,
          employeeId,
          paymentMode,
          paymentStatus,
          category,
          lender,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/kpi", params };
      },

      providesTags: (result) => {
        const rows = result?.data;
        if (Array.isArray(rows) && rows.length) {
          return [
            { type: "KPI", id: "LIST" },
            ...rows.map((r) => ({
              type: "KPI",
              id: r.Id ?? r.id,
            })),
          ];
        }
        return [{ type: "KPI", id: "LIST" }];
      },

      refetchOnMountOrArgChange: true,
    }),

    getSingleKPI: build.query({
      query: (id) => ({ url: `/kpi/${id}` }),

      providesTags: (result, err, id) => [{ type: "KPI", id }],
    }),

    getAllKPIWithoutQuery: build.query({
      query: () => ({ url: "/kpi/all" }),
      providesTags: [{ type: "KPI", id: "LIST" }],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000, // দরকার না হলে off করুন
    }),

    getKPISettings: build.query({
      query: () => ({ url: "/kpi/settings" }),
      providesTags: [{ type: "KPI", id: "SETTINGS" }],
      refetchOnMountOrArgChange: true,
    }),

    getKPIEmployeeOptions: build.query({
      query: (arg = {}) => {
        const { searchTerm, status, page, limit } = arg;
        const params = {
          searchTerm,
          status,
          page,
          limit: limit || 100,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/kpi/employee-options", params };
      },
      providesTags: [{ type: "KPI", id: "EMPLOYEE_OPTIONS" }],
      refetchOnMountOrArgChange: true,
    }),

    getKPIPerformanceGraph: build.query({
      query: (arg = {}) => {
        const { startDate, endDate, userId, employeeId, periodType } = arg;
        const params = {
          startDate,
          endDate,
          userId,
          employeeId,
          periodType,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/kpi/performance-graph", params };
      },
      providesTags: [{ type: "KPI", id: "PERFORMANCE_GRAPH" }],
      refetchOnMountOrArgChange: true,
    }),

    updateKPISettings: build.mutation({
      query: (data) => ({
        url: "/kpi/settings",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [{ type: "KPI", id: "SETTINGS" }],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllKPIQuery,
  useGetSingleKPIQuery,
  useInsertKPIMutation,
  useUpdateKPIMutation,
  useDeleteKPIMutation,
  useGetAllKPIWithoutQueryQuery,
  useGetKPISettingsQuery,
  useGetKPIEmployeeOptionsQuery,
  useGetKPIPerformanceGraphQuery,
  useUpdateKPISettingsMutation,
} = kpiApi;
