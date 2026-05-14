// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const manufactureApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertManufacture: build.mutation({
      query: (data) => ({
        url: "manufacture/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Manufacture", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
      ],
    }),

    deleteManufacture: build.mutation({
      query: (id) => ({
        url: `manufacture/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Manufacture", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
      ],
    }),

    getSingleManDataById: build.mutation({
      query: (id) => ({
        url: `manufacture/${id}`,
        method: "GET",
      }),
      invalidatesTags: [
        { type: "Manufacture", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
      ],
    }),

    updateManufacture: build.mutation({
      query: ({ id, data }) => ({
        url: `manufacture/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "Manufacture", id: "LIST" },
        { type: "ItemMaster", id: "LIST" },
        { type: "Manufacture", id: arg.id },
      ],
    }),

    getAllManufacture: build.query({
      query: ({ page, limit, startDate, endDate, name, supplierId }) => ({
        url: "manufacture",
        params: { page, limit, startDate, endDate, name, supplierId },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "Manufacture", id: "LIST" },
              ...result.data.map((r) => ({ type: "Manufacture", id: r.Id })),
            ]
          : [{ type: "Manufacture", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllManufactureWithoutQuery: build.query({
      query: () => ({
        url: "manufacture/all",
      }),
      providesTags: [{ type: "Manufacture", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertManufactureMutation,
  useGetAllManufactureQuery,
  useDeleteManufactureMutation,
  useUpdateManufactureMutation,
  useGetAllManufactureWithoutQueryQuery,
  useGetSingleManDataByIdMutation,
} = manufactureApi;
