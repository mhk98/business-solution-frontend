import { baseApi } from "../baseApi/api";

export const salesDueApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertSalesDue: build.mutation({
      query: (data) => ({
        url: "/sales-due/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "SalesDue", id: "LIST" }],
    }),

    updateSalesDue: build.mutation({
      query: ({ id, data }) => ({
        url: `/sales-due/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "SalesDue", id: arg.id },
        { type: "SalesDue", id: "LIST" },
      ],
    }),

    deleteSalesDue: build.mutation({
      query: (id) => ({
        url: `/sales-due/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "SalesDue", id },
        { type: "SalesDue", id: "LIST" },
      ],
    }),

    paySalesDue: build.mutation({
      query: ({ id, data }) => ({
        url: `/sales-due/${id}/pay`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "SalesDue", id: arg.id },
        { type: "SalesDue", id: "LIST" },
      ],
    }),

    getAllSalesDue: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/sales-due", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "SalesDue", id: "LIST" },
              ...result.data.map((r) => ({ type: "SalesDue", id: r.Id })),
            ]
          : [{ type: "SalesDue", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllSalesDueWithoutQuery: build.query({
      query: () => ({ url: "/sales-due/all" }),
      providesTags: [{ type: "SalesDue", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertSalesDueMutation,
  useUpdateSalesDueMutation,
  useDeleteSalesDueMutation,
  usePaySalesDueMutation,
  useGetAllSalesDueQuery,
  useGetAllSalesDueWithoutQueryQuery,
} = salesDueApi;
