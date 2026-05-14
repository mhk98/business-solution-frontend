import { motion } from "framer-motion";
import { Edit, Notebook, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import {
  useDeletePurchaseReturnProductMutation,
  useGetAllPurchaseReturnProductQuery,
  useInsertPurchaseReturnProductMutation,
  useUpdatePurchaseReturnProductMutation,
} from "../../features/purchaseReturnProduct/purchaseReturnProduct";

import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import { useGetSingleProductByIdQuery } from "../../features/product/product";
import { translations } from "../../utils/translations";
import { useLayout } from "../../context/LayoutContext";
import Modal from "../common/Modal";
import { useGetAllInventoryOverviewWithoutQueryQuery } from "../../features/inventoryOverview/inventoryOverview";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const blankIfZero = (value) => (Number(value) === 0 ? "" : value ?? "");

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getUnitPrice = (amount, quantity) => {
  const numericAmount = Number(amount || 0);
  const numericQuantity = Number(quantity || 0);
  if (!numericAmount || !numericQuantity) return 0;
  return numericAmount / numericQuantity;
};

const initialCreateProduct = {
  warehouseId: "",
  supplierId: "",
  productId: "",
  variantRows: [{ size: "", color: "", quantity: "" }],
  quantity: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

const parseVariationValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const getVariationOptions = (product, key) => {
  if (!Array.isArray(product?.variations)) return [];

  return [
    ...new Set(
      product.variations.flatMap((variation) =>
        parseVariationValue(variation?.[key]),
      ),
    ),
  ].map((value) => ({
    value,
    label: value,
  }));
};

const getVariantRowsFromProduct = (product) => {
  if (!Array.isArray(product?.variations)) return [];

  return product.variations.flatMap((variation) => {
    const sizes = parseVariationValue(variation?.size);
    const colors = parseVariationValue(variation?.color);

    if (sizes.length === 0 && colors.length === 0) return [];

    const safeSizes = sizes.length ? sizes : [""];
    const safeColors = colors.length ? colors : [""];

    return safeSizes.flatMap((size) =>
      safeColors.map((color) => ({ size, color, quantity: "" })),
    );
  });
};

const createEmptyVariantRow = () => ({
  size: "",
  color: "",
  quantity: "",
});

const normalizeVariantRows = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((row) => ({
      size: row?.size ? String(row.size) : "",
      color: row?.color ? String(row.color) : "",
      quantity:
        row?.quantity !== undefined && row?.quantity !== null
          ? String(row.quantity)
          : "",
    }));
  }

  return [createEmptyVariantRow()];
};

const getInitialVariantRowsFromRecord = (record) => {
  if (Array.isArray(record?.variants) && record.variants.length > 0) {
    return normalizeVariantRows(record.variants);
  }

  if (typeof record?.variants === "string") {
    try {
      const parsed = JSON.parse(record.variants);
      return normalizeVariantRows(parsed);
    } catch {
      // ignore malformed legacy data
    }
  }

  if (record?.size || record?.color || record?.variationQuantity) {
    return normalizeVariantRows([
      {
        size: record.size,
        color: record.color,
        quantity: record.variationQuantity,
      },
    ]);
  }

  return [createEmptyVariantRow()];
};

const getVariantDisplayRows = (record) => {
  if (Array.isArray(record?.variants)) {
    return record.variants
      .filter((item) => item && (item.size || item.color || item.quantity))
      .map((item) => ({
        size: item?.size ? String(item.size) : "",
        color: item?.color ? String(item.color) : "",
        quantity: Number(item?.quantity) || 0,
        sku: item?.sku ? String(item.sku) : "",
        purchase_price: item?.purchase_price,
        sale_price: item?.sale_price,
      }));
  }

  if (typeof record?.variants === "string") {
    try {
      const parsed = JSON.parse(record.variants);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && (item.size || item.color || item.quantity))
          .map((item) => ({
            size: item?.size ? String(item.size) : "",
            color: item?.color ? String(item.color) : "",
            quantity: Number(item?.quantity) || 0,
            sku: item?.sku ? String(item.sku) : "",
            purchase_price: item?.purchase_price,
            sale_price: item?.sale_price,
          }));
      }
    } catch {
      return [];
    }
  }

  return [];
};

const parseReturnItems = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getReturnRowItems = (record) => {
  const items = parseReturnItems(record?.items);
  return items.length ? items : [record];
};

const getReturnItemsTotalQuantity = (items = []) =>
  items.reduce((total, item) => total + (Number(item?.quantity) || 0), 0);

const getReturnItemsTotalPurchasePrice = (items = []) =>
  items.reduce((total, item) => total + (Number(item?.purchase_price) || 0), 0);

const getReturnItemsTotalSalePrice = (items = []) =>
  items.reduce((total, item) => total + (Number(item?.sale_price) || 0), 0);

const getVariationColorsForSize = (product, size) => {
  if (!size || !Array.isArray(product?.variations)) return [];

  return [
    ...new Set(
      product.variations.flatMap((variation) => {
        const sizes = parseVariationValue(variation?.size);
        if (!sizes.includes(size)) return [];
        return parseVariationValue(variation?.color);
      }),
    ),
  ].map((value) => ({ value, label: value }));
};

const sanitizeSkuSegment = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

const getBaseSku = (record, fallbackSku = "") =>
  record?.sku ||
  record?.productSku ||
  record?.product?.sku ||
  record?.receivedProduct?.sku ||
  fallbackSku ||
  record?.SKU ||
  "";

const getVariantSku = (record, variant, index, fallbackSku = "") => {
  if (variant?.sku) return variant.sku;

  const baseSku = sanitizeSkuSegment(getBaseSku(record, fallbackSku));
  if (!baseSku) return "";

  const sizeSegment = sanitizeSkuSegment(variant?.size);
  const colorSegment = sanitizeSkuSegment(variant?.color);

  return [
    baseSku,
    sizeSegment || `VAR${index + 1}`,
    colorSegment || `ITEM${index + 1}`,
  ].join("-");
};

const getNormalizedVariantsPayload = (rows) =>
  normalizeVariantRows(rows)
    .filter((row) => row.size || row.color || row.quantity)
    .map((row) => ({
      size: row.size || "",
      color: row.color || "",
      quantity: Number(row.quantity) || 0,
    }))
    .filter((row) => row.size);

const getVariantRowsTotalQuantity = (rows) =>
  normalizeVariantRows(rows).reduce(
    (total, row) => total + (Number(row.quantity) || 0),
    0,
  );

