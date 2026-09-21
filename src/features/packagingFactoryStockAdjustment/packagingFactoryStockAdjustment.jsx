import { baseApi } from "../baseApi/api";

export const packagingFactoryStockAdjustmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertPackagingFactoryStockAdjustment: build.mutation({
      query: (data) => ({
        url: "packaging-factory-stock-adjustment/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "PackagingFactoryStockAdjustment", id: "LIST" }],
    }),

    deletePackagingFactoryStockAdjustment: build.mutation({
      query: (id) => ({
        url: `packaging-factory-stock-adjustment/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "PackagingFactoryStockAdjustment", id: "LIST" }],
    }),

    updatePackagingFactoryStockAdjustment: build.mutation({
      query: ({ id, data }) => ({
        url: `packaging-factory-stock-adjustment/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "PackagingFactoryStockAdjustment", id: "LIST" },
        { type: "PackagingFactoryStockAdjustment", id: arg.id },
      ],
    }),

    getAllPackagingFactoryStockAdjustment: build.query({
      query: ({ page, limit, startDate, endDate, name, manufacturerId }) => ({
        url: "packaging-factory-stock-adjustment",
        params: { page, limit, startDate, endDate, name, manufacturerId },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "PackagingFactoryStockAdjustment", id: "LIST" },
              ...result.data.map((r) => ({
                type: "PackagingFactoryStockAdjustment",
                id: r.Id,
              })),
            ]
          : [{ type: "PackagingFactoryStockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllPackagingFactoryStockAdjustmentWithoutQuery: build.query({
      query: () => ({
        url: "packaging-factory-stock-adjustment/all",
      }),
      providesTags: [{ type: "PackagingFactoryStockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertPackagingFactoryStockAdjustmentMutation,
  useGetAllPackagingFactoryStockAdjustmentQuery,
  useDeletePackagingFactoryStockAdjustmentMutation,
  useUpdatePackagingFactoryStockAdjustmentMutation,
  useGetAllPackagingFactoryStockAdjustmentWithoutQueryQuery,
} = packagingFactoryStockAdjustmentApi;
