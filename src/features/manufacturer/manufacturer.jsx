import { baseApi } from "../baseApi/api";

export const manufacturerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertManufacturer: build.mutation({
      query: (data) => ({
        url: "manufacturer/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Manufacturer", id: "LIST" }],
    }),

    deleteManufacturer: build.mutation({
      query: (id) => ({
        url: `manufacturer/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Manufacturer", id: "LIST" }],
    }),

    updateManufacturer: build.mutation({
      query: ({ id, data }) => ({
        url: `manufacturer/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "Manufacturer", id: "LIST" },
        { type: "Manufacturer", id: arg.id },
      ],
    }),

    getAllManufacturer: build.query({
      query: ({ page, limit, searchTerm }) => ({
        url: "manufacturer",
        params: { page, limit, searchTerm },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "Manufacturer", id: "LIST" },
              ...result.data.map((r) => ({ type: "Manufacturer", id: r.Id })),
            ]
          : [{ type: "Manufacturer", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllManufacturerWithoutQuery: build.query({
      query: () => ({
        url: "manufacturer/all",
      }),
      providesTags: [{ type: "Manufacturer", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getManufacturerTransactions: build.query({
      query: ({ id, page = 1, limit = 20 }) => ({
        url: `manufacturer/${id}/transactions`,
        params: { page, limit },
      }),
      providesTags: (result, error, arg) => [
        { type: "Manufacturer", id: arg.id },
        { type: "Manufacturer", id: "LIST" },
      ],
      refetchOnMountOrArgChange: true,
    }),

    payManufacturerAmount: build.mutation({
      query: ({ id, data }) => ({
        url: `manufacturer/${id}/payments`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Manufacturer", id: arg.id },
        { type: "Manufacturer", id: "LIST" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertManufacturerMutation,
  useGetAllManufacturerQuery,
  useDeleteManufacturerMutation,
  useUpdateManufacturerMutation,
  useGetAllManufacturerWithoutQueryQuery,
  useGetManufacturerTransactionsQuery,
  usePayManufacturerAmountMutation,
} = manufacturerApi;
