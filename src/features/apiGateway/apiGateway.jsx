import { baseApi } from "../baseApi/api";

export const apiGatewayApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getApiGatewaySetting: build.query({
      query: (gatewayType) => ({
        url: `/api-gateway-settings/${gatewayType}`,
      }),
      providesTags: ["ApiGateway"],
    }),
    updateApiGatewaySetting: build.mutation({
      query: ({ gatewayType, data }) => ({
        url: `/api-gateway-settings/${gatewayType}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ApiGateway"],
    }),
  }),
});

export const {
  useGetApiGatewaySettingQuery,
  useUpdateApiGatewaySettingMutation,
} = apiGatewayApi;
