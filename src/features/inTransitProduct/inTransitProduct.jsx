import { baseApi } from "../baseApi/api";

export const inTransitProductApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertInTransitProduct: build.mutation({
      query: (data) => ({
        url: "/intransit-product/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "InTransitProduct", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" }, // ✅ receive stock affected
        { type: "Overview", id: "LIST" }, // ✅ receive stock affected
      ],
    }),

    deleteInTransitProduct: build.mutation({
      query: (id) => ({
        url: `/intransit-product/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "InTransitProduct", id },
        { type: "InTransitProduct", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ stock return/update
        { type: "Overview", id: "LIST" }, // ✅ stock return/update
      ],
    }),

    updateInTransitProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/intransit-product/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "InTransitProduct", id: arg.id },
        { type: "InTransitProduct", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ if update changes qty/status
        { type: "Overview", id: "LIST" }, // ✅ if update changes qty/status
      ],
    }),

    getAllInTransitProduct: build.query({
      query: (arg = {}) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          name,
          searchTerm,
          sortBy,
          sortOrder,
        } = arg;
        const params = {
          page,
          limit,
          startDate,
          endDate,
          name,
          searchTerm,
          sortBy,
          sortOrder,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/intransit-product", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
            { type: "InTransitProduct", id: "LIST" },
            ...result.data.map((r) => ({
              type: "InTransitProduct",
              id: r.Id,
            })),
          ]
          : [{ type: "InTransitProduct", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllInTransitProductWithoutQuery: build.query({
      query: () => ({ url: "/intransit-product/all" }),
      providesTags: [{ type: "InTransitProduct", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertInTransitProductMutation,
  useGetAllInTransitProductQuery,
  useDeleteInTransitProductMutation,
  useUpdateInTransitProductMutation,
  useGetAllInTransitProductWithoutQueryQuery,
} = inTransitProductApi;
