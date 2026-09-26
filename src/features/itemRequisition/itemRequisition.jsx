import { baseApi } from "../baseApi/api";

export const itemRequisitionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllItemRequisition: build.query({
      query: (arg = {}) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          itemId,
          supplierId,
          status,
        } = arg;
        const params = {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          itemId,
          supplierId,
          status,
        };

        Object.keys(params).forEach((key) => {
          if (
            params[key] === undefined ||
            params[key] === null ||
            params[key] === ""
          ) {
            delete params[key];
          }
        });

        return { url: "/item-requisition", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "ItemRequisition", id: "LIST" },
              ...result.data.map((row) => ({
                type: "ItemRequisition",
                id: row.Id,
              })),
            ]
          : [{ type: "ItemRequisition", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllItemRequisitionWithoutQuery: build.query({
      query: () => ({ url: "/item-requisition/all" }),
      providesTags: [{ type: "ItemRequisition", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    insertItemRequisition: build.mutation({
      query: (data) => ({
        url: "/item-requisition/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "ItemRequisition", id: "LIST" },
        // Receiving a requisition posts Item Stock and the supplier's due.
        "supplier",
        { type: "SupplierHistory", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
        { type: "Manufacture", id: "LIST" },
      ],
    }),

    updateItemRequisition: build.mutation({
      query: ({ id, data }) => ({
        url: `/item-requisition/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ItemRequisition", id: arg.id },
        { type: "ItemRequisition", id: "LIST" },
        "supplier",
        { type: "SupplierHistory", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
        { type: "Manufacture", id: "LIST" },
      ],
    }),

    deleteItemRequisition: build.mutation({
      query: (id) => ({
        url: `/item-requisition/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "ItemRequisition", id },
        { type: "ItemRequisition", id: "LIST" },
        "supplier",
        { type: "SupplierHistory", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
        { type: "Manufacture", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllItemRequisitionQuery,
  useGetAllItemRequisitionWithoutQueryQuery,
  useInsertItemRequisitionMutation,
  useUpdateItemRequisitionMutation,
  useDeleteItemRequisitionMutation,
} = itemRequisitionApi;
