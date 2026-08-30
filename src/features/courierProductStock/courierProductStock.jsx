import { baseApi } from "../baseApi/api";

export const courierProductStockApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertCourierProductStock: build.mutation({
      query: (data) => ({
        url: "/courier-product-stock/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "CourierProductStock", id: "LIST" }],
    }),

    updateCourierProductStock: build.mutation({
      query: ({ id, data }) => ({
        url: `/courier-product-stock/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "CourierProductStock", id: arg.id },
        { type: "CourierProductStock", id: "LIST" },
      ],
    }),

    deleteCourierProductStock: build.mutation({
      query: (id) => ({
        url: `/courier-product-stock/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "CourierProductStock", id },
        { type: "CourierProductStock", id: "LIST" },
      ],
    }),

    getAllCourierProductStock: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, status, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, status, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/courier-product-stock", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "CourierProductStock", id: "LIST" },
              ...result.data.map((r) => ({
                type: "CourierProductStock",
                id: r.Id,
              })),
            ]
          : [{ type: "CourierProductStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllCourierProductStockWithoutQuery: build.query({
      query: () => ({ url: "/courier-product-stock/all" }),
      providesTags: [{ type: "CourierProductStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertCourierProductStockMutation,
  useUpdateCourierProductStockMutation,
  useDeleteCourierProductStockMutation,
  useGetAllCourierProductStockQuery,
  useGetAllCourierProductStockWithoutQueryQuery,
} = courierProductStockApi;
