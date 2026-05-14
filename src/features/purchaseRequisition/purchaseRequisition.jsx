import { baseApi } from "../baseApi/api";

export const purchaseRequisitionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllPurchaseRequisition: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm, name } = arg;

        const params = { page, limit, startDate, endDate, searchTerm, name };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/purchase-requisition", params };
      },

      // ✅ list + each row
      providesTags: (result) =>
        result?.data
          ? [
            { type: "PurchaseRequisition", id: "LIST" },
            ...result.data.map((r) => ({
              type: "PurchaseRequisition",
              id: r.Id,
            })),
          ]
          : [{ type: "PurchaseRequisition", id: "LIST" }],

      refetchOnMountOrArgChange: true,
    }),

    getAllPurchaseRequisitionWithoutQuery: build.query({
      query: () => ({ url: "/purchase-requisition/all" }),
      providesTags: [{ type: "PurchaseRequisition", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    insertPurchaseRequisition: build.mutation({
      query: (data) => ({
        url: "/purchase-requisition/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "PurchaseRequisition", id: "LIST" }],
    }),

    updatePurchaseRequisition: build.mutation({
      query: ({ id, data }) => ({
        url: `/purchase-requisition/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "PurchaseRequisition", id: arg.id },
        { type: "PurchaseRequisition", id: "LIST" },
      ],
    }),

    deletePurchaseRequisition: build.mutation({
      query: (id) => ({
        url: `/purchase-requisition/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "PurchaseRequisition", id },
        { type: "PurchaseRequisition", id: "LIST" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllPurchaseRequisitionQuery,
  useGetAllPurchaseRequisitionWithoutQueryQuery,
  useInsertPurchaseRequisitionMutation,
  useUpdatePurchaseRequisitionMutation,
  useDeletePurchaseRequisitionMutation,
} = purchaseRequisitionApi;
