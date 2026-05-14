import { baseApi } from "../baseApi/api";

export const damageProductApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertDamageProduct: build.mutation({
      query: (data) => ({
        url: "/damage-product/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "DamageProduct", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" }, // ✅ receive stock affected
        { type: "DamageStock", id: "LIST" }, // ✅ receive stock affected
      ],
    }),

    deleteDamageProduct: build.mutation({
      query: (id) => ({
        url: `/damage-product/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "DamageProduct", id },
        { type: "DamageProduct", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ stock return/update
        { type: "DamageStock", id: "LIST" }, // ✅ stock return/update
      ],
    }),

    updateDamageProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/damage-product/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "DamageProduct", id: arg.id },
        { type: "DamageProduct", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ if update changes qty/status
        { type: "DamageStock", id: "LIST" }, // ✅ if update changes qty/status
      ],
    }),

    getAllDamageProduct: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/damage-product/", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
            { type: "DamageProduct", id: "LIST" },
            ...result.data.map((r) => ({
              type: "DamageProduct",
              id: r.Id,
            })),
          ]
          : [{ type: "DamageProduct", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllDamageProductWithoutQuery: build.query({
      query: () => ({ url: "/damage-product/all" }),
      providesTags: [{ type: "DamageProduct", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDamageProductMutation,
  useGetAllDamageProductQuery,
  useDeleteDamageProductMutation,
  useUpdateDamageProductMutation,
  useGetAllDamageProductWithoutQueryQuery,
} = damageProductApi;
