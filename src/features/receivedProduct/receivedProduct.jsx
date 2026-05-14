// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const receivedProductApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllReceivedProduct: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm, name } = arg;

        const params = { page, limit, startDate, endDate, searchTerm, name };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/received-product", params };
      },

      // ✅ list + each row
      providesTags: (result) =>
        result?.data
          ? [
            { type: "ReceivedProduct", id: "LIST" },
            ...result.data.map((r) => ({
              type: "ReceivedProduct",
              id: r.Id,
            })),
          ]
          : [{ type: "ReceivedProduct", id: "LIST" }],

      refetchOnMountOrArgChange: true,
    }),

    getAllReceivedProductWithoutQuery: build.query({
      query: () => ({ url: "/received-product/all" }),
      providesTags: [
        { type: "ReceivedProduct", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
      refetchOnMountOrArgChange: true,
    }),

    insertReceivedProduct: build.mutation({
      query: (data) => ({
        url: "/received-product/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "ReceivedProduct", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),

    updateReceivedProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/received-product/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "ReceivedProduct", id: arg.id },
        { type: "ReceivedProduct", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),

    deleteReceivedProduct: build.mutation({
      query: (id) => ({
        url: `/received-product/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "ReceivedProduct", id },
        { type: "ReceivedProduct", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllReceivedProductQuery,
  useGetAllReceivedProductWithoutQueryQuery,
  useInsertReceivedProductMutation,
  useUpdateReceivedProductMutation,
  useDeleteReceivedProductMutation,
} = receivedProductApi;
