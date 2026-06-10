import { motion } from "framer-motion";
import { Edit, Notebook, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  useDeleteInTransitProductMutation,
  useGetAllInTransitProductQuery,
  useInsertInTransitProductMutation,
  useUpdateInTransitProductMutation,
} from "../../features/inTransitProduct/inTransitProduct";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import Modal from "../common/Modal";
import { useGetAllInventoryOverviewWithoutQueryQuery } from "../../features/inventoryOverview/inventoryOverview";

const initialCreateForm = {
  warehouseId: "",
  receivedId: "",
  productId: "",
  variantRows: [{ size: "", color: "", quantity: "" }],
  quantity: "",
  sale_price: "",
  purchase_price: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

const initialBulkAddForm = {
  receivedId: "",
  productId: "",
  variantRows: [{ size: "", color: "", quantity: "" }],
  quantity: "",
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-US", {
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
    return record.variants.filter(
      (item) => item && (item.size || item.color || item.quantity),
    );
  }

  if (typeof record?.variants === "string") {
    try {
      const parsed = JSON.parse(record.variants);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => item && (item.size || item.color || item.quantity),
        );
      }
    } catch {
      return [];
    }
  }

  return [];
};

const getInventoryVariantSizeOptions = (inventoryItem) => {
  const variants = getVariantDisplayRows(inventoryItem);
  return [...new Set(variants.map((v) => v.size).filter(Boolean))].map((v) => ({ value: v, label: v }));
};

const getInventoryVariantColorOptions = (inventoryItem) => {
  const variants = getVariantDisplayRows(inventoryItem);
  return [...new Set(variants.map((v) => v.color).filter(Boolean))].map((v) => ({ value: v, label: v }));
};

const getInventoryVariantColorsForSize = (inventoryItem, size) => {
  if (!size) return [];
  return getVariantDisplayRows(inventoryItem)
    .filter((v) => String(v.size || "") === String(size))
    .map((v) => v.color)
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map((v) => ({ value: v, label: v }));
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

const toDateInputValue = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
};

const makeSelectValue = (options, value, fallbackLabel) => {
  if (value === undefined || value === null || value === "") return null;

  const stringValue = String(value);
  return (
    options.find((option) => String(option.value) === stringValue) || {
      value: stringValue,
      label: fallbackLabel || stringValue,
    }
  );
};

