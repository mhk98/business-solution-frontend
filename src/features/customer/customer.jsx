import { baseApi } from "../baseApi/api";

export const customerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllCustomer: build.query({
      query: ({ page, limit, searchTerm } = {}) => ({
        url: "customer",
        params: { page, limit, searchTerm },
      }),
      refetchOnMountOrArgChange: true,
    }),

    getAllCustomerWithoutQuery: build.query({
      query: () => ({
        url: "customer/all",
      }),
      refetchOnMountOrArgChange: true,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllCustomerQuery,
  useGetAllCustomerWithoutQueryQuery,
} = customerApi;
