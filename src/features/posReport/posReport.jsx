import { baseApi } from "../baseApi/api";

export const posReportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertPosReport: build.mutation({
      query: (data) => ({
        url: "/pos-report/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "PosReport", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" }, // ✅ receive stock affected
        { type: "ConfirmOrder", id: "LIST" }, // ✅ receive stock affected
      ],
    }),

    deletePosReport: build.mutation({
      query: (id) => ({
        url: `/pos-report/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "PosReport", id },
        { type: "PosReport", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ stock return/update
        { type: "ConfirmOrder", id: "LIST" }, // ✅ stock return/update
      ],
    }),

    updatePosReport: build.mutation({
      query: ({ id, data }) => ({
        url: `/pos-report/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "PosReport", id: arg.id },
        { type: "PosReport", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ if update changes qty/status
        { type: "ConfirmOrder", id: "LIST" }, // ✅ if update changes qty/status
      ],
    }),

    getAllPosReport: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/pos-report", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
            { type: "PosReport", id: "LIST" },
            ...result.data.map((r) => ({
              type: "PosReport",
              id: r.Id,
            })),
          ]
          : [{ type: "PosReport", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllPosReportWithoutQuery: build.query({
      query: () => ({ url: "/pos-report/all" }),
      providesTags: [{ type: "PosReport", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertPosReportMutation,
  useGetAllPosReportQuery,
  useDeletePosReportMutation,
  useUpdatePosReportMutation,
  useGetAllPosReportWithoutQueryQuery,
} = posReportApi;
