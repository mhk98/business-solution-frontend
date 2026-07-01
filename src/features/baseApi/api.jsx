import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
  credentials: "include",
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      const refreshResult = await rawBaseQuery(
        {
          url: "/user/refresh-token",
          method: "POST",
          body: { refreshToken },
        },
        api,
        extraOptions,
      );

      if (refreshResult.data?.data?.accessToken) {
        localStorage.setItem("token", refreshResult.data.data.accessToken);
        // retry original request with new token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        localStorage.clear();
        window.location.href = "/login";
      }
    } else {
      localStorage.clear();
      window.location.href = "/login";
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReauth,

  // ✅ add all modules here
  tagTypes: [
    "AssetsPurchase",
    "AssetsSale",
    "AssetsDamage",
    "Overview",
    "InventoryOverview",
    "ReceivedProduct",
    "PurchaseReturn",
    "InTransitProduct",
    "ReturnProduct",
    "DamageProduct",
    "DamageRepair",
    "DamageRepaired",
    "InventorySummary",
    "ConfirmOrder",
    "PosReport",
    "SupplierHistory",
    "Manufacture",
    "ItemMaster",
    "ItemRequisition",
    "StockAdjustment",
    "DamageRepairingStock",
    "EmployeeList",
    "KPI",
    "AdsCampaignKPI",
    "AdsAccount",
    "ProfitLoss",
  ],

  endpoints: () => ({}),
});
