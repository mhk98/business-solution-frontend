import { baseApi } from "../baseApi/api";

export const factoryStockAdjustmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertFactoryStockAdjustment: build.mutation({
      query: (data) => ({
        url: "factory-stock-adjustment/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "FactoryStockAdjustment", id: "LIST" },
        { type: "ManufactureStock", id: "LIST" },
      ],
    }),

    deleteFactoryStockAdjustment: build.mutation({
      query: (id) => ({
        url: `factory-stock-adjustment/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "FactoryStockAdjustment", id: "LIST" },
        { type: "ManufactureStock", id: "LIST" },
      ],
    }),

    updateFactoryStockAdjustment: build.mutation({
      query: ({ id, data }) => ({
        url: `factory-stock-adjustment/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "FactoryStockAdjustment", id: "LIST" },
        { type: "ManufactureStock", id: "LIST" },
        { type: "FactoryStockAdjustment", id: arg.id },
      ],
    }),

    getAllFactoryStockAdjustment: build.query({
      query: ({ page, limit, startDate, endDate, name, manufacturerId }) => ({
        url: "factory-stock-adjustment",
        params: { page, limit, startDate, endDate, name, manufacturerId },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "FactoryStockAdjustment", id: "LIST" },
              ...result.data.map((r) => ({
                type: "FactoryStockAdjustment",
                id: r.Id,
              })),
            ]
          : [{ type: "FactoryStockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllFactoryStockAdjustmentWithoutQuery: build.query({
      query: () => ({
        url: "factory-stock-adjustment/all",
      }),
      providesTags: [{ type: "FactoryStockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertFactoryStockAdjustmentMutation,
  useGetAllFactoryStockAdjustmentQuery,
  useDeleteFactoryStockAdjustmentMutation,
  useUpdateFactoryStockAdjustmentMutation,
  useGetAllFactoryStockAdjustmentWithoutQueryQuery,
} = factoryStockAdjustmentApi;