const createBatchId = () =>
  `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const parseTransitItems = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getTransitRowItems = (row) => {
  const items = parseTransitItems(row?.items);
  return items.length ? items : [row];
};

const getTransitItemQuantity = (item = {}) => {
  const directQuantity = Number(item?.quantity || 0);
  if (directQuantity > 0) return directQuantity;
  return getVariantRowsTotalQuantity(item?.variants);
};

const getTransitItemsTotalQuantity = (items = []) =>
  items.reduce((total, item) => total + getTransitItemQuantity(item), 0);

const IntransiteProductTable = () => {
  const role = localStorage.getItem("role");
  const canUpdateStatus = ["superAdmin", "admin", "accountant"].includes(role);
  const userId = localStorage.getItem("userId");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditOpen1, setIsEditOpen1] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const [warehouse, setWarehouse] = useState("");
  // ✅ UI uses receivedId (ReceivedProduct.Id)
  const [createForm, setCreateForm] = useState({
    ...initialCreateForm,
  });
  const [createItems, setCreateItems] = useState([]);
  const [bulkAddForm, setBulkAddForm] = useState(initialBulkAddForm);

  const [rows, setRows] = useState([]);

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const selectedCreateInventoryItem = useMemo(
    () => receivedData.find((r) => String(r.Id) === String(createForm?.receivedId)),
    [receivedData, createForm?.receivedId],
  );
  const selectedBulkAddInventoryItem = useMemo(
    () =>
      receivedData.find((r) => String(r.Id) === String(bulkAddForm?.receivedId)),
    [receivedData, bulkAddForm?.receivedId],
  );

  const selectedEditInventoryItem = useMemo(
    () => receivedData.find((r) => String(r.Id) === String(currentItem?.receivedId || currentItem?.productId || "")),
    [receivedData, currentItem?.receivedId, currentItem?.productId],
  );

  const createSizeOptions = useMemo(
    () => getInventoryVariantSizeOptions(selectedCreateInventoryItem),
    [selectedCreateInventoryItem],
  );
  const createColorOptions = useMemo(
    () => getInventoryVariantColorOptions(selectedCreateInventoryItem),
    [selectedCreateInventoryItem],
  );
  const shouldShowCreateVariantOptions = useMemo(
    () => getVariantDisplayRows(selectedCreateInventoryItem).length > 0,
    [selectedCreateInventoryItem],
  );
  const createItemsTotalQuantity = useMemo(
    () =>
      createItems.reduce(
        (total, item) => total + (Number(item?.payload?.quantity) || 0),
        0,
      ),
    [createItems],
  );

  const createItemsTotalPurchase = useMemo(
    () => createItems.reduce((total, item) => total + (Number(item?.payload?.purchase_price) || 0), 0),
    [createItems],
  );
  const createItemsTotalSale = useMemo(
    () => createItems.reduce((total, item) => total + (Number(item?.payload?.sale_price) || 0), 0),
    [createItems],
  );
  const editSizeOptions = useMemo(
    () => getInventoryVariantSizeOptions(selectedEditInventoryItem),
    [selectedEditInventoryItem],
  );
  const editColorOptions = useMemo(
    () => getInventoryVariantColorOptions(selectedEditInventoryItem),
    [selectedEditInventoryItem],
  );
  const bulkAddSizeOptions = useMemo(
    () => getInventoryVariantSizeOptions(selectedBulkAddInventoryItem),
    [selectedBulkAddInventoryItem],
  );
  const bulkAddColorOptions = useMemo(
    () => getInventoryVariantColorOptions(selectedBulkAddInventoryItem),
    [selectedBulkAddInventoryItem],
  );
  const shouldShowEditVariantOptions = useMemo(
    () =>
      hasConfiguredVariants(currentItem?.variantRows) ||
      getVariantDisplayRows(selectedEditInventoryItem).length > 0,
    [currentItem?.variantRows, selectedEditInventoryItem],
  );
  const shouldShowBulkAddVariantOptions = useMemo(
    () => getVariantDisplayRows(selectedBulkAddInventoryItem).length > 0,
    [selectedBulkAddInventoryItem],
  );

  // ✅ react-select light styles
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
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

  // ✅ responsive pagesPerSet
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // reset page when filters or per-page limit change
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, productName, itemsPerPage]);

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
    useGetAllInTransitProductQuery(queryArgs);

  useEffect(() => {
    if (isError) console.error("InTransit fetch error:", error);
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

    const productId = rp?.productId;
    if (!productId) return "N/A";

    const match = receivedData.find(
      (r) => Number(r.productId) === Number(productId),
    );
    return match?.name || "N/A";
  };

  const getSourceRecordForTransitItem = (item) => {
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
    const sourceRecord = getSourceRecordForTransitItem(item);

    return pickPositivePrice(
      sourceRecord?.[field],
      getUnitPrice(item?.[field], item?.quantity),
      item?.[field],
    );
  };

  const getVariantUnitPrice = (item, variant, field) => {
    const sourceRecord = getSourceRecordForTransitItem(item);
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

  const getItemStockQuantity = (item) =>
    Number(getSourceRecordForTransitItem(item)?.quantity || 0);

  const getVariantStockQuantity = (item, variant) => {
    const sourceRecord = getSourceRecordForTransitItem(item);
    const sourceVariant = getVariantDisplayRows(sourceRecord).find(
      (source) =>
        String(source?.size || "") === String(variant?.size || "") &&
        String(source?.color || "") === String(variant?.color || ""),
    );

    return Number(sourceVariant?.quantity || 0);
  };

  // ✅ add/edit handlers
  const openAdd = () => {
    setCreateForm(initialCreateForm);
    setCreateItems([]);
    setIsAddOpen(true);
  };
  const closeAdd = () => {
    setIsAddOpen(false);
    setCreateForm(initialCreateForm);
    setCreateItems([]);
  };

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
        quantity: String(getVariantRowsTotalQuantity(nextRows) || ""),
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
        quantity: String(getVariantRowsTotalQuantity(nextRows) || ""),
      };
    });
  };

  const currentBulkItems = useMemo(
    () => parseTransitItems(currentItem?.items),
    [currentItem?.items],
  );
  const isEditingBulkTransit = currentBulkItems.length > 0;
  const currentBulkTotalQuantity = useMemo(
    () => getTransitItemsTotalQuantity(currentBulkItems),
    [currentBulkItems],
  );

  const updateCurrentBulkItem = (index, key, value) => {
    setCurrentItem((prev) => {
      const nextItems = parseTransitItems(prev?.items).map((item, itemIndex) =>
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
        quantity: String(getTransitItemsTotalQuantity(nextItems)),
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
      const nextItems = parseTransitItems(prev?.items).map(
        (item, currentItemIndex) => {
          if (currentItemIndex !== itemIndex) return item;

          const nextVariants = normalizeVariantRows(item.variants).map(
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
            quantity: getVariantRowsTotalQuantity(nextVariants),
          };
        },
      );

      return {
        ...prev,
        items: nextItems,
        quantity: String(getTransitItemsTotalQuantity(nextItems)),
      };
    });
  };

  const resetBulkAddForm = () => {
    setBulkAddForm(initialBulkAddForm);
  };

  const handleBulkAddProductSelect = (selected) => {
    setBulkAddForm((prev) => ({
      ...prev,
      receivedId: selected?.value || "",
      productId: selected?.value || "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
    }));
  };

  const updateBulkAddVariantRow = (index, key, value) => {
    setBulkAddForm((prev) => {
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
        quantity: String(getVariantRowsTotalQuantity(nextRows) || ""),
      };
    });
  };

  const addBulkAddVariantRow = () => {
    setBulkAddForm((prev) => ({
      ...prev,
      variantRows: [
        ...normalizeVariantRows(prev?.variantRows),
        createEmptyVariantRow(),
      ],
    }));
  };

  const removeBulkAddVariantRow = (index) => {
    setBulkAddForm((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).filter(
        (_, rowIndex) => rowIndex !== index,
      );

      return {
        ...prev,
        variantRows: nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
        quantity: String(getVariantRowsTotalQuantity(nextRows) || ""),
      };
    });
  };

  const buildBulkAddItem = () => {
    if (!bulkAddForm.receivedId && !bulkAddForm.productId) {
      return { error: "Please select a product" };
    }

    const variantsPayload = getNormalizedVariantsPayload(
      bulkAddForm.variantRows,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }

    const totalQuantity =
      variantsPayload.length > 0
        ? getVariantRowsTotalQuantity(variantsPayload)
        : Number(bulkAddForm.quantity) || 0;

    if (totalQuantity <= 0) return { error: "Please enter valid quantity" };

    const productId = String(bulkAddForm.productId || bulkAddForm.receivedId);
    const selectedProduct = receivedDropdownOptions.find(
      (option) => option.value === productId,
    );
    const inventoryVariants = getVariantDisplayRows(selectedBulkAddInventoryItem);
    const unitPurchasePrice =
      Number(selectedBulkAddInventoryItem?.purchase_price) || 0;
    const unitSalePrice = Number(selectedBulkAddInventoryItem?.sale_price) || 0;

    const getVariantTotalPrice = (field, fallbackUnitPrice) =>
      variantsPayload.reduce((sum, variant) => {
        const invVariant = inventoryVariants.find(
          (item) =>
            String(item.size || "") === String(variant.size || "") &&
            String(item.color || "") === String(variant.color || ""),
        );
        const variantUnitPrice =
          Number(invVariant?.[field]) || Number(fallbackUnitPrice) || 0;
        return sum + variantUnitPrice * (Number(variant.quantity) || 0);
      }, 0);

    const totalPurchasePrice =
      variantsPayload.length > 0 && inventoryVariants.length > 0
        ? getVariantTotalPrice("purchase_price", unitPurchasePrice)
        : unitPurchasePrice * totalQuantity;
    const totalSalePrice =
      variantsPayload.length > 0 && inventoryVariants.length > 0
        ? getVariantTotalPrice("sale_price", unitSalePrice)
        : unitSalePrice * totalQuantity;

    return {
      item: {
        receivedId: Number(bulkAddForm.receivedId || bulkAddForm.productId),
        productId: Number(bulkAddForm.productId || bulkAddForm.receivedId),
        name:
          selectedProduct?.label ||
          selectedBulkAddInventoryItem?.name ||
          `Product #${productId}`,
        quantity: totalQuantity,
        purchase_price: totalPurchasePrice,
        sale_price: totalSalePrice,
        variants: variantsPayload,
      },
    };
  };

  const handleAddBulkProduct = () => {
    const result = buildBulkAddItem();
    if (result.error) return toast.error(result.error);

    setCurrentItem((prev) => {
      const currentItems = parseTransitItems(prev?.items);
      const existingIndex = currentItems.findIndex(
        (item) =>
          String(item.receivedId || item.productId) ===
          String(result.item.receivedId || result.item.productId),
      );

      if (existingIndex !== -1) {
        const existingItem = currentItems[existingIndex];
        const existingVariants = normalizeVariantRows(
          existingItem.variants,
        ).filter((variant) => variant.size || variant.color || variant.quantity);
        const incomingVariants = normalizeVariantRows(
          result.item.variants,
        ).filter((variant) => variant.size || variant.color || variant.quantity);

        if (!incomingVariants.length || !existingVariants.length) {
          toast.error("This product already exists in the list");
          return prev;
        }

        const duplicateVariant = incomingVariants.find((incoming) =>
          existingVariants.some(
            (existing) =>
              String(existing.size || "") === String(incoming.size || "") &&
              String(existing.color || "") === String(incoming.color || ""),
          ),
        );

        if (duplicateVariant) {
          toast.error("This variant already exists in the list");
          return prev;
        }

        const mergedVariants = [...existingVariants, ...incomingVariants];
        const nextItems = currentItems.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                variants: mergedVariants,
                quantity: getVariantRowsTotalQuantity(mergedVariants),
                purchase_price:
                  (Number(item.purchase_price) || 0) +
                  (Number(result.item.purchase_price) || 0),
                sale_price:
                  (Number(item.sale_price) || 0) +
                  (Number(result.item.sale_price) || 0),
              }
            : item,
        );

        return {
          ...prev,
          items: nextItems,
          quantity: String(getTransitItemsTotalQuantity(nextItems)),
        };
      }

      const nextItems = [...currentItems, result.item];

      return {
        ...prev,
        items: nextItems,
        quantity: String(getTransitItemsTotalQuantity(nextItems)),
      };
    });
    resetBulkAddForm();
  };

  const openEdit = (rp) => {
    const bulkItems = parseTransitItems(rp.items);
    const firstBulkItem = bulkItems[0] || null;
    const variantRows = getInitialVariantRowsFromRecord(firstBulkItem || rp);
    const productId =
      firstBulkItem?.receivedId ??
      firstBulkItem?.productId ??
      rp.receivedId ??
      rp.productId ??
      rp.product?.Id ??
      rp.product?.id ??
      "";
    const warehouseId =
      rp.warehouseId ?? rp.warehouse?.Id ?? rp.warehouse?.id ?? "";

    setCurrentItem({
      ...rp,
      items: bulkItems,
      productId: String(productId),
      receivedId: String(productId),
      warehouseId: String(warehouseId),
      name: firstBulkItem?.name || rp.name || rp.product?.name || "",
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),
      sale_price: rp.sale_price ?? "",
      purchase_price: rp.purchase_price ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      date: toDateInputValue(rp.date),
      userId,
    });
    resetBulkAddForm();
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setCurrentItem(null);
    resetBulkAddForm();
  };

  const openEdit1 = (rp) => {
    const bulkItems = parseTransitItems(rp.items);
    const firstBulkItem = bulkItems[0] || null;
    const variantRows = getInitialVariantRowsFromRecord(firstBulkItem || rp);
    const productId =
      firstBulkItem?.receivedId ??
      firstBulkItem?.productId ??
      rp.receivedId ??
      rp.productId ??
      rp.product?.Id ??
      rp.product?.id ??
      "";
    const warehouseId =
      rp.warehouseId ?? rp.warehouse?.Id ?? rp.warehouse?.id ?? "";

    setCurrentItem({
      ...rp,
      items: bulkItems,
      productId: String(productId),
      receivedId: String(productId),
      warehouseId: String(warehouseId),
      name: firstBulkItem?.name || rp.name || rp.product?.name || "",
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),
      sale_price: rp.sale_price ?? "",
      purchase_price: rp.purchase_price ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      date: toDateInputValue(rp.date),
      userId,
    });
    setIsEditOpen1(true);
  };

  const closeEdit1 = () => {
    setIsEditOpen1(false);
    setCurrentItem(null);
  };

  // mutations
  const [insertInTransitProduct] = useInsertInTransitProductMutation();
  const [updateInTransitProduct] = useUpdateInTransitProductMutation();
  const [deleteInTransitProduct] = useDeleteInTransitProductMutation();

  const applyCreateGlobalFields = (payload) => ({
    ...payload,
    warehouseId: Number(createForm.warehouseId),
    note: createForm.note,
    date: createForm.date,
  });

  const buildCreatePayload = () => {
    if (!createForm.receivedId && !createForm.productId)
      return { error: "Please select a product" };

    const variantsPayload = getNormalizedVariantsPayload(
      createForm.variantRows,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }

    const totalQuantity =
      variantsPayload.length > 0
        ? getVariantRowsTotalQuantity(variantsPayload)
        : Number(createForm.quantity) || 0;

    if (totalQuantity <= 0) return { error: "Please enter valid quantity" };

    const unitPurchasePrice = Number(selectedCreateInventoryItem?.purchase_price) || 0;
    const unitSalePrice = Number(selectedCreateInventoryItem?.sale_price) || 0;
    const inventoryVariants = getVariantDisplayRows(selectedCreateInventoryItem);
    const totalPurchasePrice =
      variantsPayload.length > 0 && inventoryVariants.length > 0
        ? variantsPayload.reduce((sum, v) => {
            const invVariant = inventoryVariants.find(
              (iv) =>
                String(iv.size || "") === String(v.size || "") &&
                String(iv.color || "") === String(v.color || ""),
            );
            const vUnitPrice = Number(invVariant?.purchase_price) || unitPurchasePrice;
            return sum + vUnitPrice * Number(v.quantity || 0);
          }, 0)
        : unitPurchasePrice * totalQuantity;
    const totalSalePrice =
      variantsPayload.length > 0 && inventoryVariants.length > 0
        ? variantsPayload.reduce((sum, v) => {
            const invVariant = inventoryVariants.find(
              (iv) =>
                String(iv.size || "") === String(v.size || "") &&
                String(iv.color || "") === String(v.color || ""),
            );
            const vUnitPrice = Number(invVariant?.sale_price) || unitSalePrice;
            return sum + vUnitPrice * Number(v.quantity || 0);
          }, 0)
        : unitSalePrice * totalQuantity;

    const productId = String(createForm.productId || createForm.receivedId);
    const selectedProduct = receivedDropdownOptions.find(
      (option) => option.value === productId,
    );

    return {
      payload: {
        receivedId: Number(createForm.receivedId || createForm.productId),
        productId: Number(createForm.productId || createForm.receivedId),
        warehouseId: Number(createForm.warehouseId),
        quantity: totalQuantity,
        sale_price: totalSalePrice,
        purchase_price: totalPurchasePrice,
        variants: variantsPayload,
        note: createForm.note,
        date: createForm.date,
      },
      unit_purchase_price: unitPurchasePrice,
      unit_sale_price: unitSalePrice,
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
      purchase_price: "",
    }));
  };

  const mergeCreateItem = (incomingItem) => {
    setCreateItems((prev) => {
      const targetReceivedId = String(incomingItem.payload?.receivedId || "");
      const existingIndex = prev.findIndex(
        (item) => String(item.payload?.receivedId || "") === targetReceivedId,
      );

      if (existingIndex === -1) return [...prev, incomingItem];

      return prev.map((item, index) => {
        if (index !== existingIndex) return item;

        const variants = [
          ...normalizeVariantRows(item.payload?.variants).filter(
            (variant) => variant.size || variant.color || variant.quantity,
          ),
          ...normalizeVariantRows(incomingItem.payload?.variants).filter(
            (variant) => variant.size || variant.color || variant.quantity,
          ),
        ];

        const newQuantity =
          (Number(item.payload?.quantity) || 0) +
          (Number(incomingItem.payload?.quantity) || 0);
        const unitPrice =
          incomingItem.unit_purchase_price ?? item.unit_purchase_price ?? 0;
        const unitSalePrice =
          incomingItem.unit_sale_price ?? item.unit_sale_price ?? 0;

        return {
          ...item,
          unit_purchase_price: unitPrice,
          unit_sale_price: unitSalePrice,
          payload: {
            ...item.payload,
            ...incomingItem.payload,
            quantity: newQuantity,
            purchase_price: unitPrice * newQuantity,
            sale_price: unitSalePrice * newQuantity,
            variants,
          },
        };
      });
    });
  };

  const handleAddCreateVariants = () => {
    const item = buildCreatePayload();
    if (item.error) return toast.error(item.error);
    mergeCreateItem(item);
    resetCreateProductFields();
  };

  const handleCreateProductSelect = (selected) => {
    if (!selected) {
      resetCreateProductFields();
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      productId: selected?.value || "",
      receivedId: selected?.value || "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
      purchase_price: "",
    }));
  };

  useEffect(() => {
    if (
      !createForm?.receivedId ||
      !selectedCreateInventoryItem ||
      shouldShowCreateVariantOptions
    ) {
      return;
    }

    const productId = String(createForm.productId || createForm.receivedId);
    const selectedProduct = receivedDropdownOptions.find(
      (option) => option.value === productId,
    );
    const unitPurchasePrice = Number(selectedCreateInventoryItem?.purchase_price) || 0;
    const unitSalePrice = Number(selectedCreateInventoryItem?.sale_price) || 0;

    mergeCreateItem({
      unit_purchase_price: unitPurchasePrice,
      unit_sale_price: unitSalePrice,
      payload: {
        receivedId: Number(createForm.receivedId || createForm.productId),
        productId: Number(createForm.productId || createForm.receivedId),
        warehouseId: Number(createForm.warehouseId),
        quantity: "",
        sale_price: "",
        purchase_price: "",
        variants: [],
        note: createForm.note,
        date: createForm.date,
      },
      label: selectedProduct?.label || `Product #${productId}`,
    });
    resetCreateProductFields();
  }, [
    createForm?.receivedId,
    createForm?.productId,
    selectedCreateInventoryItem,
    shouldShowCreateVariantOptions,
    receivedDropdownOptions,
  ]);

  const updateCreateItem = (index, key, value) => {
    setCreateItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updatedPayload = { ...item.payload, [key]: value };
        if (key === "quantity") {
          const unitPrice = Number(item.unit_purchase_price) || 0;
          const unitSalePrice = Number(item.unit_sale_price) || 0;
          updatedPayload.purchase_price = unitPrice * (Number(value) || 0);
          updatedPayload.sale_price = unitSalePrice * (Number(value) || 0);
        }
        return { ...item, payload: updatedPayload };
      }),
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

        const variants = normalizeVariantRows(item.payload?.variants).map(
          (variant, currentVariantIndex) =>
            currentVariantIndex === variantIndex
              ? { ...variant, [key]: value }
              : variant,
        );
        const quantity = getVariantRowsTotalQuantity(variants);
        const invItem = receivedData.find(
          (r) => Number(r.Id) === Number(item.payload?.receivedId || item.payload?.productId),
        );
        const invVariants = getVariantDisplayRows(invItem);
        const computedPurchasePrice =
          invVariants.length > 0
            ? variants.reduce((sum, v) => {
                const invVariant = invVariants.find(
                  (iv) =>
                    String(iv.size || "") === String(v.size || "") &&
                    String(iv.color || "") === String(v.color || ""),
                );
                const vUnitPrice =
                  Number(invVariant?.purchase_price) ||
                  Number(item.unit_purchase_price) ||
                  0;
                return sum + vUnitPrice * (Number(v.quantity) || 0);
              }, 0)
            : (Number(item.unit_purchase_price) || 0) * quantity;
        const computedSalePrice =
          invVariants.length > 0
            ? variants.reduce((sum, v) => {
                const invVariant = invVariants.find(
                  (iv) =>
                    String(iv.size || "") === String(v.size || "") &&
                    String(iv.color || "") === String(v.color || ""),
                );
                const vUnitPrice =
                  Number(invVariant?.sale_price) ||
                  Number(item.unit_sale_price) ||
                  0;
                return sum + vUnitPrice * (Number(v.quantity) || 0);
              }, 0)
            : (Number(item.unit_sale_price) || 0) * quantity;

        return {
          ...item,
          payload: {
            ...item.payload,
            variants,
            quantity,
            purchase_price: computedPurchasePrice,
            sale_price: computedSalePrice,
          },
        };
      }),
    );
  };

  const removeCreateItem = (index) => {
    setCreateItems((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const applyCreateTotalSaleToItems = (items = []) => {
    const totalSale = Number(createForm.sale_price) || 0;
    if (!items.length) return items;

    const totalQuantity = items.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0,
    );
    let assignedSale = 0;

    return items.map((item, index) => {
      const isLast = index === items.length - 1;
      const ratio =
        totalQuantity > 0
          ? (Number(item.quantity) || 0) / totalQuantity
          : 1 / items.length;
      const sale = isLast ? totalSale - assignedSale : totalSale * ratio;
      const roundedSale = Number(sale.toFixed(2));
      assignedSale += roundedSale;

      return {
        ...item,
        sale_price: roundedSale,
      };
    });
  };

  // ✅ create (send receivedId)
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!createForm.warehouseId) return toast.error("Please select warehouse");

    const batchId = createBatchId();
    let items = createItems.map((item) =>
      applyCreateGlobalFields(item.payload),
    );
    items = items.map((item) => ({ ...item, batchId }));
    if (items.length === 0) {
      const item = buildCreatePayload();
      if (item.error) return toast.error(item.error);
      items = [{ ...applyCreateGlobalFields(item.payload), batchId }];
    }
    try {
      const payload = items.length === 1 ? items[0] : { items };
      const res = await insertInTransitProduct(payload).unwrap();
      if (res?.success) {
        toast.success(items.length > 1 ? "Products created!" : "Created!");
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
    const bulkItems = parseTransitItems(currentItem?.items).map((item) => ({
      ...item,
      quantity: getTransitItemQuantity(item),
    }));
    if (!bulkItems.length && !currentItem?.receivedId && !currentItem?.productId)
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
              warehouseId: Number(currentItem.warehouseId),
              date: currentItem.date,
              userId,
              actorRole: role,
            }
          : {
              note: currentItem.note,
              status: currentItem.status,
              warehouseId: Number(currentItem.warehouseId),
              date: currentItem.date,
              quantity: Number(currentItem.quantity),
              sale_price: Number(currentItem.sale_price) || 0,
              purchase_price: Number(currentItem.purchase_price) || 0,
              variants: variantsPayload,
              receivedId: Number(currentItem.receivedId || currentItem.productId),
              productId: Number(currentItem.productId || currentItem.receivedId),
              userId: userId,
              actorRole: role,
            };

      const res = await updateInTransitProduct({
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

    try {
      const payload = {
        note: currentItem.note,
        status: currentItem.status,
        quantity: Number(currentItem.quantity || 0),
        sale_price: Number(currentItem.sale_price) || 0,
        purchase_price: Number(currentItem.purchase_price) || 0,
        receivedId: Number(currentItem.receivedId || currentItem.productId),
        productId: Number(currentItem.productId || currentItem.receivedId),
        userId: userId,
        actorRole: role,
      };

      const res = await updateInTransitProduct({
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
    const confirmed = await requestDeleteConfirmation({
      title: "Delete intransit product?",
      message:
        "This intransit product entry will be removed permanently. This action cannot be undone.",
    });
    if (!confirmed) return;

    try {
      const res = await deleteInTransitProduct(id).unwrap();
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

  // pagination helpers
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

  const pageOptions = useMemo(
    () =>
      Array.from({ length: totalPages }, (_, index) => ({
        value: index + 1,
        label: String(index + 1),
      })),
    [totalPages],
  );

  const handlePageSelect = (selected) => {
    if (!selected) return;
    const selectedPage = Number(selected.value);
    if (!selectedPage || selectedPage < 1 || selectedPage > totalPages) return;

    setCurrentPage(selectedPage);
    const newStart =
      Math.floor((selectedPage - 1) / pagesPerSet) * pagesPerSet + 1;
    setStartPage(newStart);
  };

  // (optional) per page options for light UI (still fixed limit=10 here)
  const perPageOptions = [10, 20, 50, 100];

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
      className="w-full max-w-full min-w-0 bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-4 sm:p-6 border border-slate-200 mb-8"
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
            <span className="text-sm">Total Intransit Return</span>
          </div>
          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end w-full [&>*]:min-w-0">
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

        {/* Per Page (optional UI) */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <Select
            options={perPageOptions.map((v) => ({
              value: v,
              label: String(v),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => {
              const next = Number(selected?.value);
              if (!next) return;
              setItemsPerPage(next);
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="text-black"
            styles={selectStyles}
          />
        </div>

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

        <button
          type="button"
          className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="intransit-product-table-scroll four-row-table-scroll mt-6 rounded-2xl border border-slate-200">
        <table className="w-full min-w-[2200px] divide-y divide-slate-200 [&_th]:px-3 lg:[&_th]:px-4 [&_td]:px-3 lg:[&_td]:px-4 [&_th]:py-3 [&_td]:py-3">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[420px] max-w-[420px]">
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[780px]">
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
              const rowItems = getTransitRowItems(rp);
              const rowTotalQuantity = getTransitItemsTotalQuantity(rowItems);
              const itemVariantGroups = rowItems.map((item) => ({
                item,
                variants: getVariantDisplayRows(item),
              }));
              const hasDisplayItems = itemVariantGroups.some(
                ({ variants }) => variants.length > 0,
              );
              const computedTotalBuy = itemVariantGroups.reduce(
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
              const totalBuy = computedTotalBuy || Number(rp.purchase_price || 0);
              const totalSell = Number(rp.sale_price || 0);

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
                  <td className="px-6 py-4 min-w-[420px] max-w-[420px] whitespace-normal text-sm font-semibold text-slate-900">
                    {rowItems
                      .map((item) => resolveProductName(item))
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
                  <td className="px-6 py-4 min-w-[780px]">
                    {hasDisplayItems || rowItems.length > 0 ? (
                      <div className="flex flex-nowrap gap-2">
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
                                    {resolveProductName(item)}
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
                    <div className="flex items-center gap-1.5">
                      {rp.note ? (
                        <div className="relative">
                          <button
                            className="relative h-8 w-8 rounded-md flex items-center justify-center"
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
                          className="h-8 w-8 rounded-md flex items-center justify-center"
                          title={rp.note}
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEdit(rp)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white transition"
                        title="Edit"
                      >
                        <Edit size={18} className="text-indigo-600" />
                      </button>

                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(rp.Id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white transition"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEdit1(rp)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white transition"
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
                  colSpan={10}
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
        <div className="min-w-[160px] w-full sm:w-auto">
          <Select
            options={pageOptions}
            value={
              pageOptions.find((option) => option.value === currentPage) || null
            }
            onChange={handlePageSelect}
            placeholder="Go to page"
            isSearchable
            className="text-black"
            styles={selectStyles}
          />
        </div>

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
            {isEditingBulkTransit && (
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
                  <table className="min-w-[860px] w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="min-w-[280px] px-3 py-3 text-left">
                          Product
                        </th>
                        <th className="px-3 py-3 text-left">Quantity</th>
                        <th className="px-3 py-3 text-left">Variant Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentBulkItems.map((item, index) => (
                        <tr
                          key={`edit-transit-${item.productId || item.name}-${index}`}
                        >
                          <td className="min-w-[280px] px-3 py-3 align-top">
                            <div className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                              {item.name || `Product #${item.productId || "-"}`}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            {item.variants?.length ? (
                              <div>
                                <p className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-900">
                                  {getTransitItemQuantity(item)}
                                </p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Stock: {getItemStockQuantity(item)}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={getTransitItemQuantity(item) || ""}
                                  onChange={(e) =>
                                    updateCurrentBulkItem(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Stock: {getItemStockQuantity(item)}
                                </p>
                              </div>
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
                                      <p className="mt-0.5 text-[10px] text-slate-400">
                                        Stock:{" "}
                                        {getVariantStockQuantity(item, variant)}
                                      </p>
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

                <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-3">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                      <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        New Product
                      </label>
                      <Select
                        options={receivedDropdownOptions}
                        value={makeSelectValue(
                          receivedDropdownOptions,
                          bulkAddForm.receivedId,
                        )}
                        onChange={handleBulkAddProductSelect}
                        placeholder={
                          receivedLoading ? "Loading..." : "Select Product"
                        }
                        isClearable
                        isDisabled={receivedLoading}
                        className="text-black"
                        styles={selectStyles}
                      />
                    </div>

                    {!shouldShowBulkAddVariantOptions && (
                      <div className="lg:w-36">
                        <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={bulkAddForm.quantity}
                          onChange={(e) =>
                            setBulkAddForm((prev) => ({
                              ...prev,
                              quantity: e.target.value,
                            }))
                          }
                          disabled={!bulkAddForm.receivedId}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddBulkProduct}
                      disabled={
                        !bulkAddForm.receivedId
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={16} />
                      Add Product
                    </button>
                  </div>

                  {bulkAddForm.receivedId && shouldShowBulkAddVariantOptions && (
                    <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={addBulkAddVariantRow}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Plus size={14} />
                          Add Variant
                        </button>
                      </div>

                      {normalizeVariantRows(bulkAddForm.variantRows).map(
                        (row, index) => {
                          const colorOptions = row.size
                            ? getInventoryVariantColorsForSize(
                                selectedBulkAddInventoryItem,
                                row.size,
                              )
                            : bulkAddColorOptions;

                          return (
                            <div
                              key={`bulk-add-variant-${index}`}
                              className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end"
                            >
                              <div>
                                <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Size
                                </label>
                                <Select
                                  options={bulkAddSizeOptions}
                                  value={makeSelectValue(
                                    bulkAddSizeOptions,
                                    row.size,
                                    row.size,
                                  )}
                                  onChange={(selected) =>
                                    updateBulkAddVariantRow(
                                      index,
                                      "size",
                                      selected?.value || "",
                                    )
                                  }
                                  placeholder="Select size..."
                                  isClearable
                                  styles={selectStyles}
                                  className="text-sm font-medium"
                                  isDisabled={bulkAddSizeOptions.length === 0}
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Color
                                </label>
                                <Select
                                  options={colorOptions}
                                  value={makeSelectValue(
                                    colorOptions,
                                    row.color,
                                    row.color,
                                  )}
                                  onChange={(selected) =>
                                    updateBulkAddVariantRow(
                                      index,
                                      "color",
                                      selected?.value || "",
                                    )
                                  }
                                  placeholder="Select color..."
                                  isClearable
                                  styles={selectStyles}
                                  className="text-sm font-medium"
                                  isDisabled={
                                    !row.size || colorOptions.length === 0
                                  }
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    updateBulkAddVariantRow(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => removeBulkAddVariantRow(index)}
                                disabled={
                                  normalizeVariantRows(bulkAddForm.variantRows)
                                    .length === 1
                                }
                                className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              >
                                x
                              </button>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={isEditingBulkTransit ? "hidden" : "mt-4"}>
              <label className="block text-sm text-slate-700">Product</label>
              <Select
                options={receivedDropdownOptions}
                value={makeSelectValue(
                  receivedDropdownOptions,
                  currentItem?.receivedId,
                  currentItem?.name || currentItem?.product?.name,
                )}
                onChange={(selected) =>
                  setCurrentItem((p) => ({
                    ...p,
                    productId: selected?.value || "",
                    receivedId: selected?.value || "",
                    variantRows: [createEmptyVariantRow()],
                    quantity: "",
                    sale_price: "",
                  }))
                }
                placeholder={receivedLoading ? "Loading..." : "Select Product"}
                isClearable
                className="text-black"
                isDisabled={receivedLoading}
                styles={selectStyles}
              />
            </div>
            {!isEditingBulkTransit && shouldShowEditVariantOptions && (
              <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
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
                      ? getInventoryVariantColorsForSize(
                          selectedEditInventoryItem,
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
                            Size
                          </label>
                          <Select
                            options={editSizeOptions}
                            value={makeSelectValue(
                              editSizeOptions,
                              row.size,
                              row.size,
                            )}
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
                            value={makeSelectValue(
                              colorOptions,
                              row.color,
                              row.color,
                            )}
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
                          <span className="mx-auto block text-base leading-none">
                            x
                          </span>
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
                value={makeSelectValue(
                  warehouseOptions,
                  currentItem?.warehouseId,
                  currentItem?.warehouse?.name,
                )}
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
              <label className="block text-sm text-slate-700">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={currentItem.quantity ?? ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, quantity: e.target.value }))
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">
                Sales Price
              </label>
              <input
                type="number"
                step="0.01"
                value={currentItem.sale_price ?? ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({
                    ...p,
                    sale_price: e.target.value,
                  }))
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm text-slate-700">
                Purchase Price
              </label>
              <input
                type="number"
                step="0.01"
                value={currentItem.purchase_price ?? ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({
                    ...p,
                    purchase_price: e.target.value,
                  }))
                }
                className="h-11 border border-slate-200 rounded-xl px-3 w-full mt-1 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            {canUpdateStatus ? (
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
        title="Add New Intransit Product"
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={handleCreate}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Select Product
            </label>
            <Select
              options={receivedDropdownOptions}
              value={
                receivedDropdownOptions.find(
                  (o) => o.value === String(createForm.receivedId),
                ) || null
              }
              onChange={handleCreateProductSelect}
              placeholder="Search product..."
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={receivedLoading}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product Line Items
                </p>
                <p className="text-[11px] text-slate-400">
                  Select a product above to add a new row; then set quantity here
                </p>
              </div>
              <div className="grid gap-3 rounded-xl border border-indigo-100 bg-white p-4 text-right">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Quantity
                  </p>
                  <p className="text-lg font-black text-slate-900">
                    {createItemsTotalQuantity || ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Product Detail</th>
                    <th className="px-4 py-3">Variant Detail</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {createItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-slate-400"
                      >
                        No products added
                      </td>
                    </tr>
                  ) : (
                    createItems.map((item, itemIndex) => {
                      const variants = getNormalizedVariantsPayload(
                        item.payload?.variants,
                      );
                      const hasVariants = variants.length > 0;

                      return (
                        <tr key={`${item.label}-${itemIndex}`}>
                          <td className="px-4 py-4 align-top font-semibold text-slate-900">
                            {item.label}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {hasVariants ? (
                              <div className="grid max-w-[360px] grid-cols-2 gap-3">
                                <div className="col-span-2">
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Quantity
                                  </p>
                                  <p className="text-base font-black text-slate-900">
                                    {Number(item.payload?.quantity) || ""}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid max-w-[260px] grid-cols-1 gap-3">
                                <div>
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Qty
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.payload?.quantity ?? ""}
                                    onChange={(event) =>
                                      updateCreateItem(itemIndex, "quantity", event.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    placeholder=""
                                  />
                                  {(() => {
                                    const invItem = receivedData.find((r) => Number(r.Id) === Number(item.payload?.receivedId || item.payload?.productId));
                                    return invItem ? (
                                      <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(invItem.quantity || 0)}</p>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {hasVariants ? (
                              <div className="space-y-2">
                                {variants.map((variant, variantIndex) => (
                                  <div
                                    key={`${item.label}-${itemIndex}-variant-${variantIndex}`}
                                    className="grid grid-cols-[auto_auto_110px] items-end gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2"
                                  >
                                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                      {variant.size || "N/A"}
                                    </span>
                                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                      {variant.color || "N/A"}
                                    </span>
                                    <div>
                                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Qty
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={variant.quantity ?? ""}
                                        onChange={(event) =>
                                          updateCreateItemVariantField(
                                            itemIndex,
                                            variantIndex,
                                            "quantity",
                                            event.target.value,
                                          )
                                        }
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
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
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                                No variants
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right align-top">
                            <button
                              type="button"
                              onClick={() => removeCreateItem(itemIndex)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                            >
                              <X size={14} />
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {shouldShowCreateVariantOptions && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Variants</p>
                <p className="text-[11px] text-slate-400">Add size, color and quantity combinations</p>
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
              {normalizeVariantRows(createForm?.variantRows).map((row, index) => {
                const colorOptions = row.size
                  ? getInventoryVariantColorsForSize(selectedCreateInventoryItem, row.size)
                  : createColorOptions;
                return (
                  <div key={`create-variant-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end rounded-2xl border border-slate-200 bg-white p-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Size</label>
                      <Select
                        options={createSizeOptions}
                        value={createSizeOptions.find((option) => option.value === row.size) || null}
                        onChange={(selected) => updateVariantRow("create", index, "size", selected?.value || "")}
                        placeholder="Select size..."
                        isClearable
                        styles={selectStyles}
                        className="text-sm text-black font-medium"
                        isDisabled={!createForm?.receivedId || createSizeOptions.length === 0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Color</label>
                      <Select
                        options={colorOptions}
                        value={colorOptions.find((option) => option.value === row.color) || null}
                        onChange={(selected) => updateVariantRow("create", index, "color", selected?.value || "")}
                        placeholder="Select color..."
                        isClearable
                        styles={selectStyles}
                        className="text-sm text-black font-medium"
                        isDisabled={!row.size || colorOptions.length === 0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.quantity}
                        onChange={(e) => updateVariantRow("create", index, "quantity", e.target.value)}
                        disabled={!createForm?.receivedId || createSizeOptions.length === 0}
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
                      onClick={() => removeVariantRow("create", index)}
                      className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                      disabled={normalizeVariantRows(createForm?.variantRows).length === 1}
                    >
                      <X size={16} className="mx-auto" />
                    </button>
                  </div>
                );
              })}
              <div className="flex justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={handleAddCreateVariants}
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
                Date
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

export default IntransiteProductTable;