const hasConfiguredVariants = (rows) =>
  Array.isArray(rows) &&
  rows.some(
    (row) =>
      row &&
      (String(row.size || "").trim() ||
        String(row.color || "").trim() ||
        String(row.quantity || "").trim()),
  );

const hasDuplicateVariantCombination = (rows) => {
  const seen = new Set();

  for (const row of rows) {
    if (!row.size) continue;
    const key = `${row.size}__${row.color || ""}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }

  return false;
};

const PurchaseReturnProductTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditOpen1, setIsEditOpen1] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const [warehouse, setWarehouse] = useState("");
  const [supplier, setSupplier] = useState("");

  // ✅ UI uses receivedId (ReceivedProduct.Id)
  const [createForm, setCreateForm] = useState(initialCreateProduct);
  const [createItems, setCreateItems] = useState([]);

  const [rows, setRows] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");

  // ✅ all received products (for dropdown)
  const {
    data: receivedRes,
    isLoading: receivedLoading,
    isError: receivedError,
    error: receivedErrObj,
  } = useGetAllInventoryOverviewWithoutQueryQuery();

  const receivedData = receivedRes?.data || [];

  useEffect(() => {
    if (receivedError) console.error("Received fetch error:", receivedErrObj);
  }, [receivedError, receivedErrObj]);

  // ✅ dropdown options -> value = ReceivedProduct.Id
  const receivedDropdownOptions = useMemo(() => {
    return receivedData.map((r) => ({
      value: String(r.Id),
      label: r.name,
    }));
  }, [receivedData]);

  // ✅ react-select light styles (so it looks consistent in light UI)
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0", // indigo-200 / slate-200
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "#fff",
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    singleValue: (base) => ({ ...base, color: "#0f172a" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      zIndex: 40,
    }),
  };

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const perPageOptions = [1, 10, 20, 50, 100];

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);
    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, itemsPerPage, productName]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    const p = Number(pageNumber);
    if (!p || p < 1 || p > totalPages) return;

    setCurrentPage(p);
    const newStart = Math.floor((p - 1) / pagesPerSet) * pagesPerSet + 1;
    setStartPage(newStart);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, Math.max(totalPages - pagesPerSet + 1, 1)),
    );

  // fix endDate if startDate > endDate
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ query
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: productName || undefined,
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, productName]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllPurchaseReturnProductQuery(queryArgs);

  useEffect(() => {
    if (isError) console.error("PurchaseReturn fetch error:", error);
    if (!isLoading && data) {
      setRows(data?.data ?? []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // ✅ Table product name
  const resolveProductName = (rp) => {
    if (rp?.name) return rp.name;

    const productId = rp?.productId || rp?.receivedId;
    if (!productId) return "N/A";

    const match = receivedData.find(
      (r) =>
        Number(r.Id) === Number(productId) ||
        Number(r.id) === Number(productId) ||
        Number(r.productId) === Number(productId) ||
        Number(r.product?.Id) === Number(productId) ||
        Number(r.product?.id) === Number(productId),
    );
    return match?.name || "N/A";
  };

  const resolveReturnItemName = (item) => {
    if (item?.name) return item.name;

    const productId = item?.productId || item?.receivedId;
    if (!productId) return "N/A";

    const match = receivedData.find(
      (r) =>
        Number(r.Id) === Number(productId) ||
        Number(r.id) === Number(productId) ||
        Number(r.productId) === Number(productId) ||
        Number(r.product?.Id) === Number(productId) ||
        Number(r.product?.id) === Number(productId),
    );

    return match?.name || `Product #${productId}`;
  };

  const productSkuMap = useMemo(() => {
    const map = new Map();

    receivedData.forEach((item) => {
      const keys = [
        item?.productId,
        item?.Id,
        item?.id,
        item?.product?.Id,
        item?.product?.id,
      ]
        .filter((key) => key !== undefined && key !== null && key !== "")
        .map((key) => String(key));

      keys.forEach((key) => {
        if (!map.has(key)) {
          map.set(
            key,
            item?.sku || item?.productSku || item?.product?.sku || "",
          );
        }
      });
    });

    return map;
  }, [receivedData]);

  const getSourceRecordForReturnItem = (item) => {
    const productId = item?.productId || item?.receivedId;
    const normalizedName = String(item?.name || "")
      .trim()
      .toLowerCase();

    const nameMatch = normalizedName
      ? receivedData.find(
          (r) => String(r?.name || "").trim().toLowerCase() === normalizedName,
        )
      : null;

    if (nameMatch) return nameMatch;

    const idMatch = productId
      ? receivedData.find(
          (r) =>
            Number(r.Id) === Number(productId) ||
            Number(r.id) === Number(productId) ||
            Number(r.productId) === Number(productId) ||
            Number(r.product?.Id) === Number(productId) ||
            Number(r.product?.id) === Number(productId),
        )
      : null;

    return idMatch || null;
  };

  const pickPositivePrice = (...values) => {
    const matched = values.find((value) => Number(value) > 0);
    return matched ?? 0;
  };

  const getItemUnitPrice = (item, field) => {
    const sourceRecord = getSourceRecordForReturnItem(item);
    const unitField =
      field === "purchase_price" ? "unit_purchase_price" : "unit_sale_price";

    return pickPositivePrice(
      sourceRecord?.[field],
      item?.[unitField],
      getUnitPrice(item?.[field], item?.quantity),
    );
  };

  const getVariantUnitPrice = (item, variant, field) => {
    const sourceRecord = getSourceRecordForReturnItem(item);
    const sourceVariant = getVariantDisplayRows(sourceRecord).find(
      (source) =>
        String(source?.size || "") === String(variant?.size || "") &&
        String(source?.color || "") === String(variant?.color || ""),
    );

    return pickPositivePrice(
      sourceVariant?.[field],
      sourceRecord?.[field],
      variant?.[field],
      getItemUnitPrice(item, field),
    );
  };

  const selectedCreateProductId =
    createForm?.productId || createForm?.receivedId || undefined;
  const selectedEditProductId =
    currentItem?.productId || currentItem?.receivedId || undefined;

  const {
    data: selectedCreateProductRes,
    isFetching: isFetchingCreateProduct,
  } = useGetSingleProductByIdQuery(selectedCreateProductId, {
    skip: !selectedCreateProductId,
  });
  const { data: selectedEditProductRes, isFetching: isFetchingEditProduct } =
    useGetSingleProductByIdQuery(selectedEditProductId, {
      skip: !selectedEditProductId,
    });

  const selectedCreateProductData =
    selectedCreateProductRes?.data || selectedCreateProductRes;
  const selectedEditProductData =
    selectedEditProductRes?.data || selectedEditProductRes;

  const createSizeOptions = useMemo(
    () => getVariationOptions(selectedCreateProductData, "size"),
    [selectedCreateProductData],
  );
  const createColorOptions = useMemo(
    () => getVariationOptions(selectedCreateProductData, "color"),
    [selectedCreateProductData],
  );
  const shouldShowCreateVariantOptions = useMemo(
    () =>
      !isFetchingCreateProduct &&
      getVariantRowsFromProduct(selectedCreateProductData).length > 0,
    [isFetchingCreateProduct, selectedCreateProductData],
  );
  const editSizeOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "size"),
    [selectedEditProductData],
  );
  const editColorOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "color"),
    [selectedEditProductData],
  );
  const shouldShowEditVariantOptions = useMemo(
    () =>
      hasConfiguredVariants(currentItem?.variantRows) ||
      (!isFetchingEditProduct &&
        getVariantRowsFromProduct(selectedEditProductData).length > 0),
    [currentItem?.variantRows, isFetchingEditProduct, selectedEditProductData],
  );
  const currentBulkItems = useMemo(
    () => parseReturnItems(currentItem?.items),
    [currentItem?.items],
  );
  const isEditingBulkReturn = currentBulkItems.length > 0;
  const currentBulkTotalQuantity = useMemo(
    () => getReturnItemsTotalQuantity(currentBulkItems),
    [currentBulkItems],
  );

  const updateVariantRow = (mode, index, key, value) => {
    const setter = mode === "edit" ? setCurrentItem : setCreateForm;

    setter((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).map(
        (row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                [key]: value,
                ...(key === "size" ? { color: "" } : {}),
              }
            : row,
      );

      return {
        ...prev,
        variantRows: nextRows,
        quantity: String(getVariantRowsTotalQuantity(nextRows)),
      };
    });
  };

  const addVariantRow = (mode) => {
    const setter = mode === "edit" ? setCurrentItem : setCreateForm;

    setter((prev) => ({
      ...prev,
      variantRows: [
        ...normalizeVariantRows(prev?.variantRows),
        createEmptyVariantRow(),
      ],
      quantity: String(getVariantRowsTotalQuantity(prev?.variantRows)),
    }));
  };

  const removeVariantRow = (mode, index) => {
    const setter = mode === "edit" ? setCurrentItem : setCreateForm;

    setter((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).filter(
        (_, rowIndex) => rowIndex !== index,
      );

      return {
        ...prev,
        variantRows: nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
        quantity: String(
          getVariantRowsTotalQuantity(
            nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
          ),
        ),
      };
    });
  };

  const updateCurrentBulkItem = (index, key, value) => {
    setCurrentItem((prev) => {
      const nextItems = parseReturnItems(prev?.items).map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      );

      return {
        ...prev,
        items: nextItems,
        quantity: String(getReturnItemsTotalQuantity(nextItems)),
      };
    });
  };

  const updateCurrentBulkItemVariantField = (
    itemIndex,
    variantIndex,
    key,
    value,
  ) => {
    setCurrentItem((prev) => {
      const nextItems = parseReturnItems(prev?.items).map(
        (item, currentItemIndex) => {
          if (currentItemIndex !== itemIndex) return item;

          const nextVariants = (item.variants || []).map(
            (variant, currentVariantIndex) =>
              currentVariantIndex === variantIndex
                ? {
                    ...variant,
                    [key]: key === "quantity" ? Number(value) || 0 : value,
                  }
                : variant,
          );

          return {
            ...item,
            variants: nextVariants,
            quantity: nextVariants.reduce(
              (total, variant) => total + (Number(variant.quantity) || 0),
              0,
            ),
          };
        },
      );

      return {
        ...prev,
        items: nextItems,
        quantity: String(getReturnItemsTotalQuantity(nextItems)),
      };
    });
  };

  // ✅ add/edit handlers
  const openAdd = () => {
    setCreateForm(initialCreateProduct);
    setCreateItems([]);
    setIsAddOpen(true);
  };
  const closeAdd = () => {
    setIsAddOpen(false);
    setCreateForm(initialCreateProduct);
    setCreateItems([]);
  };

  const openEdit = (rp) => {
    const bulkItems = parseReturnItems(rp.items);
    const firstBulkItem = bulkItems[0] || null;
    const variantRows = getInitialVariantRowsFromRecord(firstBulkItem || rp);

    setCurrentItem({
      ...rp,
      items: bulkItems,
      productId: String(
        firstBulkItem?.productId ?? rp.productId ?? rp.receivedId ?? "",
      ),
      receivedId: String(
        firstBulkItem?.receivedId ?? rp.receivedId ?? rp.productId ?? "",
      ),
      note: rp.note ?? "",
      status: rp.status ?? "",
      date: rp.date ?? "",
      userId,
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setCurrentItem(null);
  };

  const openEdit1 = (rp) => {
    const bulkItems = parseReturnItems(rp.items);
    const firstBulkItem = bulkItems[0] || null;
    const variantRows = getInitialVariantRowsFromRecord(firstBulkItem || rp);

    setCurrentItem({
      ...rp,
      items: bulkItems,
      productId: String(
        firstBulkItem?.productId ?? rp.productId ?? rp.receivedId ?? "",
      ),
      receivedId: String(
        firstBulkItem?.receivedId ?? rp.receivedId ?? rp.productId ?? "",
      ),
      note: rp.note ?? "",
      status: rp.status ?? "",
      userId,
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),
    });
    setIsEditOpen1(true);
  };

  const closeEdit1 = () => {
    setIsEditOpen1(false);
    setCurrentItem(null);
  };

  // mutations
  const [insertPurchaseReturn] = useInsertPurchaseReturnProductMutation();
  const [updatePurchaseReturn] = useUpdatePurchaseReturnProductMutation();
  const [deletePurchaseReturn] = useDeletePurchaseReturnProductMutation();

  const buildCreatePayload = () => {
    if (!createForm.productId && !createForm.receivedId)
      return { error: "Please select a product" };
    if (!createForm.quantity || Number(createForm.quantity) <= 0)
      return { error: "Please enter valid quantity" };

    const variantsPayload = getNormalizedVariantsPayload(
      createForm.variantRows,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }

    const productId = String(createForm.receivedId || createForm.productId);
    const selectedProduct = receivedDropdownOptions.find(
      (option) => option.value === productId,
    );

    return {
      payload: {
        receivedId: Number(createForm.receivedId || createForm.productId),
        productId: Number(createForm.productId || createForm.receivedId),
        supplierId: Number(createForm.supplierId),
        warehouseId: Number(createForm.warehouseId),
        quantity: Number(createForm.quantity),
        variants: variantsPayload,
        note: createForm.note,
        date: createForm.date,
      },
      label: selectedProduct?.label || `Product #${productId}`,
    };
  };

  const buildEmptyCreateItem = () => {
    const productId = String(createForm.receivedId || createForm.productId);
    const selectedProduct = receivedDropdownOptions.find(
      (option) => option.value === productId,
    );

    return {
      payload: {
        receivedId: Number(productId),
        productId: Number(productId),
        quantity: "",
        variants: [],
      },
      label: selectedProduct?.label || `Product #${productId}`,
    };
  };

  const resetCreateProductFields = () => {
    setCreateForm((prev) => ({
      ...prev,
      receivedId: "",
      productId: "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
    }));
  };

  const handleAddCreateItem = () => {
    const item = buildCreatePayload();
    if (item.error) return toast.error(item.error);
    setCreateItems((prev) => [...prev, item]);
    resetCreateProductFields();
    toast.success("Product added to list");
  };

  const updateCreateItem = (index, key, value) => {
    setCreateItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              payload: {
                ...item.payload,
                [key]: value,
              },
            }
          : item,
      ),
    );
  };

  const updateCreateItemVariantField = (
    itemIndex,
    variantIndex,
    key,
    value,
  ) => {
    setCreateItems((prev) =>
      prev.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) return item;

        const nextVariants = (item.payload?.variants || []).map(
          (variant, currentVariantIndex) =>
            currentVariantIndex === variantIndex
              ? {
                  ...variant,
                  [key]: key === "quantity" ? Number(value) || 0 : value,
                }
              : variant,
        );

        return {
          ...item,
          payload: {
            ...item.payload,
            variants: nextVariants,
            quantity: nextVariants.reduce(
              (total, variant) => total + (Number(variant.quantity) || 0),
              0,
            ),
          },
        };
      }),
    );
  };

  const preserveCurrentCreateItem = () => {
    if (!createForm.receivedId && !createForm.productId) return;
    if (!createForm.quantity || Number(createForm.quantity) <= 0) return;

    const item = buildCreatePayload();
    if (item.error) return;
    setCreateItems((prev) => [...prev, item]);
    toast.success("Previous product added to list");
  };

  const handleCreateProductSelect = (selected) => {
    preserveCurrentCreateItem();
    setCreateForm((prev) => ({
      ...prev,
      productId: selected?.value || "",
      receivedId: selected?.value || "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
    }));
  };

  useEffect(() => {
    if (!createForm.receivedId || isFetchingCreateProduct) return;
    if (!selectedCreateProductData) return;
    if (shouldShowCreateVariantOptions) return;

    const item = buildEmptyCreateItem();
    setCreateItems((prev) => [...prev, item]);
    resetCreateProductFields();
  }, [
    createForm.receivedId,
    isFetchingCreateProduct,
    selectedCreateProductData,
    shouldShowCreateVariantOptions,
  ]);

  const createItemsTotalQuantity = useMemo(
    () =>
      createItems.reduce(
        (total, item) => total + (Number(item.payload?.quantity) || 0),
        0,
      ),
    [createItems],
  );

  // ✅ create (send receivedId)
  const handleCreate = async (e) => {
    e.preventDefault();

    const commonFields = {
      supplierId: Number(createForm.supplierId) || "",
      warehouseId: Number(createForm.warehouseId) || "",
      note: createForm.note || "",
      date: createForm.date || "",
      userId,
    };

    let items = createItems.map((item) => ({
      ...item.payload,
      ...commonFields,
    }));
    if (createForm.receivedId || createForm.productId) {
      const item = buildCreatePayload();
      if (item.error) return toast.error(item.error);
      items = [
        ...items,
        {
          ...item.payload,
          ...commonFields,
        },
      ];
    }

    if (items.length === 0) {
      return toast.error("Please add at least one product");
    }
    if (items.some((item) => Number(item.quantity) <= 0)) {
      return toast.error("Please enter quantity for every product");
    }

    try {
      const payload =
        items.length === 1 ? items[0] : { ...commonFields, items };
      const res = await insertPurchaseReturn(payload).unwrap();
      if (res?.success) {
        toast.success(
          items.length > 1 ? "Products created!" : "Successfully created!",
        );
        closeAdd();
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // ✅ update
  const handleUpdate = async () => {
    if (!currentItem?.Id) return toast.error("Invalid item");
    const bulkItems = parseReturnItems(currentItem?.items);
    if (
      !bulkItems.length &&
      !currentItem?.receivedId &&
      !currentItem?.productId
    )
      return toast.error("Please select a product");
    if (
      bulkItems.length
        ? bulkItems.some((item) => Number(item.quantity) <= 0)
        : !currentItem.quantity || Number(currentItem.quantity) <= 0
    )
      return toast.error("Please enter valid quantity");

    const variantsPayload = getNormalizedVariantsPayload(
      currentItem?.variantRows,
    );
    if (!bulkItems.length && hasDuplicateVariantCombination(variantsPayload)) {
      return toast.error("Duplicate size and color combination found");
    }

    try {
      const payload =
        bulkItems.length > 0
          ? {
              items: bulkItems,
              note: currentItem.note,
              status: currentItem.status,
              date: currentItem.date,
              supplierId: Number(currentItem.supplierId),
              warehouseId: Number(currentItem.warehouseId),
              userId,
              actorRole: role,
            }
          : {
              note: currentItem.note,
              status: currentItem.status,
              date: currentItem.date,
              quantity: Number(currentItem.quantity),
              variants: variantsPayload,
              receivedId: Number(
                currentItem.receivedId || currentItem.productId,
              ),
              productId: Number(
                currentItem.productId || currentItem.receivedId,
              ),
              supplierId: Number(currentItem.supplierId),
              warehouseId: Number(currentItem.warehouseId),
              userId: userId,
              actorRole: role,
            };

      const res = await updatePurchaseReturn({
        id: currentItem.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        closeEdit();
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdate1 = async () => {
    if (!currentItem?.Id) return toast.error("Invalid item");
    const bulkItems = parseReturnItems(currentItem?.items);
    if (
      !bulkItems.length &&
      !currentItem?.receivedId &&
      !currentItem?.productId
    )
      return toast.error("Please select a product");

    try {
      const payload =
        bulkItems.length > 0
          ? {
              items: bulkItems,
              note: currentItem.note,
              status: currentItem.status,
              supplierId: Number(currentItem.supplierId),
              warehouseId: Number(currentItem.warehouseId),
              userId,
              actorRole: role,
            }
          : {
              note: currentItem.note,
              status: currentItem.status,
              quantity: Number(currentItem.quantity || 0),
              receivedId: Number(
                currentItem.receivedId || currentItem.productId,
              ),
              productId: Number(
                currentItem.productId || currentItem.receivedId,
              ),
              userId: userId,
              actorRole: role,
            };

      const res = await updatePurchaseReturn({
        id: currentItem.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        closeEdit1();
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // delete
  const handleDelete = async (id) => {
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this item?",
      }))
    )
      return;

    try {
      const res = await deletePurchaseReturn(id).unwrap();
      if (res?.success !== false) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // filters clear
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductName("");
  };

  // ✅ suppliers
  const {
    data: allSupplierRes,
    isLoading: isLoadingSupplier,
    isError: isErrorSupplier,
    error: errorSupplier,
  } = useGetAllSupplierWithoutQueryQuery();
  const suppliers = allSupplierRes?.data || [];

  useEffect(() => {
    if (isErrorSupplier)
      console.error("Error fetching suppliers", errorSupplier);
  }, [isErrorSupplier, errorSupplier]);

  // ✅ Dropdown options

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((w) => ({
        value: w.Id,
        label: w.name,
      })),
    [suppliers],
  );

  // ✅ warehouses
  const {
    data: allWarehousesRes,
    isLoading: isLoadingWarehouse,
    isError: isErrorWarehouse,
    error: errorWarehouse,
  } = useGetAllWirehouseWithoutQueryQuery();
  const warehouses = allWarehousesRes?.data || [];

  useEffect(() => {
    if (isErrorWarehouse)
      console.error("Error fetching warehouses", errorWarehouse);
  }, [isErrorWarehouse, errorWarehouse]);

  const warehouseOptions = useMemo(
    () =>
      (warehouses || []).map((w) => ({
        value: w.Id,
        label: w.name,
      })),
    [warehouses],
  );

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="my-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Add <Plus size={18} className="ml-2" />
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <RotateCcw size={18} className="text-amber-500" />
            <span className="text-sm">Total Purchase Return</span>
          </div>
          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end w-full">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        {/* Per Page */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <Select
            options={perPageOptions.map((v) => ({
              value: v,
              label: String(v),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => {
              setItemsPerPage(selected?.value || 10);
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="text-black"
            styles={selectStyles}
          />
        </div>

        {/* Product */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Product</label>
          <Select
            options={receivedDropdownOptions}
            value={
              receivedDropdownOptions.find((o) => o.label === productName) ||
              null
            }
            onChange={(selected) => setProductName(selected?.label || "")}
            placeholder={receivedLoading ? "Loading..." : "Select Product"}
            isClearable
            className="text-black"
            isDisabled={receivedLoading}
            styles={selectStyles}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Warehouse</label>
          <Select
            options={warehouseOptions}
            value={
              warehouseOptions.find(
                (o) => String(o.value) === String(warehouse),
              ) || null
            }
            onChange={(selected) => setWarehouse(selected?.value || "")}
            placeholder="Select Warehouse"
            isClearable
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Supplier</label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (o) => String(o.value) === String(supplier),
              ) || null
            }
            onChange={(selected) => setSupplier(selected?.value || "")}
            placeholder="Select Supplier"
            isClearable
            className="text-black"
          />
        </div>

        <button
          type="button"
          className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-6 rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Supplier
              </th>{" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Variants
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Financials
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((rp) => {
              const rowItems = getReturnRowItems(rp);
              const rowTotalQuantity = getReturnItemsTotalQuantity(rowItems);
              const itemVariantGroups = rowItems.map((item) => ({
                item,
                variants: getVariantDisplayRows(item),
              }));
              const hasDisplayItems = itemVariantGroups.some(
                ({ variants }) => variants.length > 0,
              );
              const totalBuy = itemVariantGroups.reduce(
                (total, { item, variants }) => {
                  if (variants.length > 0) {
                    return (
                      total +
                      variants.reduce(
                        (variantTotal, variant) =>
                          variantTotal +
                          getVariantUnitPrice(
                            item,
                            variant,
                            "purchase_price",
                          ) *
                            Number(variant.quantity || 0),
                        0,
                      )
                    );
                  }

                  return (
                    total +
                    getItemUnitPrice(item, "purchase_price") *
                      Number(item.quantity || 0)
                  );
                },
                0,
              );
              const totalSell = itemVariantGroups.reduce(
                (total, { item, variants }) => {
                  if (variants.length > 0) {
                    return (
                      total +
                      variants.reduce(
                        (variantTotal, variant) =>
                          variantTotal +
                          getVariantUnitPrice(item, variant, "sale_price") *
                            Number(variant.quantity || 0),
                        0,
                      )
                    );
                  }

                  return (
                    total +
                    getItemUnitPrice(item, "sale_price") *
                      Number(item.quantity || 0)
                  );
                },
                0,
              );
              const fallbackSku =
                productSkuMap.get(
                  String(
                    rp?.productId ??
                      rp?.receivedId ??
                      rp?.product?.Id ??
                      rp?.product?.id ??
                      "",
                  ),
                ) || "";

              return (
                <motion.tr
                  key={rp.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {rp.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                    {rowItems
                      .map((item) => resolveReturnItemName(item))
                      .filter(Boolean)
                      .join(", ") || resolveProductName(rp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp?.supplier?.name || "-"}
                  </td>{" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp?.warehouse?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rowTotalQuantity || rp.quantity || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 min-w-[260px]">
                    {hasDisplayItems || rowItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {itemVariantGroups.flatMap(
                          ({ item, variants }, itemIndex) => {
                            const fallbackUnitPurchase = getItemUnitPrice(
                              item,
                              "purchase_price",
                            );
                            const fallbackUnitSale = getItemUnitPrice(
                              item,
                              "sale_price",
                            );

                            if (variants.length === 0) {
                              return [
                                <div
                                  key={`${rp.Id}-no-variant-${itemIndex}`}
                                  className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 shadow-sm min-w-[132px]"
                                >
                                  <div className="text-[11px] font-bold text-slate-700">
                                    {resolveReturnItemName(item)}
                                  </div>
                                  <div className="mt-2 text-[11px] font-medium text-slate-500">
                                    Qty{" "}
                                    <span className="text-slate-900 font-bold">
                                      {Number(item.quantity || 0).toFixed(0)}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Unit Buy {formatMoney(fallbackUnitPurchase)}
                                  </div>
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Unit Sell {formatMoney(fallbackUnitSale)}
                                  </div>
                                  <div className="mt-2 text-[10px] font-semibold text-slate-400">
                                    No variants
                                  </div>
                                </div>,
                              ];
                            }

                            return variants.map((variant, variantIndex) => {
                              const unitPurchase = getVariantUnitPrice(
                                item,
                                variant,
                                "purchase_price",
                              );
                              const unitSale = getVariantUnitPrice(
                                item,
                                variant,
                                "sale_price",
                              );
                              const skuIndex =
                                itemVariantGroups
                                  .slice(0, itemIndex)
                                  .reduce(
                                    (count, group) =>
                                      count + group.variants.length,
                                    0,
                                  ) + variantIndex;

                              return (
                                <div
                                  key={`${rp.Id}-variant-${itemIndex}-${variantIndex}`}
                                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3 py-2 shadow-sm min-w-[132px]"
                                >
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                                      {variant.size || "N/A"}
                                    </span>
                                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-700">
                                      {variant.color || "N/A"}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-[11px] font-medium text-slate-500">
                                    Qty{" "}
                                    <span className="text-slate-900 font-bold">
                                      {Number(variant.quantity || 0).toFixed(0)}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Unit Buy {formatMoney(unitPurchase)}
                                  </div>
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Unit Sell {formatMoney(unitSale)}
                                  </div>
                                  {getVariantSku(
                                    rp,
                                    variant,
                                    skuIndex,
                                    fallbackSku,
                                  ) ? (
                                    <div className="mt-2 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 border border-indigo-100 break-all leading-relaxed">
                                      SKU:{" "}
                                      {getVariantSku(
                                        rp,
                                        variant,
                                        skuIndex,
                                        fallbackSku,
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            });
                          },
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                        No variants
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        Total Buy:{" "}
                        <span className="text-slate-900 border-b border-dotted border-slate-300">
                          {formatMoney(totalBuy)}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        Total Sell:{" "}
                        <span className="text-emerald-600">
                          {formatMoney(totalSell)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                        rp.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : rp.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200" // New color for Active
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {rp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {rp.note ? (
                        <div className="relative">
                          <button
                            className="relative h-10 w-10 rounded-md flex items-center justify-center"
                            title={rp.note}
                            type="button"
                            onClick={() => handleNoteClick(rp.note)} // Open modal on click
                          >
                            <Notebook size={18} className="text-slate-700" />
                          </button>

                          <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                            {rp.note ? 1 : null}
                          </span>
                        </div>
                      ) : (
                        <button
                          className="h-10 w-10 rounded-md flex items-center justify-center"
                          title={rp.note}
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEdit(rp)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                        title="Edit"
                      >
                        <Edit size={18} className="text-indigo-600" />
                      </button>

                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(rp.Id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEdit1(rp)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                          title="Request Delete"
                        >
                          <Trash2 size={18} className="text-amber-600" />
                        </button>
                      )}
                    </div>
                  </td>
                  {/* ✅ Note Modal (Popup) */}
                  {isNoteModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                      <div className="bg-white rounded-lg p-6 shadow-xl w-full md:w-1/3">
                        <h2 className="text-xl font-semibold text-slate-900">
                          Note
                        </h2>
                        <p className="mt-4 text-sm text-slate-700">
                          {noteContent}
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                          <button
                            onClick={handleNoteModalClose}
                            className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.tr>
              );
            })}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
          type="button"
        >
          Prev
        </button>

        {[...Array(endPage - startPage + 1)].map((_, index) => {
          const pageNum = startPage + index;
          const active = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              type="button"
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={handleNextSet}
          disabled={endPage === totalPages}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
          type="button"
        >
          Next
        </button>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen && !!currentItem}
        onClose={closeEdit}
        title="Edit Product"
        maxWidth="max-w-4xl"
      >
        {currentItem && (
          <>
            {/* <div className="mt-4">
              <label className="block text-sm text-slate-700">Product</label>
              <Select
                options={receivedDropdownOptions}
                value={
                  receivedDropdownOptions.find(
                    (o) => o.value === String(currentItem.receivedId),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem((p) => ({
                    ...p,
                    receivedId: selected?.value || "",
                  }))
                }
                placeholder={receivedLoading ? "Loading..." : "Select Product"}
                isClearable
                className="text-black"
                isDisabled={receivedLoading}
                styles={selectStyles}
              />
            </div> */}

            {isEditingBulkReturn && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Product List
                    </p>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Quantity
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {currentBulkTotalQuantity}
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-[680px] w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-3 text-left">Product</th>
                        <th className="px-3 py-3 text-left">Quantity</th>
                        <th className="px-3 py-3 text-left">Variant Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentBulkItems.map((item, index) => (
                        <tr
                          key={`edit-return-${item.productId || item.name}-${index}`}
                        >
                          <td className="px-3 py-3 align-top font-semibold text-slate-800">
                            {item.name || `Product #${item.productId || "-"}`}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {item.variants?.length ? (
                              <p className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-900">
                                {Number(item.quantity || 0)}
                              </p>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity ?? ""}
                                onChange={(e) =>
                                  updateCurrentBulkItem(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-500">
                            {item.variants?.length
                              ? item.variants.map((variant, variantIndex) => (
                                  <div
                                    key={`${variant.size}-${variant.color}-${variantIndex}`}
                                    className="mb-2 grid grid-cols-[1fr_90px] items-end gap-2 last:mb-0"
                                  >
                                    <span className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                      {variant.size || "-"} /{" "}
                                      {variant.color || "-"}
                                    </span>
                                    <div>
                                      {variantIndex === 0 && (
                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                          Qty
                                        </p>
                                      )}
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={variant.quantity}
                                        onChange={(e) =>
                                          updateCurrentBulkItemVariantField(
                                            index,
                                            variantIndex,
                                            "quantity",
                                            e.target.value,
                                          )
                                        }
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                      />
                                    </div>
                                  </div>
                                ))
                              : "No variants"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={isEditingBulkReturn ? "hidden" : ""}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.select_product || "Select Product"}
              </label>
              <Select
                options={receivedDropdownOptions}
                value={
                  receivedDropdownOptions.find(
                    (o) => o.value === String(currentItem?.receivedId),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem({
                    ...currentItem,
                    productId: selected?.value || "",
                    receivedId: selected?.value || "",
                    variantRows: [createEmptyVariantRow()],
                    quantity: "",
                  })
                }
                placeholder={t.search_product || "Search product..."}
                isClearable
                styles={selectStyles}
                className="text-sm font-medium"
                isDisabled={receivedLoading}
              />
            </div>

            {!isEditingBulkReturn && shouldShowEditVariantOptions && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Product Variants
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Add size, color and quantity combinations
                    </p>
                  </div>
                </div>
                <div className="sticky top-0 z-20 -mx-4 flex justify-end bg-slate-50/95 px-4 py-2 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => addVariantRow("edit")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    disabled={!currentItem?.receivedId}
                  >
                    <Plus size={14} />
                    Add Variant
                  </button>
                </div>

                {normalizeVariantRows(currentItem?.variantRows).map(
                  (row, index) => {
                    const colorOptions = row.size
                      ? getVariationColorsForSize(
                          selectedEditProductData,
                          row.size,
                        )
                      : editColorOptions;

                    return (
                      <div
                        key={`edit-variant-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end"
                      >
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Size / Code
                          </label>
                          <Select
                            options={editSizeOptions}
                            value={
                              editSizeOptions.find(
                                (option) => option.value === row.size,
                              ) || null
                            }
                            onChange={(selected) =>
                              updateVariantRow(
                                "edit",
                                index,
                                "size",
                                selected?.value || "",
                              )
                            }
                            placeholder="Select size..."
                            isClearable
                            styles={selectStyles}
                            className="text-sm font-medium"
                            isDisabled={
                              !currentItem?.receivedId ||
                              editSizeOptions.length === 0
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Color
                          </label>
                          <Select
                            options={colorOptions}
                            value={
                              colorOptions.find(
                                (option) => option.value === row.color,
                              ) || null
                            }
                            onChange={(selected) =>
                              updateVariantRow(
                                "edit",
                                index,
                                "color",
                                selected?.value || "",
                              )
                            }
                            placeholder="Select color..."
                            isClearable
                            styles={selectStyles}
                            className="text-sm font-medium"
                            isDisabled={!row.size || colorOptions.length === 0}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.quantity}
                            onChange={(e) =>
                              updateVariantRow(
                                "edit",
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            disabled={
                              !currentItem?.receivedId ||
                              editSizeOptions.length === 0
                            }
                            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder=""
                          />
                          {selectedCreateInventoryItem && row.size && (() => {
                            const match = getVariantDisplayRows(selectedCreateInventoryItem).find(
                              (v) => String(v.size || "") === String(row.size || "") && String(v.color || "") === String(row.color || ""),
                            );
                            return match !== undefined ? (
                              <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(match.quantity || 0)}</p>
                            ) : null;
                          })()}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeVariantRow("edit", index)}
                          className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                          disabled={
                            normalizeVariantRows(currentItem?.variantRows)
                              .length === 1
                          }
                        >
                          <X size={16} className="mx-auto" />
                        </button>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Date</label>
              <input
                type="date"
                value={currentItem?.date || ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, date: e.target.value }))
                }
                className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Warehouse</label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentItem?.warehouseId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem({
                    ...currentItem,
                    warehouseId: selected?.value || "",
                  })
                }
                placeholder={
                  isLoadingWarehouse ? "Loading..." : "Select Warehouse"
                }
                isClearable
                styles={selectStyles}
                className="text-black mt-1"
                isDisabled={isLoadingWarehouse}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Supplier</label>
              <Select
                options={supplierOptions}
                value={
                  supplierOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentItem?.supplierId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem({
                    ...currentItem,
                    supplierId: selected?.value || "",
                  })
                }
                placeholder={
                  isLoadingSupplier ? "Loading..." : "Select Supplier"
                }
                isClearable
                styles={selectStyles}
                className="text-black mt-1"
                isDisabled={isLoadingSupplier}
              />
            </div>

            {!isEditingBulkReturn && (
              <div className="mt-4">
                <label className="block text-sm text-slate-700">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.quantity ?? ""}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, quantity: e.target.value }))
                  }
                  readOnly={hasConfiguredVariants(currentItem?.variantRows)}
                  className={`h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 outline-none ${
                    hasConfiguredVariants(currentItem?.variantRows)
                      ? "bg-slate-50"
                      : "bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  }`}
                />
              </div>
            )}

            {role === "superAdmin" || role === "admin" ? (
              <div className="mt-4">
                <label className="block text-sm text-slate-700">Status</label>
                <Select
                  options={["Active", "Approved", "Pending"].map((status) => ({
                    value: status,
                    label: status,
                  }))}
                  value={
                    currentItem?.status
                      ? {
                          value: currentItem.status,
                          label: currentItem.status,
                        }
                      : null
                  }
                  onChange={(selected) =>
                    setCurrentItem((p) => ({
                      ...p,
                      status: selected?.value || "",
                    }))
                  }
                  placeholder="Select Status"
                  styles={selectStyles}
                  className="text-black mt-1"
                />
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-sm text-slate-700">Note</label>
                <textarea
                  value={currentItem?.note || ""}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, note: e.target.value }))
                  }
                  className="min-h-[90px] border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl"
                onClick={handleUpdate}
                type="button"
              >
                Save
              </button>
              <button
                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200"
                onClick={closeEdit}
                type="button"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Note / Delete Request Modal */}
      <Modal
        isOpen={isEditOpen1 && !!currentItem}
        onClose={closeEdit1}
        title="Note"
        maxWidth="max-w-lg"
      >
        {currentItem && (
          <>
            <div className="mt-4">
              <label className="block text-sm text-slate-700">Note</label>
              <textarea
                value={currentItem?.note || ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, note: e.target.value }))
                }
                className="min-h-[110px] border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none
                         focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl"
                onClick={handleUpdate1}
                type="button"
              >
                Save
              </button>
              <button
                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200"
                onClick={closeEdit1}
                type="button"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        isOpen={isAddOpen}
        onClose={closeAdd}
        title="Add New Purchase"
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={handleCreate}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={receivedDropdownOptions}
              value={
                receivedDropdownOptions.find(
                  (o) => o.value === String(createForm.receivedId),
                ) || null
              }
              onChange={handleCreateProductSelect}
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={receivedLoading}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product Line Items
                </p>
                <p className="text-[11px] text-slate-400">
                  Select products above, then set return quantity here
                </p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Quantity
                </p>
                <p className="text-lg font-black text-slate-900">
                  {blankIfZero(createItemsTotalQuantity)}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-[680px] w-full text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left">Product</th>
                    <th className="px-3 py-3 text-left">Quantity</th>
                    <th className="px-3 py-3 text-left">Variant Detail</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {createItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-sm text-slate-400"
                      >
                        No products added
                      </td>
                    </tr>
                  ) : (
                    createItems.map((item, index) => (
                      <tr key={`${item.label}-${index}`}>
                        <td className="px-3 py-3 align-top font-semibold text-slate-800">
                          {item.label}
                        </td>
                        <td className="px-3 py-3 align-top">
                          {item.payload.variants?.length ? (
                            <p className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-900">
                              {blankIfZero(item.payload.quantity)}
                            </p>
                          ) : (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={blankIfZero(item.payload.quantity)}
                                onChange={(e) =>
                                  updateCreateItem(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                              />
                              {(() => {
                                const invItem = receivedData.find((r) => Number(r.Id) === Number(item.payload?.receivedId || item.payload?.productId));
                                return invItem ? (
                                  <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(invItem.quantity || 0)}</p>
                                ) : null;
                              })()}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500">
                          {item.payload.variants?.length
                            ? item.payload.variants.map(
                                (variant, variantIndex) => (
                                  <div
                                    key={`${variant.size}-${variant.color}-${variantIndex}`}
                                    className="mb-2 grid grid-cols-[1fr_90px] items-end gap-2 last:mb-0"
                                  >
                                    <span className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                      {variant.size || "-"} /{" "}
                                      {variant.color || "-"}
                                    </span>
                                    <div>
                                      {variantIndex === 0 && (
                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                          Qty
                                        </p>
                                      )}
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={variant.quantity}
                                        onChange={(e) =>
                                          updateCreateItemVariantField(
                                            index,
                                            variantIndex,
                                            "quantity",
                                            e.target.value,
                                          )
                                        }
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                      />
                                      {(() => {
                                        const invItem = receivedData.find((r) => Number(r.Id) === Number(item.payload?.receivedId || item.payload?.productId));
                                        if (!invItem) return null;
                                        const match = getVariantDisplayRows(invItem).find(
                                          (v) => String(v.size || "") === String(variant.size || "") && String(v.color || "") === String(variant.color || ""),
                                        );
                                        return match !== undefined ? (
                                          <p className="mt-0.5 text-[10px] text-slate-400">Stock: {Number(match.quantity || 0)}</p>
                                        ) : null;
                                      })()}
                                    </div>
                                  </div>
                                ),
                              )
                            : "No variants"}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() =>
                              setCreateItems((prev) =>
                                prev.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {shouldShowCreateVariantOptions && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Product Variants
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Add size, color and quantity combinations
                  </p>
                </div>
              </div>
              <div className="sticky top-0 z-20 -mx-4 flex justify-end bg-slate-50/95 px-4 py-2 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => addVariantRow("create")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  disabled={!createForm?.receivedId}
                >
                  <Plus size={14} />
                  Add Variant
                </button>
              </div>

              {normalizeVariantRows(createForm?.variantRows).map(
                (row, index) => {
                  const colorOptions = row.size
                    ? getVariationColorsForSize(
                        selectedCreateProductData,
                        row.size,
                      )
                    : createColorOptions;

                  return (
                    <div
                      key={`create-variant-${index}`}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Size / Code
                        </label>
                        <Select
                          options={createSizeOptions}
                          value={
                            createSizeOptions.find(
                              (option) => option.value === row.size,
                            ) || null
                          }
                          onChange={(selected) =>
                            updateVariantRow(
                              "create",
                              index,
                              "size",
                              selected?.value || "",
                            )
                          }
                          placeholder="Select size..."
                          isClearable
                          styles={selectStyles}
                          className="text-sm text-black font-medium"
                          isDisabled={
                            !createForm?.receivedId ||
                            createSizeOptions.length === 0
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Color
                        </label>
                        <Select
                          options={colorOptions}
                          value={
                            colorOptions.find(
                              (option) => option.value === row.color,
                            ) || null
                          }
                          onChange={(selected) =>
                            updateVariantRow(
                              "create",
                              index,
                              "color",
                              selected?.value || "",
                            )
                          }
                          placeholder="Select color..."
                          isClearable
                          styles={selectStyles}
                          className="text-sm text-black font-medium"
                          isDisabled={!row.size || colorOptions.length === 0}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity}
                          onChange={(e) =>
                            updateVariantRow(
                              "create",
                              index,
                              "quantity",
                              e.target.value,
                            )
                          }
                          disabled={
                            !createForm?.receivedId ||
                            createSizeOptions.length === 0
                          }
                          className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          placeholder=""
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeVariantRow("create", index)}
                        className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                        disabled={
                          normalizeVariantRows(createForm?.variantRows)
                            .length === 1
                        }
                      >
                        <X size={16} className="mx-auto" />
                      </button>
                    </div>
                  );
                },
              )}
              <div className="flex justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={handleAddCreateItem}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
                >
                  <Plus size={16} />
                  Add Variants
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={createForm?.date || ""}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Warehouse
              </label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createForm?.warehouseId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    warehouseId: selected?.value || "",
                  }))
                }
                placeholder={
                  isLoadingWarehouse ? "Loading..." : "Select Warehouse"
                }
                isClearable
                styles={selectStyles}
                className="text-black"
                isDisabled={isLoadingWarehouse}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Supplier
            </label>
            <Select
              options={supplierOptions}
              value={
                supplierOptions.find(
                  (option) =>
                    String(option.value) ===
                    String(createForm?.supplierId || ""),
                ) || null
              }
              onChange={(selected) =>
                setCreateForm((prev) => ({
                  ...prev,
                  supplierId: selected?.value || "",
                }))
              }
              placeholder={isLoadingSupplier ? "Loading..." : "Select Supplier"}
              isClearable
              styles={selectStyles}
              className="text-black"
              isDisabled={isLoadingSupplier}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Note
            </label>
            <textarea
              value={createForm?.note || ""}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  note: e.target.value,
                }))
              }
              className="w-full min-h-[100px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
              onClick={closeAdd}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              {createItems.length > 0 ? "Save Products" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default PurchaseReturnProductTable;
