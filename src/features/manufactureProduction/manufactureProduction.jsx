import { baseApi } from "../baseApi/api";

export const manufactureProductionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertManufactureProduction: build.mutation({
      query: (data) => ({
        url: "manufacture/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "ManufactureProduction", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
        { type: "ManufactureStock", id: "LIST" },
      ],
    }),

    deleteManufactureProduction: build.mutation({
      query: (id) => ({
        url: `manufacture/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "ManufactureProduction", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
        { type: "ManufactureStock", id: "LIST" },
      ],
    }),

    updateManufactureProduction: build.mutation({
      query: ({ id, data }) => ({
        url: `manufacture/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ManufactureProduction", id: "LIST" },
        { type: "ManufactureProduction", id: arg.id },
        { type: "ItemMaster", id: "LIST" },
        { type: "ManufactureStock", id: "LIST" },
      ],
    }),

    getAllManufactureProduction: build.query({
      query: ({ page, limit, startDate, endDate, name, manufacturerId }) => ({
        url: "manufacture",
        params: { page, limit, startDate, endDate, name, manufacturerId },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "ManufactureProduction", id: "LIST" },
              ...result.data.map((r) => ({
                type: "ManufactureProduction",
                id: r.Id,
              })),
            ]
          : [{ type: "ManufactureProduction", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertManufactureProductionMutation,
  useGetAllManufactureProductionQuery,
  useDeleteManufactureProductionMutation,
  useUpdateManufactureProductionMutation,
} = manufactureProductionApi;
