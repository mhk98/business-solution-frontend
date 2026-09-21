import { baseApi } from "../baseApi/api";

export const packagingItemStockAdjustmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertPackagingItemStockAdjustment: build.mutation({
      query: (data) => ({
        url: "packaging-item-stock-adjustment/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "PackagingItemStockAdjustment", id: "LIST" }],
    }),

    deletePackagingItemStockAdjustment: build.mutation({
      query: (id) => ({
        url: `packaging-item-stock-adjustment/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "PackagingItemStockAdjustment", id: "LIST" }],
    }),

    updatePackagingItemStockAdjustment: build.mutation({
      query: ({ id, data }) => ({
        url: `packaging-item-stock-adjustment/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "PackagingItemStockAdjustment", id: "LIST" },
        { type: "PackagingItemStockAdjustment", id: arg.id },
      ],
    }),

    getAllPackagingItemStockAdjustment: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "packaging-item-stock-adjustment",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "PackagingItemStockAdjustment", id: "LIST" },
              ...result.data.map((r) => ({
                type: "PackagingItemStockAdjustment",
                id: r.Id,
              })),
            ]
          : [{ type: "PackagingItemStockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllPackagingItemStockAdjustmentWithoutQuery: build.query({
      query: () => ({
        url: "packaging-item-stock-adjustment/all",
      }),
      providesTags: [{ type: "PackagingItemStockAdjustment", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertPackagingItemStockAdjustmentMutation,
  useGetAllPackagingItemStockAdjustmentQuery,
  useDeletePackagingItemStockAdjustmentMutation,
  useUpdatePackagingItemStockAdjustmentMutation,
  useGetAllPackagingItemStockAdjustmentWithoutQueryQuery,
} = packagingItemStockAdjustmentApi;
