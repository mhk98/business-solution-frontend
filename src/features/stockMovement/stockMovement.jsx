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
        name,
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
          name,
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

    getStockMovementNames: build.query({
      query: () => ({
        url: "stock-movements/names",
      }),
      providesTags: [{ type: "StockMovement", id: "NAMES" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAllStockMovementsQuery, useGetStockMovementNamesQuery } =
  stockMovementApi;
