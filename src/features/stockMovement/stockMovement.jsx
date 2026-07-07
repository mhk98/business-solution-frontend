import { baseApi } from "../baseApi/api";

export const stockMovementApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllStockMovements: build.query({
      query: ({
        page,
        limit,
        searchTerm,
        sourceType,
        stockType,
        operation,
        itemId,
        productId,
        manufacturerId,
        startDate,
        endDate,
      }) => ({
        url: "stock-movements",
        params: {
          page,
          limit,
          searchTerm,
          sourceType,
          stockType,
          operation,
          itemId,
          productId,
          manufacturerId,
          startDate,
          endDate,
        },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "StockMovement", id: "LIST" },
              ...result.data.map((row) => ({
                type: "StockMovement",
                id: row.Id,
              })),
            ]
          : [{ type: "StockMovement", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
  overrideExisting: false,
});

export const { useGetAllStockMovementsQuery } = stockMovementApi;
