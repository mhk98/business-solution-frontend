import { baseApi } from "../baseApi/api";

export const assetsStockApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllAssetsStock: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name } = arg;
        const params = { page, limit, startDate, endDate, name };

        Object.keys(params).forEach((key) => {
          if (
            params[key] === undefined ||
            params[key] === null ||
            params[key] === ""
          ) {
            delete params[key];
          }
        });

        return {
          url: "/assets-stock",
          params,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "AssetsStock", id: "LIST" },
              ...result.data.map((row) => ({
                type: "AssetsStock",
                id: row.Id,
              })),
            ]
          : [{ type: "AssetsStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllAssetsStockWithoutQuery: build.query({
      query: () => ({ url: "/assets-stock/all" }),
      providesTags: [{ type: "AssetsStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllAssetsStockQuery,
  useGetAllAssetsStockWithoutQueryQuery,
} = assetsStockApi;
