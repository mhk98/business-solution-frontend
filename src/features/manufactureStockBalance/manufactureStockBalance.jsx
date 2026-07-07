import { baseApi } from "../baseApi/api";

export const manufactureStockBalanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllManufactureStock: build.query({
      query: ({ page, limit, startDate, endDate, name, manufacturerId }) => ({
        url: "manufacture-stock",
        params: { page, limit, startDate, endDate, name, manufacturerId },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "ManufactureStock", id: "LIST" },
              ...result.data.map((r) => ({
                type: "ManufactureStock",
                id: r.Id,
              })),
            ]
          : [{ type: "ManufactureStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllManufactureStockWithoutQuery: build.query({
      query: () => ({
        url: "manufacture-stock/all",
      }),
      providesTags: [{ type: "ManufactureStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllManufactureStockQuery,
  useGetAllManufactureStockWithoutQueryQuery,
} = manufactureStockBalanceApi;
