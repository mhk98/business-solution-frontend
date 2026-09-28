import { useMemo } from "react";
import { useGetAllPackagingItemStockWithoutQueryQuery } from "../features/packagingItemStock/packagingItemStock";

// Units a stock entry can be recorded in. Weight stock is kept in Gram and
// volume in Ml; the backend converts Kg/Liter entries (×1000) before touching
// stock, so an entry may use either unit of the stock's family — but never a
// unit from another family ("Pcs" against Gram stock would count as grams).
export const STOCK_UNITS = ["Pcs", "Kg", "Gram", "Liter", "Ml", "Yard", "Inch", "Feet"];

const UNIT_FAMILIES = [
  ["Gram", "Kg"],
  ["Ml", "Liter"],
];

const unitKey = (unit) => {
  const key = String(unit || "").trim().toLowerCase();
  return key === "litre" ? "liter" : key;
};

// Units allowed for a stock kept in `stockUnit`; every unit when it's unknown
// (e.g. an item with no stock row yet).
export const getStockUnitChoices = (stockUnit, fallback = STOCK_UNITS) => {
  if (!stockUnit) return fallback;
  return (
    UNIT_FAMILIES.find((family) =>
      family.some((member) => unitKey(member) === unitKey(stockUnit)),
    ) || [stockUnit]
  );
};

export const getStockUnitOptions = (stockUnit, fallback) =>
  getStockUnitChoices(stockUnit, fallback).map((unit) => ({
    value: unit,
    label: unit,
  }));

// The default unit for a new entry against that stock (its small unit).
export const getDefaultStockUnit = (stockUnit) =>
  stockUnit ? getStockUnitChoices(stockUnit)[0] : "Pcs";

// react-select value for `unit`, shown as-is even when it's outside `options`
// so the form never displays one unit while submitting another.
export const findUnitOption = (options, unit) =>
  options.find((option) => option.value === unit) ||
  (unit ? { value: unit, label: unit } : options[0]);

// packagingItemId → the unit its Packaging Item Stock row is kept in.
export const usePackagingItemStockUnits = () => {
  const { data } = useGetAllPackagingItemStockWithoutQueryQuery();
  return useMemo(() => {
    const map = new Map();
    for (const row of data?.data || []) {
      const key = String(row.packagingItemId);
      if (!map.has(key)) map.set(key, row.baseUnit || row.unit);
    }
    return map;
  }, [data?.data]);
};
