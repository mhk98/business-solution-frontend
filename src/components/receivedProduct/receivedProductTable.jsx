import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Notebook,
  Plus,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import {
  useGetAllProductWithoutQueryQuery,
  useGetSingleReceivedProductByIdQuery,
} from "../../features/product/product";
import {
  useDeleteReceivedProductMutation,
  useGetAllReceivedProductQuery,
  useInsertReceivedProductMutation,
  useUpdateReceivedProductMutation,
} from "../../features/receivedProduct/receivedProduct";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import Modal from "../common/Modal";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useGetAllInventoryOverviewWithoutQueryQuery } from "../../features/inventoryOverview/inventoryOverview";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const blankIfZero = (value) => (Number(value) === 0 ? "" : value ?? "");

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const initialCreateProduct = {
  warehouseId: "",
  bookId: "",
  supplierId: "",
  productId: "",
  sku: "",
  weight: "",
  variantRows: [{ size: "", color: "", quantity: "" }],
  quantity: "",
  purchase_price: "",
  sale_price: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
  file: null,

  // ✅ Warranty
  hasWarranty: false,
  warrantyValue: "",
  warrantyUnit: "Day",
};

const initialBulkAddProduct = {
  productId: "",
  sku: "",
  weight: "",
  variantRows: [{ size: "", color: "", quantity: "", purchase_price: "", sale_price: "" }],
  quantity: "",
  purchase_price: "",
  sale_price: "",
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

const createEmptyVariantRow = () => ({
  size: "",
  color: "",
  quantity: "",
  purchase_price: "",
  sale_price: "",
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
      purchase_price:
        row?.purchase_price !== undefined && row?.purchase_price !== null
          ? String(row.purchase_price)
          : "",
      sale_price:
        row?.sale_price !== undefined && row?.sale_price !== null
          ? String(row.sale_price)
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

const generateVariantSku = (baseSku, row, index) => {
  const normalizedBaseSku = sanitizeSkuSegment(baseSku);
  if (!normalizedBaseSku) return "";

  const sizeSegment = sanitizeSkuSegment(row?.size);
  const colorSegment = sanitizeSkuSegment(row?.color);

  return [
    normalizedBaseSku,
    sizeSegment || `VAR${index + 1}`,
    colorSegment || `ITEM${index + 1}`,
  ].join("-");
};

const getNormalizedVariantsPayload = (rows, baseSku = "") =>
  normalizeVariantRows(rows)
    .filter((row) => row.size || row.color || row.quantity)
    .map((row, index) => ({
      size: row.size || "",
      color: row.color || "",
      quantity: Number(row.quantity) || 0,
      purchase_price: Number(row.purchase_price) || 0,
      sale_price: Number(row.sale_price) || 0,
      sku: generateVariantSku(baseSku, row, index),
    }))
    .filter((row) => row.size);

const getVariantRowsTotalQuantity = (rows) =>
  normalizeVariantRows(rows).reduce(
    (total, row) => total + (Number(row.quantity) || 0),
    0,
  );

const getProductRecordId = (product) =>
  String(product?.Id ?? product?.id ?? product?._id ?? "");

const getVariantRowsFromProduct = (product) => {
  if (!Array.isArray(product?.variations) || product.variations.length === 0) {
    return [];
  }

  return product.variations.flatMap((variation) => {
    const sizes = parseVariationValue(variation?.size);
    const colors = parseVariationValue(variation?.color);
    if (sizes.length === 0 && colors.length === 0) {
      return [];
    }

    const safeSizes = sizes.length ? sizes : [""];
    const safeColors = colors.length ? colors : [""];

    return safeSizes.flatMap((size) =>
      safeColors.map((color) => ({
        size,
        color,
        quantity: "",
        purchase_price:
          variation?.purchase_price !== undefined &&
          variation?.purchase_price !== null
            ? String(variation.purchase_price)
            : "",
        sale_price:
          variation?.sale_price !== undefined && variation?.sale_price !== null
            ? String(variation.sale_price)
            : "",
      })),
    );
  });
};

const getProductBasePrice = (product, key) =>
  product?.[key] ?? product?.stock?.[key] ?? product?.productStock?.[key] ?? "";

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

const createBatchId = () =>
  `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

const parseReceivedItems = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const resolveEditPrice = (value, fallbackValue = "") => {
  const fallbackNumber = Number(fallbackValue);
  const hasFallback =
    fallbackValue !== undefined &&
    fallbackValue !== null &&
    fallbackValue !== "" &&
    Number.isFinite(fallbackNumber) &&
    fallbackNumber > 0;

  if (value === undefined || value === null || value === "") {
    return hasFallback ? fallbackValue : "";
  }

  const valueNumber = Number(value);
  if (Number.isFinite(valueNumber) && valueNumber > 0) return value;

  return hasFallback ? fallbackValue : value;
};

const hydrateReceivedItemsForEdit = (items = [], record = {}) =>
  items.map((item) => {
    const purchasePrice = resolveEditPrice(
      item?.purchase_price,
      record?.purchase_price,
    );
    const salePrice = resolveEditPrice(item?.sale_price, record?.sale_price);

    return {
      ...item,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      variants: Array.isArray(item?.variants)
        ? item.variants.map((variant) => ({
            ...variant,
            purchase_price: resolveEditPrice(
              variant?.purchase_price,
              purchasePrice,
            ),
            sale_price: resolveEditPrice(variant?.sale_price, salePrice),
          }))
        : item?.variants,
    };
  });

const getReceivedRowItems = (row) => {
  const items = parseReceivedItems(row?.items);
  if (items.length > 0) return items;

  return Array.isArray(row?.batchItems) && row.batchItems.length > 0
    ? row.batchItems
    : [row];
};

const getReceivedRowTime = (item) => {
  const time = new Date(item?.createdAt || item?.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const getReceivedRelationId = (item, relationName, fieldName) =>
  item?.[fieldName] ??
  item?.[relationName]?.Id ??
  item?.[relationName]?.id ??
  item?.[relationName]?.name ??
  "";

const canFallbackGroupReceivedRows = (prevItem, item) => {
  if (!prevItem || !item || prevItem.batchId || item.batchId) return false;

  const prevTime = getReceivedRowTime(prevItem);
  const itemTime = getReceivedRowTime(item);
  if (!prevTime || !itemTime || Math.abs(prevTime - itemTime) > 10000) {
    return false;
  }

  return (
    String(prevItem.date || "") === String(item.date || "") &&
    String(getReceivedRelationId(prevItem, "warehouse", "warehouseId")) ===
      String(getReceivedRelationId(item, "warehouse", "warehouseId")) &&
    String(getReceivedRelationId(prevItem, "supplier", "supplierId")) ===
      String(getReceivedRelationId(item, "supplier", "supplierId"))
  );
};

const groupReceivedRowsByBatch = (items = []) => {
  const groups = [];
  const batchIndexes = new Map();

  items.forEach((item) => {
    if (item?.batchId) {
      const batchKey = String(item.batchId);
      if (!batchIndexes.has(batchKey)) {
        batchIndexes.set(batchKey, groups.length);
        groups.push([]);
      }
      groups[batchIndexes.get(batchKey)].push(item);
      return;
    }

    const lastGroup = groups[groups.length - 1];
    const lastItem = lastGroup?.[lastGroup.length - 1];
    if (canFallbackGroupReceivedRows(lastItem, item)) {
      lastGroup.push(item);
      return;
    }

    groups.push([item]);
  });

  return groups.map((group) => {
    if (group.length === 1) return group[0];

    const groupId = group[0].batchId || group.map((item) => item.Id).join("-");

    return {
      ...group[0],
      Id: `batch-${groupId}`,
      batchItems: group,
      quantity: group.reduce(
        (total, item) => total + (Number(item.quantity) || 0),
        0,
      ),
    };
  });
};

const ReceivedProductTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [isModalOpen, setIsModalOpen] = useState(false); // Edit modal
  const [isModalOpen1, setIsModalOpen1] = useState(false); // Add modal
  const [isModalOpen2, setIsModalOpen2] = useState(false); // Note / status modal
  const [currentProduct, setCurrentProduct] = useState(null);

  const [warehouse, setWarehouse] = useState("");
  const [supplier, setSupplier] = useState("");

  const [createProduct, setCreateProduct] = useState(initialCreateProduct);
  const [createProductItems, setCreateProductItems] = useState([]);
  const [bulkAddProduct, setBulkAddProduct] = useState(initialBulkAddProduct);

  const [rows, setRows] = useState([]);
  const editVariantRowRefs = useRef([]);
  const createVariantRowRefs = useRef([]);
  const preparedVariantProductIdRef = useRef("");
  const editModalBodyRef = useRef(null);
  const createModalBodyRef = useRef(null);
  const [pendingVariantScrollMode, setPendingVariantScrollMode] =
    useState(null);
  const currentProductBulkItems = useMemo(
    () => parseReceivedItems(currentProduct?.items),
    [currentProduct?.items],
  );
  const isEditingBulkReceivedProduct = currentProductBulkItems.length > 0;
  const currentProductBulkTotalQuantity = useMemo(
    () =>
      currentProductBulkItems.reduce(
        (total, item) => total + (Number(item.quantity) || 0),
        0,
      ),
    [currentProductBulkItems],
  );

  // ✅ Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
  }, [startDate, endDate, productName, itemsPerPage]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ All products
  const {
    data: allProductsRes,
    isLoading: isLoadingAllProducts,
    isError: isErrorAllProducts,
    error: errorAllProducts,
  } = useGetAllProductWithoutQueryQuery();

  const productsData = useMemo(
    () => allProductsRes?.data || [],
    [allProductsRes],
  );

  useEffect(() => {
    if (isErrorAllProducts) {
      console.error("Error fetching products", errorAllProducts);
    }
  }, [isErrorAllProducts, errorAllProducts]);

  const { data: inventoryRes } = useGetAllInventoryOverviewWithoutQueryQuery();
  const receivedData = inventoryRes?.data || [];

  const getInventoryRecordForProduct = (productId, fallbackName = "") => {
    const normalizedName = String(fallbackName || "")
      .trim()
      .toLowerCase();

    const idMatch = productId
      ? receivedData.find(
          (r) =>
            Number(r.productId) === Number(productId) ||
            Number(r.ProductId) === Number(productId) ||
            Number(r.product?.Id) === Number(productId) ||
            Number(r.product?.id) === Number(productId),
        )
      : null;

    if (idMatch) return idMatch;

    return normalizedName
      ? receivedData.find(
          (r) => String(r.name || "").trim().toLowerCase() === normalizedName,
        ) || null
      : null;
  };

  const getInventoryQuantityForProduct = (productId, fallbackName = "") =>
    Number(getInventoryRecordForProduct(productId, fallbackName)?.quantity || 0);

  const getInventoryQuantityForVariant = (
    productId,
    variant,
    fallbackName = "",
  ) => {
    if (!variant?.size && !variant?.color) return null;

    const stockRecord = getInventoryRecordForProduct(productId, fallbackName);
    const match = getVariantDisplayRows(stockRecord).find(
      (row) =>
        String(row.size || "") === String(variant?.size || "") &&
        String(row.color || "") === String(variant?.color || ""),
    );

    return match ? Number(match.quantity || 0) : 0;
  };

  const productDropdownOptions = useMemo(() => {
    return (productsData || []).map((p) => ({
      value: getProductRecordId(p),
      label: p.name,
    }));
  }, [productsData]);

  const productNameMap = useMemo(() => {
    const m = new Map();
    (productsData || []).forEach((p) => {
      const key = getProductRecordId(p);
      m.set(key, p.name);
    });
    return m;
  }, [productsData]);

  const selectedCreateProductId = createProduct?.productId || undefined;
  const selectedEditProductId = currentProduct?.productId || undefined;
  const selectedBulkAddProductId = bulkAddProduct?.productId || undefined;

  const { data: selectedCreateProductRes } =
    useGetSingleReceivedProductByIdQuery(selectedCreateProductId, {
      skip: !selectedCreateProductId,
    });
  const { data: selectedEditProductRes } = useGetSingleReceivedProductByIdQuery(
    selectedEditProductId,
    { skip: !selectedEditProductId },
  );
  const { data: selectedBulkAddProductRes } =
    useGetSingleReceivedProductByIdQuery(selectedBulkAddProductId, {
      skip: !selectedBulkAddProductId,
    });

  const selectedCreateProductData =
    selectedCreateProductRes?.data || selectedCreateProductRes;
  const selectedEditProductData =
    selectedEditProductRes?.data || selectedEditProductRes;
  const selectedBulkAddProductData =
    selectedBulkAddProductRes?.data || selectedBulkAddProductRes;
  const selectedCreateProductDataId = selectedCreateProductData
    ? getProductRecordId(selectedCreateProductData)
    : "";
  const isSelectedCreateProductDataCurrent = Boolean(
    createProduct.productId &&
      selectedCreateProductDataId &&
      selectedCreateProductDataId === String(createProduct.productId),
  );
  const selectedCreateProductVariants = useMemo(
    () =>
      isSelectedCreateProductDataCurrent
        ? getVariantRowsFromProduct(selectedCreateProductData)
        : [],
    [isSelectedCreateProductDataCurrent, selectedCreateProductData],
  );
  const shouldShowCreateVariantOptions = Boolean(
    isSelectedCreateProductDataCurrent && selectedCreateProductVariants.length > 0,
  );

  const createSizeOptions = useMemo(
    () =>
      isSelectedCreateProductDataCurrent
        ? getVariationOptions(selectedCreateProductData, "size")
        : [],
    [isSelectedCreateProductDataCurrent, selectedCreateProductData],
  );
  const createColorOptions = useMemo(
    () =>
      isSelectedCreateProductDataCurrent
        ? getVariationOptions(selectedCreateProductData, "color")
        : [],
    [isSelectedCreateProductDataCurrent, selectedCreateProductData],
  );
  const editSizeOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "size"),
    [selectedEditProductData],
  );
  const editColorOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "color"),
    [selectedEditProductData],
  );
  const bulkAddSizeOptions = useMemo(
    () => getVariationOptions(selectedBulkAddProductData, "size"),
    [selectedBulkAddProductData],
  );
  const bulkAddColorOptions = useMemo(
    () => getVariationOptions(selectedBulkAddProductData, "color"),
    [selectedBulkAddProductData],
  );
  const shouldShowBulkAddVariantOptions = useMemo(
    () => getVariantRowsFromProduct(selectedBulkAddProductData).length > 0,
    [selectedBulkAddProductData],
  );

  useEffect(() => {
    if (
      !createProduct.productId ||
      !selectedCreateProductData ||
      !isSelectedCreateProductDataCurrent
    ) {
      return;
    }

    const productId = String(createProduct.productId);
    const productVariants = selectedCreateProductVariants;

    if (productVariants.length > 0) {
      if (preparedVariantProductIdRef.current === productId) return;
      preparedVariantProductIdRef.current = productId;

      setCreateProduct((prev) => {
        if (String(prev.productId) !== productId) return prev;
        return {
          ...prev,
          sku: selectedCreateProductData?.sku || "",
          weight: selectedCreateProductData?.weight || "",
          purchase_price: getProductBasePrice(
            selectedCreateProductData,
            "purchase_price",
          ),
          sale_price: getProductBasePrice(selectedCreateProductData, "sale_price"),
          variantRows: [createEmptyVariantRow()],
          quantity: "",
        };
      });
      return;
    }

    const label =
      productNameMap.get(productId) ||
      selectedCreateProductData?.name ||
      `Product #${productId}`;

    setCreateProductItems((prev) => [
      ...prev,
      {
        label,
        payload: {
          productId: Number(productId) || "",
          supplierId: Number(createProduct.supplierId) || "",
          bookId: Number(createProduct.bookId) || "",
          warehouseId: Number(createProduct.warehouseId) || "",
          quantity: "",
          variants: [],
          sku: selectedCreateProductData?.sku || "",
          weight: selectedCreateProductData?.weight || "",
          purchase_price: blankIfZero(
            getProductBasePrice(selectedCreateProductData, "purchase_price"),
          ),
          sale_price: blankIfZero(
            getProductBasePrice(selectedCreateProductData, "sale_price"),
          ),
          date: createProduct.date || "",
          note: createProduct.note || "",
          warrantyValue: createProduct.hasWarranty
            ? createProduct.warrantyValue || ""
            : "",
          warrantyUnit: createProduct.hasWarranty
            ? createProduct.warrantyUnit || "Day"
            : "",
        },
      },
    ]);
    resetCreateReceivedProductFields();
  }, [
    createProduct.productId,
    selectedCreateProductData,
    isSelectedCreateProductDataCurrent,
    selectedCreateProductVariants,
    productNameMap,
    createProduct.supplierId,
    createProduct.bookId,
    createProduct.warehouseId,
    createProduct.date,
    createProduct.note,
    createProduct.hasWarranty,
    createProduct.warrantyValue,
    createProduct.warrantyUnit,
  ]);

  const updateVariantRow = (mode, index, key, value) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;

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
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setPendingVariantScrollMode(mode);

    setter((prev) => ({
      ...prev,
      variantRows: [
        ...normalizeVariantRows(prev?.variantRows),
        createEmptyVariantRow(),
      ],
      quantity: String(getVariantRowsTotalQuantity(prev?.variantRows)),
    }));
  };

  useEffect(() => {
    if (pendingVariantScrollMode !== "edit" || !isModalOpen) return;

    const variantRows = normalizeVariantRows(currentProduct?.variantRows);
    const scrollContainer = editModalBodyRef.current;
    const lastRow = editVariantRowRefs.current[variantRows.length - 1];

    if (!scrollContainer || !lastRow) return;

    const timeoutId = window.setTimeout(() => {
      const targetTop = lastRow.offsetTop - scrollContainer.offsetTop - 24;

      scrollContainer.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });
      setPendingVariantScrollMode(null);
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [currentProduct?.variantRows, isModalOpen, pendingVariantScrollMode]);

  useEffect(() => {
    if (pendingVariantScrollMode !== "create" || !isModalOpen1) return;

    const variantRows = normalizeVariantRows(createProduct?.variantRows);
    const scrollContainer = createModalBodyRef.current;
    const lastRow = createVariantRowRefs.current[variantRows.length - 1];

    if (!scrollContainer || !lastRow) return;

    const timeoutId = window.setTimeout(() => {
      const targetTop = lastRow.offsetTop - scrollContainer.offsetTop - 24;

      scrollContainer.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });
      setPendingVariantScrollMode(null);
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [createProduct?.variantRows, isModalOpen1, pendingVariantScrollMode]);

  const removeVariantRow = (mode, index) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;

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

  const resolveProductName = (rp) => {
    const pid =
      rp.productId ??
      rp.product_id ??
      rp.ProductId ??
      rp.product?.Id ??
      rp.product?.id ??
      rp.product?._id;

    if (rp.productName) return rp.productName;
    if (rp.product?.name) return rp.product?.name;

    if (pid === null || pid === undefined || pid === "") return "N/A";

    const byId = productNameMap.get(String(pid));
    if (byId) return byId;

    const pidText = String(pid);
    const looksLikeName = (productsData || []).some((p) => p.name === pidText);
    if (looksLikeName) return pidText;

    return "N/A";
  };

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: productName || undefined,
      warehouseId: warehouse || undefined,
      supplierId: supplier || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "") {
        delete args[k];
      }
    });

    return args;
  }, [
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
    productName,
    warehouse,
    supplier,
  ]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllReceivedProductQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching received product data", error);
      return;
    }

    if (!isLoading && data) {
      setRows(data.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // ✅ Modal handlers
  const handleAddProduct = () => {
    setCreateProduct(initialCreateProduct);
    setCreateProductItems([]);
    setIsModalOpen1(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
    resetBulkAddProduct();
  };

  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setCreateProduct(initialCreateProduct);
    setCreateProductItems([]);
  };

  const handleModalClose2 = () => {
    setIsModalOpen2(false);
    setCurrentProduct(null);
  };

  const [updateReceivedProduct] = useUpdateReceivedProductMutation();

  const handleEditClick = (rp) => {
    const bulkItems = parseReceivedItems(rp.items);
    const variantRows = getInitialVariantRowsFromRecord(rp);
    const editItems =
      bulkItems.length > 0
        ? hydrateReceivedItemsForEdit(bulkItems, rp)
        : [
            {
              productId: Number(rp.productId) || "",
              name:
                rp.name ||
                rp.product?.name ||
                productNameMap.get(String(rp.productId)) ||
                `Product #${rp.productId || "-"}`,
              quantity:
                getVariantRowsTotalQuantity(variantRows) ||
                Number(rp.quantity) ||
                0,
              variants: getVariantDisplayRows(rp),
              sku: rp.sku ?? "",
              weight: rp.weight ?? "",
              purchase_price: Number(rp.purchase_price) || 0,
              sale_price: Number(rp.sale_price) || 0,
            },
          ];

    setCurrentProduct({
      ...rp,
      items: bulkItems.length > 0 ? editItems : [],
      productId: rp.productId ? String(rp.productId) : "",
      supplierId: rp.supplierId ?? "",
      warehouseId: rp.warehouseId ?? "",
      bookId: rp.bookId ?? "",
      sku: rp.sku ?? "",
      weight: rp.weight ?? "",
      purchase_price: rp.purchase_price ?? "",
      sale_price: rp.sale_price ?? "",
      duePayment: rp.duePayment ?? "",
      supplier: rp.supplier ?? "",
      date: rp.date ?? "",
      note: rp.note ?? "",
      file: rp.file ?? null,
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),

      // ✅ Warranty preload
      hasWarranty: !!rp.warrantyValue,
      warrantyValue: rp.warrantyValue ?? "",
      warrantyUnit: rp.warrantyUnit ?? "Day",

      userId,
    });

    setIsModalOpen(true);
    resetBulkAddProduct();
  };

  const handleEditClick1 = (rp) => {
    const variantRows = getInitialVariantRowsFromRecord(rp);

    setCurrentProduct({
      ...rp,
      productId: rp.productId ? String(rp.productId) : "",
      supplierId: rp.supplierId ?? "",
      warehouseId: rp.warehouseId ?? "",
      bookId: rp.bookId ?? "",
      sku: rp.sku ?? "",
      weight: rp.weight ?? "",
      purchase_price: rp.purchase_price ?? "",
      sale_price: rp.sale_price ?? "",
      supplier: rp.supplier ?? "",
      note: rp.note ?? "",
      file: rp.file ?? null,
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),

      // ✅ Warranty preload
      hasWarranty: !!rp.warrantyValue,
      warrantyValue: rp.warrantyValue ?? "",
      warrantyUnit: rp.warrantyUnit ?? "Day",

      userId,
    });

    setIsModalOpen2(true);
  };

  const handleUpdateProduct = async () => {
    try {
      const bulkItems = parseReceivedItems(currentProduct.items);
      if (
        bulkItems.length > 0 &&
        bulkItems.some((item) => Number(item.quantity) <= 0)
      ) {
        return toast.error("Please enter quantity for every product");
      }

      const variantsPayload = getNormalizedVariantsPayload(
        currentProduct?.variantRows,
        currentProduct?.sku,
      );
      if (hasDuplicateVariantCombination(variantsPayload)) {
        return toast.error("Duplicate size and color combination found");
      }
      const firstVariantPrice = variantsPayload.find(
        (variant) => variant.purchase_price || variant.sale_price,
      );
      const primaryBulkItem = bulkItems[0] || {};

      const fd = new FormData();
      fd.append(
        "productId",
        Number(primaryBulkItem.productId || currentProduct.productId) || "",
      );
      fd.append("bookId", Number(currentProduct.bookId) || "");
      fd.append("supplierId", Number(currentProduct.supplierId) || "");
      fd.append("warehouseId", Number(currentProduct.warehouseId) || "");
      fd.append(
        "quantity",
        Number(primaryBulkItem.quantity || currentProduct.quantity) || 0,
      );
      fd.append("variants", JSON.stringify(variantsPayload));
      if (bulkItems.length > 0) {
        fd.append("items", JSON.stringify(bulkItems));
      }
      fd.append("sku", primaryBulkItem.sku || currentProduct.sku || "");
      fd.append("weight", primaryBulkItem.weight || currentProduct.weight || "");
      fd.append(
        "purchase_price",
        Number(firstVariantPrice?.purchase_price) ||
          Number(primaryBulkItem.purchase_price) ||
          Number(currentProduct.purchase_price) ||
          0,
      );
      fd.append(
        "sale_price",
        Number(firstVariantPrice?.sale_price) ||
          Number(primaryBulkItem.sale_price) ||
          Number(currentProduct.sale_price) ||
          0,
      );
      fd.append("date", currentProduct.date || "");
      fd.append("note", currentProduct.note || "");
      fd.append("status", currentProduct.status || "");
      fd.append("userId", Number(currentProduct.userId) || 0);
      fd.append("actorRole", role);

      if (currentProduct.file instanceof File) {
        fd.append("file", currentProduct.file);
      }

      // ✅ Warranty
      fd.append(
        "warrantyValue",
        currentProduct?.hasWarranty ? currentProduct.warrantyValue || "" : "",
      );
      fd.append(
        "warrantyUnit",
        currentProduct?.hasWarranty ? currentProduct.warrantyUnit || "Day" : "",
      );

      const res = await updateReceivedProduct({
        id: currentProduct.Id,
        data: fd,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdateProduct1 = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (currentProduct?.note === "" || currentProduct?.note === null) {
      return toast.error("Note is required!");
    }

    try {
      const variantsPayload = getNormalizedVariantsPayload(
        currentProduct?.variantRows,
        currentProduct?.sku,
      );
      if (hasDuplicateVariantCombination(variantsPayload)) {
        return toast.error("Duplicate size and color combination found");
      }
      const firstVariantPrice = variantsPayload.find(
        (variant) => variant.purchase_price || variant.sale_price,
      );
      const bulkItems = parseReceivedItems(currentProduct.items);
      const primaryBulkItem = bulkItems[0] || {};

      const fd = new FormData();
      fd.append(
        "productId",
        Number(primaryBulkItem.productId || currentProduct.productId) || "",
      );
      fd.append("bookId", Number(currentProduct.bookId) || "");
      fd.append("supplierId", Number(currentProduct.supplierId) || "");
      fd.append("warehouseId", Number(currentProduct.warehouseId) || "");
      fd.append(
        "quantity",
        Number(primaryBulkItem.quantity || currentProduct.quantity) || 0,
      );
      fd.append("variants", JSON.stringify(variantsPayload));
      if (bulkItems.length > 0) {
        fd.append("items", JSON.stringify(bulkItems));
      }
      fd.append("sku", primaryBulkItem.sku || currentProduct.sku || "");
      fd.append("weight", primaryBulkItem.weight || currentProduct.weight || "");
      fd.append(
        "purchase_price",
        Number(firstVariantPrice?.purchase_price) ||
          Number(primaryBulkItem.purchase_price) ||
          Number(currentProduct.purchase_price) ||
          0,
      );
      fd.append(
        "sale_price",
        Number(firstVariantPrice?.sale_price) ||
          Number(primaryBulkItem.sale_price) ||
          Number(currentProduct.sale_price) ||
          0,
      );
      fd.append("date", currentProduct.date || "");
      fd.append("note", currentProduct.note || "");
      fd.append("status", currentProduct.status || "");
      fd.append("userId", Number(currentProduct.userId) || 0);
      fd.append("actorRole", role);

      if (currentProduct.file instanceof File) {
        fd.append("file", currentProduct.file);
      }

      // ✅ Warranty
      fd.append(
        "warrantyValue",
        currentProduct?.hasWarranty ? currentProduct.warrantyValue || "" : "",
      );
      fd.append(
        "warrantyUnit",
        currentProduct?.hasWarranty ? currentProduct.warrantyUnit || "Day" : "",
      );

      const res = await updateReceivedProduct({
        id: currentProduct.Id,
        data: fd,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen2(false);
        setCurrentProduct(null);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ✅ Insert
  const [insertReceivedProduct] = useInsertReceivedProductMutation();

  const buildCreateProductPayload = () => {
    if (!createProduct.productId) return { error: "Please select a product" };
    if (!createProduct.quantity || Number(createProduct.quantity) <= 0) {
      return { error: "Please enter a valid quantity" };
    }

    const variantsPayload = getNormalizedVariantsPayload(
      createProduct.variantRows,
      createProduct.sku,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }

    const selectedProduct = productDropdownOptions.find(
      (option) => option.value === String(createProduct.productId),
    );
    const firstVariantPrice = variantsPayload.find(
      (variant) => variant.purchase_price || variant.sale_price,
    );

    return {
      payload: {
        productId: Number(createProduct.productId) || "",
        supplierId: Number(createProduct.supplierId) || "",
        bookId: Number(createProduct.bookId) || "",
        warehouseId: Number(createProduct.warehouseId) || "",
        quantity: Number(createProduct.quantity) || 0,
        variants: variantsPayload,
        sku: createProduct.sku || "",
        weight: createProduct.weight || "",
        purchase_price:
          Number(firstVariantPrice?.purchase_price) ||
          Number(createProduct.purchase_price) ||
          0,
        sale_price:
          Number(firstVariantPrice?.sale_price) ||
          Number(createProduct.sale_price) ||
          0,
        date: createProduct.date || "",
        note: createProduct.note || "",
        warrantyValue: createProduct.hasWarranty
          ? createProduct.warrantyValue || ""
          : "",
        warrantyUnit: createProduct.hasWarranty
          ? createProduct.warrantyUnit || "Day"
          : "",
      },
      label:
        selectedProduct?.label ||
        productNameMap.get(String(createProduct.productId)) ||
        `Product #${createProduct.productId}`,
    };
  };

  const appendReceivedPayload = (fd, payload) => {
    Object.entries(payload).forEach(([key, value]) => {
      fd.append(key, key === "variants" ? JSON.stringify(value) : value);
    });
  };

  const resetCreateReceivedProductFields = () => {
    setCreateProduct((prev) => ({
      ...prev,
      productId: "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
      sku: "",
      weight: "",
      purchase_price: "",
      sale_price: "",
      hasWarranty: false,
      warrantyValue: "",
      warrantyUnit: "Day",
    }));
  };

  const updateCreateProductItem = (index, key, value) => {
    setCreateProductItems((prev) =>
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

  const updateCreateProductItemVariantField = (
    itemIndex,
    variantIndex,
    key,
    value,
  ) => {
    setCreateProductItems((prev) =>
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
            purchase_price:
              Number(
                nextVariants.find((variant) => variant.purchase_price)
                  ?.purchase_price,
              ) ||
              item.payload.purchase_price ||
              0,
            sale_price:
              Number(
                nextVariants.find((variant) => variant.sale_price)?.sale_price,
              ) ||
              item.payload.sale_price ||
              0,
          },
        };
      }),
    );
  };

  const updateCurrentProductBulkItem = (index, key, value) => {
    setCurrentProduct((prev) => ({
      ...prev,
      items: parseReceivedItems(prev?.items).map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    }));
  };

  const updateCurrentProductBulkItemVariantField = (
    itemIndex,
    variantIndex,
    key,
    value,
  ) => {
    setCurrentProduct((prev) => ({
      ...prev,
      items: parseReceivedItems(prev?.items).map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) return item;

        const variants = (item.variants || []).map(
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
          variants,
          quantity: variants.reduce(
            (total, variant) => total + (Number(variant.quantity) || 0),
            0,
          ),
          purchase_price:
            Number(
              variants.find((variant) => variant.purchase_price)
                ?.purchase_price,
            ) ||
            item.purchase_price ||
            0,
          sale_price:
            Number(variants.find((variant) => variant.sale_price)?.sale_price) ||
            item.sale_price ||
            0,
        };
      }),
    }));
  };

  const resetBulkAddProduct = () => {
    setBulkAddProduct(initialBulkAddProduct);
  };

  const handleBulkAddProductSelect = (selected) => {
    const selectedProduct = productsData.find(
      (product) => getProductRecordId(product) === String(selected?.value || ""),
    );

    setBulkAddProduct((prev) => ({
      ...prev,
      productId: selected?.value || "",
      sku: selectedProduct?.sku || "",
      weight: selectedProduct?.weight || "",
      purchase_price: blankIfZero(
        getProductBasePrice(selectedProduct, "purchase_price"),
      ),
      sale_price: blankIfZero(getProductBasePrice(selectedProduct, "sale_price")),
      variantRows: [createEmptyVariantRow()],
      quantity: "",
    }));
  };

  const updateBulkAddProductVariantRow = (index, key, value) => {
    setBulkAddProduct((prev) => {
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

  const addBulkAddProductVariantRow = () => {
    setBulkAddProduct((prev) => ({
      ...prev,
      variantRows: [
        ...normalizeVariantRows(prev?.variantRows),
        createEmptyVariantRow(),
      ],
    }));
  };

  const removeBulkAddProductVariantRow = (index) => {
    setBulkAddProduct((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).filter(
        (_, rowIndex) => rowIndex !== index,
      );

      return {
        ...prev,
        variantRows: nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
        quantity: String(getVariantRowsTotalQuantity(nextRows)),
      };
    });
  };

  const buildBulkAddProductItem = () => {
    if (!bulkAddProduct.productId) return { error: "Please select a product" };

    const variantsPayload = getNormalizedVariantsPayload(
      bulkAddProduct.variantRows,
      bulkAddProduct.sku,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }

    const totalQuantity =
      variantsPayload.length > 0
        ? getVariantRowsTotalQuantity(variantsPayload)
        : Number(bulkAddProduct.quantity) || 0;
    if (totalQuantity <= 0) return { error: "Please enter a valid quantity" };

    const productId = String(bulkAddProduct.productId);
    const selectedProduct = productDropdownOptions.find(
      (option) => option.value === productId,
    );
    const firstVariantPrice = variantsPayload.find(
      (variant) => variant.purchase_price || variant.sale_price,
    );

    return {
      item: {
        productId: Number(productId) || "",
        name:
          selectedProduct?.label ||
          productNameMap.get(productId) ||
          `Product #${productId}`,
        quantity: totalQuantity,
        variants: variantsPayload,
        sku: bulkAddProduct.sku || "",
        weight: bulkAddProduct.weight || "",
        purchase_price:
          Number(firstVariantPrice?.purchase_price) ||
          Number(bulkAddProduct.purchase_price) ||
          0,
        sale_price:
          Number(firstVariantPrice?.sale_price) ||
          Number(bulkAddProduct.sale_price) ||
          0,
      },
    };
  };

  const handleAddBulkReceivedProduct = () => {
    const result = buildBulkAddProductItem();
    if (result.error) return toast.error(result.error);

    setCurrentProduct((prev) => {
      const currentItems = parseReceivedItems(prev?.items);
      const existingIndex = currentItems.findIndex(
        (item) => String(item.productId) === String(result.item.productId),
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
                  Number(result.item.purchase_price) ||
                  Number(item.purchase_price) ||
                  0,
                sale_price:
                  Number(result.item.sale_price) || Number(item.sale_price) || 0,
              }
            : item,
        );

        return {
          ...prev,
          items: nextItems,
          quantity: String(
            nextItems.reduce(
              (total, item) => total + (Number(item.quantity) || 0),
              0,
            ),
          ),
        };
      }

      const nextItems = [...currentItems, result.item];
      return {
        ...prev,
        items: nextItems,
        quantity: String(
          nextItems.reduce(
            (total, item) => total + (Number(item.quantity) || 0),
            0,
          ),
        ),
      };
    });
    resetBulkAddProduct();
  };

  const mergeCreateProductItem = (incomingItem) => {
    setCreateProductItems((prev) => {
      const targetProductId = String(incomingItem.payload?.productId || "");
      const existingIndex = prev.findIndex(
        (item) => String(item.payload?.productId || "") === targetProductId,
      );

      if (existingIndex === -1) return [...prev, incomingItem];

      return prev.map((item, index) => {
        if (index !== existingIndex) return item;

        const variants = [
          ...(item.payload?.variants || []),
          ...(incomingItem.payload?.variants || []),
        ];

        return {
          ...item,
          payload: {
            ...item.payload,
            ...incomingItem.payload,
            quantity:
              (Number(item.payload?.quantity) || 0) +
              (Number(incomingItem.payload?.quantity) || 0),
            variants,
          },
        };
      });
    });
  };

  const createProductItemsTotalQuantity = useMemo(() => {
    const savedTotal = createProductItems.reduce(
      (total, item) => total + (Number(item.payload?.quantity) || 0),
      0,
    );
    const currentTotal =
      createProduct.productId && createProduct.quantity
        ? Number(createProduct.quantity) || 0
        : 0;

    return savedTotal + currentTotal;
  }, [createProductItems, createProduct.productId, createProduct.quantity]);

  const handleCreateReceivedProductSelect = (selected) => {
    if (!selected?.value) {
      preparedVariantProductIdRef.current = "";
      return resetCreateReceivedProductFields();
    }

    preparedVariantProductIdRef.current = "";
    setCreateProduct({
      ...createProduct,
      productId: selected.value,
      variantRows: [createEmptyVariantRow()],
      quantity: "",
      sku: "",
      weight: "",
      purchase_price: "",
      sale_price: "",
    });
  };

  const handleAddCreateProductVariants = () => {
    const item = buildCreateProductPayload();
    if (item.error) return toast.error(item.error);
    mergeCreateProductItem(item);
    resetCreateReceivedProductFields();
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    const commonFields = {
      supplierId: Number(createProduct.supplierId) || "",
      bookId: Number(createProduct.bookId) || "",
      warehouseId: Number(createProduct.warehouseId) || "",
      batchId: createBatchId(),
      date: createProduct.date || "",
      note: createProduct.note || "",
      warrantyValue: createProduct.hasWarranty
        ? createProduct.warrantyValue || ""
        : "",
      warrantyUnit: createProduct.hasWarranty
        ? createProduct.warrantyUnit || "Day"
        : "",
    };

    let items = createProductItems.map((item) => ({
      ...item.payload,
      ...commonFields,
    }));
    if (createProduct.productId) {
      const item = buildCreateProductPayload();
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

    const fd = new FormData();
    if (items.length === 1) {
      appendReceivedPayload(fd, items[0]);
    } else {
      fd.append("items", JSON.stringify(items));
    }

    try {
      const res = await insertReceivedProduct(fd).unwrap();
      if (res?.success) {
        toast.success(
          items.length > 1
            ? "Successfully created received products"
            : "Successfully created received product",
        );
        setIsModalOpen1(false);
        setCreateProduct(initialCreateProduct);
        setCreateProductItems([]);
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // ✅ Delete
  const [deleteReceivedProduct] = useDeleteReceivedProductMutation();

  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({
      title: "Delete received product?",
      message:
        "This received product entry will be removed permanently. This action cannot be undone.",
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteReceivedProduct(id).unwrap();
      if (res?.success !== false) {
        toast.success("Product deleted successfully!");
        refetch?.();
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductName("");
    setWarehouse("");
    setSupplier("");
  };

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  const selectMenuProps = {
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    menuPosition: "fixed",
  };

  // ✅ Books
  const {
    data: allBookRes,
    isError: isErrorBook,
    error: errorBook,
  } = useGetAllBookWithoutQueryQuery();
  const books = allBookRes?.data || [];

  useEffect(() => {
    if (isErrorBook) console.error("Error fetching Books", errorBook);
  }, [isErrorBook, errorBook]);

  const bookOptions = useMemo(
    () =>
      (books || []).map((s) => ({
        value: s.Id,
        label: s.name,
      })),
    [books],
  );

  // ✅ suppliers
  const {
    data: allSupplierRes,
    isError: isErrorSupplier,
    error: errorSupplier,
  } = useGetAllSupplierWithoutQueryQuery();
  const suppliers = useMemo(() => allSupplierRes?.data || [], [allSupplierRes]);

  useEffect(() => {
    if (isErrorSupplier)
      console.error("Error fetching suppliers", errorSupplier);
  }, [isErrorSupplier, errorSupplier]);

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((s) => ({
        value: s.Id,
        label: s.name,
      })),
    [suppliers],
  );

  // ✅ warehouses
  const {
    data: allWarehousesRes,
    isError: isErrorWarehouse,
    error: errorWarehouse,
  } = useGetAllWirehouseWithoutQueryQuery();
  const warehouses = useMemo(
    () => allWarehousesRes?.data || [],
    [allWarehousesRes],
  );

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
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
    setNoteContent("");
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(15,23,42,0.04)] rounded-2xl p-4 sm:p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.received_history || "Purchase History"}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {t.incoming_product_acquisitions ||
              "Track and analyze all incoming product acquisitions"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <ShoppingBasket size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                Total Units
              </div>
              <div className="text-base font-black text-indigo-900 tabular-nums leading-none">
                {isLoading
                  ? "..."
                  : (data?.meta?.totalQuantity ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddProduct}
            className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden w-full sm:w-auto"
          >
            <Plus size={18} /> {t.add_new_received || "Add New Purchase"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.from}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.to}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.per_page_label}
          </label>
          <Select
            options={[10, 20, 50, 100].map((v) => ({
              value: v,
              label: String(v),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => setItemsPerPage(selected?.value || 10)}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.product}
          </label>
          <Select
            options={productDropdownOptions}
            value={
              productDropdownOptions.find((o) => o.label === productName) ||
              null
            }
            onChange={(selected) => setProductName(selected?.label || "")}
            placeholder={t.search}
            isClearable
            isDisabled={isLoadingAllProducts}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.warehouse}
          </label>
          <Select
            options={warehouseOptions}
            value={
              warehouseOptions.find(
                (o) => String(o.value) === String(warehouse),
              ) || null
            }
            onChange={(selected) => setWarehouse(selected?.value || "")}
            placeholder={t.search}
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.supplier}
          </label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (o) => String(o.value) === String(supplier),
              ) || null
            }
            onChange={(selected) => setSupplier(selected?.value || "")}
            placeholder={t.search}
            isClearable
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <button
          type="button"
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={clearFilters}
        >
          <X size={16} /> {t.clear_filters}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="four-row-table-scroll rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.date}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.product || "Product"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.supplier}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.warehouse}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.quantity || "Quantity"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.variants || "Variants"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.financials || "Financials"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.status}
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.actions}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((rp) => {
                const rowItems = getReceivedRowItems(rp);
                const statusValues = [
                  ...new Set(rowItems.map((item) => item.status).filter(Boolean)),
                ];
                const rowTotalQuantity = rowItems.reduce(
                  (total, item) =>
                    total + (Number(item?.quantity) || 0),
                  0,
                );
                const totalBuy = rowItems.reduce(
                  (total, item) =>
                    total +
                    Number(item.purchase_price || 0) *
                      Number(item.quantity || 0),
                  0,
                );
                const totalSell = rowItems.reduce(
                  (total, item) =>
                    total +
                    Number(item.sale_price || 0) * Number(item.quantity || 0),
                  0,
                );

                return (
                  <motion.tr
                    key={rp.Id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-slate-50 group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {rp.date}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">
                        {rowItems
                          .map((item) => resolveProductName(item))
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-700">
                        {rp?.supplier?.name || t.no_supplier || "No Supplier"}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-700">
                        {rp?.warehouse?.name ||
                          t.no_warehouse ||
                          "No Warehouse"}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {Number(rowTotalQuantity || rp.quantity || 0).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 min-w-[260px]">
                      <div className="flex flex-wrap gap-2">
                        {rowItems.map((item) => {
                          const variantDisplayRows = getVariantDisplayRows(item);

                          return variantDisplayRows.length > 0 ? (
                            <div key={item.Id} className="contents">
                              {variantDisplayRows.map((variant, index) => (
                                <div
                                  key={`${item.Id}-variant-${index}`}
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
                                    Unit Buy{" "}
                                    {formatMoney(
                                      variant.purchase_price ||
                                        item.purchase_price,
                                    )}
                                  </div>
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Unit Sell{" "}
                                    {formatMoney(
                                      variant.sale_price || item.sale_price,
                                    )}
                                  </div>
                                  {variant?.sku ? (
                                    <div className="mt-2 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 border border-indigo-100 break-all leading-relaxed">
                                      SKU: {variant.sku}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              key={item.Id}
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
                                Unit Buy {formatMoney(item.purchase_price)}
                              </div>
                              <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                Unit Sell {formatMoney(item.sale_price)}
                              </div>
                              <div className="mt-2 text-[10px] font-semibold text-slate-400">
                                No variants
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {t.total_buy_label || "Total Buy"}:{" "}
                          <span className="text-slate-900 border-b border-dotted border-slate-300">
                            {formatMoney(totalBuy)}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {t.total_sell_label || "Total Sell"}:{" "}
                          <span className="text-emerald-600">
                            {formatMoney(totalSell)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                          rp.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100"
                            : rp.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100"
                        }`}
                      >
                        {statusValues.length > 1 ? "Mixed" : rp.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {rp.note ? (
                          <div className="relative">
                            <button
                              className="relative h-10 w-10 rounded-md flex items-center justify-center"
                              title={rp.note}
                              type="button"
                              onClick={() => handleNoteClick(rp.note)}
                            >
                              <Notebook size={18} className="text-slate-700" />
                            </button>

                            <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                              1
                            </span>
                          </div>
                        ) : (
                          <button
                            className="h-10 w-10 rounded-md flex items-center justify-center cursor-default"
                            title={t.no_note_available || "No note available"}
                            type="button"
                          >
                            <Notebook size={18} className="text-slate-300" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditClick(rp)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm"
                          title={t.edit_record || "Edit"}
                        >
                          <Edit size={16} />
                        </button>

                        {role === "superAdmin" || role === "admin" ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(rp.Id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                            title={t.delete_record || "Delete"}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEditClick1(rp)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition shadow-sm"
                            title={t.request_delete || "Request Delete"}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-20 text-center text-sm text-slate-400 italic"
                  >
                    {t.no_purchase_records}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {t.showing_page || "Showing Page"}{" "}
          <span className="text-indigo-600">{currentPage}</span> {t.of || "of"}{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> {t.prev}
          </button>

          <div className="flex items-center gap-1.5">
            {[...Array(endPage - startPage + 1)].map((_, index) => {
              const pageNum = startPage + index;
              const active = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${
                    active
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                      : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextSet}
            disabled={endPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            {t.next} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Note Preview Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title={t.note_preview || "Note Preview"}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-h-[120px]">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent || t.no_note_available || "No note available."}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNoteModalClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition shadow-sm active:scale-95"
            >
              {t.done || "Done"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Purchase Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title={t.edit_received_product || "Edit Purchase Product"}
      >
        <div
          ref={editModalBodyRef}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          {isEditingBulkReceivedProduct && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product Line Items
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Edit the products saved in this bulk received row
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Quantity
                  </p>
                  <p className="text-lg font-black text-slate-900">
                    {currentProductBulkTotalQuantity}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-3 text-left">Product</th>
                      <th className="px-3 py-3 text-left">Product Detail</th>
                      <th className="px-3 py-3 text-left">Variant Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentProductBulkItems.map((item, index) => (
                      <tr key={`${item.productId}-${index}`}>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {item.name ||
                            productNameMap.get(String(item.productId)) ||
                            `Product #${item.productId}`}
                        </td>
                        <td className="px-3 py-3">
                          {item.variants?.length > 0 ? (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Total Quantity
                              </p>
                              <p className="text-base font-black text-slate-900">
                                {item.quantity}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Qty
                                </p>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.quantity || ""}
                                  onChange={(e) =>
                                    updateCurrentProductBulkItem(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Stock:{" "}
                                  {getInventoryQuantityForProduct(
                                    item.productId,
                                    item.name,
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Purchase
                                </p>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.purchase_price || ""}
                                  onChange={(e) =>
                                    updateCurrentProductBulkItem(
                                      index,
                                      "purchase_price",
                                      e.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                              </div>
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Sale
                                </p>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.sale_price || ""}
                                  onChange={(e) =>
                                    updateCurrentProductBulkItem(
                                      index,
                                      "sale_price",
                                      e.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {item.variants?.length
                            ? item.variants.map((variant, variantIndex) => (
                                <div
                                  key={`${variant.size}-${variant.color}-${variantIndex}`}
                                  className="mb-2 grid grid-cols-[1fr_72px_92px_92px] items-end gap-2 last:mb-0"
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
                                        updateCurrentProductBulkItemVariantField(
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
                                      {getInventoryQuantityForVariant(
                                        item.productId,
                                        variant,
                                        item.name,
                                      ) ?? 0}
                                    </p>
                                  </div>
                                  <div>
                                    {variantIndex === 0 && (
                                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                        Purchase
                                      </p>
                                    )}
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={variant.purchase_price}
                                      onChange={(e) =>
                                        updateCurrentProductBulkItemVariantField(
                                          index,
                                          variantIndex,
                                          "purchase_price",
                                          e.target.value,
                                        )
                                      }
                                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                  </div>
                                  <div>
                                    {variantIndex === 0 && (
                                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                        Sale
                                      </p>
                                    )}
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={variant.sale_price}
                                      onChange={(e) =>
                                        updateCurrentProductBulkItemVariantField(
                                          index,
                                          variantIndex,
                                          "sale_price",
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

              <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      New Product
                    </label>
                    <Select
                      options={productDropdownOptions}
                      value={
                        productDropdownOptions.find(
                          (option) =>
                            option.value === String(bulkAddProduct.productId),
                        ) || null
                      }
                      onChange={handleBulkAddProductSelect}
                      placeholder={t.search_product || "Search product..."}
                      isClearable
                      styles={selectStyles}
                      {...selectMenuProps}
                      className="text-sm font-medium text-black"
                      isDisabled={isLoadingAllProducts}
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
                        value={bulkAddProduct.quantity}
                        onChange={(e) =>
                          setBulkAddProduct((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        disabled={!bulkAddProduct.productId}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      {bulkAddProduct.productId && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Stock:{" "}
                          {getInventoryQuantityForProduct(
                            bulkAddProduct.productId,
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddBulkReceivedProduct}
                    disabled={!bulkAddProduct.productId}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Add Product
                  </button>
                </div>

                {bulkAddProduct.productId && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <input
                      type="text"
                      value={bulkAddProduct.sku}
                      onChange={(e) =>
                        setBulkAddProduct((prev) => ({
                          ...prev,
                          sku: e.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="SKU"
                    />
                    <input
                      type="text"
                      value={bulkAddProduct.weight}
                      onChange={(e) =>
                        setBulkAddProduct((prev) => ({
                          ...prev,
                          weight: e.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Weight"
                    />
                    <input
                      type="number"
                      value={bulkAddProduct.purchase_price}
                      onChange={(e) =>
                        setBulkAddProduct((prev) => ({
                          ...prev,
                          purchase_price: e.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Purchase"
                    />
                    <input
                      type="number"
                      value={bulkAddProduct.sale_price}
                      onChange={(e) =>
                        setBulkAddProduct((prev) => ({
                          ...prev,
                          sale_price: e.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Sale"
                    />
                  </div>
                )}

                {bulkAddProduct.productId && shouldShowBulkAddVariantOptions && (
                  <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={addBulkAddProductVariantRow}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        <Plus size={14} />
                        Add Variant
                      </button>
                    </div>

                    {normalizeVariantRows(bulkAddProduct.variantRows).map(
                      (row, index) => {
                        const colorOptions = row.size
                          ? getVariationColorsForSize(
                              selectedBulkAddProductData,
                              row.size,
                            )
                          : bulkAddColorOptions;

                        return (
                          <div
                            key={`bulk-received-add-variant-${index}`}
                            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_90px_100px_100px_auto] sm:items-end"
                          >
                            <Select
                              options={bulkAddSizeOptions}
                              value={makeSelectValue(
                                bulkAddSizeOptions,
                                row.size,
                                row.size,
                              )}
                              onChange={(selected) =>
                                updateBulkAddProductVariantRow(
                                  index,
                                  "size",
                                  selected?.value || "",
                                )
                              }
                              placeholder="Size"
                              isClearable
                              styles={selectStyles}
                              {...selectMenuProps}
                              className="text-sm font-medium"
                            />
                            <Select
                              options={colorOptions}
                              value={makeSelectValue(
                                colorOptions,
                                row.color,
                                row.color,
                              )}
                              onChange={(selected) =>
                                updateBulkAddProductVariantRow(
                                  index,
                                  "color",
                                  selected?.value || "",
                                )
                              }
                              placeholder="Color"
                              isClearable
                              styles={selectStyles}
                              {...selectMenuProps}
                              className="text-sm font-medium"
                              isDisabled={!row.size}
                            />
                            <div>
                              <input
                                type="number"
                                value={row.quantity}
                                onChange={(e) =>
                                  updateBulkAddProductVariantRow(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                placeholder="Qty"
                              />
                              {(row.size || row.color) && (
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Stock:{" "}
                                  {getInventoryQuantityForVariant(
                                    bulkAddProduct.productId,
                                    row,
                                  ) ?? 0}
                                </p>
                              )}
                            </div>
                            <input
                              type="number"
                              value={row.purchase_price}
                              onChange={(e) =>
                                updateBulkAddProductVariantRow(
                                  index,
                                  "purchase_price",
                                  e.target.value,
                                )
                              }
                              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                              placeholder="Purchase"
                            />
                            <input
                              type="number"
                              value={row.sale_price}
                              onChange={(e) =>
                                updateBulkAddProductVariantRow(
                                  index,
                                  "sale_price",
                                  e.target.value,
                                )
                              }
                              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                              placeholder="Sale"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeBulkAddProductVariantRow(index)
                              }
                              disabled={
                                normalizeVariantRows(
                                  bulkAddProduct.variantRows,
                                ).length === 1
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

          <div className={isEditingBulkReceivedProduct ? "hidden" : ""}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find(
                  (o) => o.value === String(currentProduct?.productId),
                ) || null
              }
              onChange={(selected) =>
                setCurrentProduct({
                  ...currentProduct,
                  productId: selected?.value || "",
                  variantRows: [createEmptyVariantRow()],
                })
              }
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              {...selectMenuProps}
              className="text-sm font-medium text-black"
              isDisabled={isLoadingAllProducts}
            />
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              isEditingBulkReceivedProduct ? "hidden" : ""
            }`}
          >
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                SKU
              </label>
              <input
                type="text"
                value={currentProduct?.sku || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    sku: e.target.value,
                  })
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                placeholder="HD-2024-001"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Weight (kg)
              </label>
              <input
                type="text"
                value={currentProduct?.weight || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    weight: e.target.value,
                  })
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                placeholder="1.5"
              />
            </div>
          </div>

          <div
            className={`space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 ${
              isEditingBulkReceivedProduct ? "hidden" : ""
            }`}
          >
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
                disabled={!currentProduct?.productId}
              >
                <Plus size={14} />
                Add Variant
              </button>
            </div>

            {normalizeVariantRows(currentProduct?.variantRows).map(
              (row, index) => {
                const colorOptions = row.size
                  ? getVariationColorsForSize(selectedEditProductData, row.size)
                  : editColorOptions;

                return (
                  <div
                    key={`edit-variant-${index}`}
                    ref={(element) => {
                      editVariantRowRefs.current[index] = element;
                    }}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="sm:col-span-2">
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
                        {...selectMenuProps}
                        className="text-sm font-medium"
                        isDisabled={
                          !currentProduct?.productId ||
                          editSizeOptions.length === 0
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
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
                        {...selectMenuProps}
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
                          !currentProduct?.productId ||
                          editSizeOptions.length === 0
                        }
                        className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder=""
                      />
                      {(row.size || row.color) && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Stock:{" "}
                          {getInventoryQuantityForVariant(
                            currentProduct?.productId,
                            row,
                            currentProduct?.name,
                          ) ?? 0}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                        Purchase Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.purchase_price}
                        onChange={(e) =>
                          updateVariantRow(
                            "edit",
                            index,
                            "purchase_price",
                            e.target.value,
                          )
                        }
                        disabled={
                          !currentProduct?.productId ||
                          editSizeOptions.length === 0
                        }
                        className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder=""
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                        Sale Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.sale_price}
                        onChange={(e) =>
                          updateVariantRow(
                            "edit",
                            index,
                            "sale_price",
                            e.target.value,
                          )
                        }
                        disabled={
                          !currentProduct?.productId ||
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
                        normalizeVariantRows(currentProduct?.variantRows)
                          .length === 1
                      }
                    >
                      <X size={16} className="mx-auto" />
                    </button>

                    <div className="sm:col-span-full">
                      <p className="text-[11px] font-semibold text-indigo-600 break-all">
                        Variant SKU:{" "}
                        {generateVariantSku(currentProduct?.sku, row, index) ||
                          "Enter base SKU to auto generate"}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.received_date || "Purchase Date"}
              </label>
              <input
                type="date"
                value={currentProduct?.date || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.warehouse || "Warehouse"}
              </label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentProduct?.warehouseId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    warehouseId: selected?.value || "",
                  })
                }
                placeholder={t.select_warehouse || "Select Warehouse"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.book || "Book"}
              </label>
              <Select
                options={bookOptions}
                value={
                  bookOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentProduct?.bookId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    bookId: selected?.value || "",
                  })
                }
                placeholder={t.select_book || "Select Book"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black"
              />
            </div> */}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.supplier || "Supplier"}
              </label>
              <Select
                options={supplierOptions}
                value={
                  supplierOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentProduct?.supplierId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    supplierId: selected?.value || "",
                  })
                }
                placeholder={t.select_supplier || "Select Supplier"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black"
              />
            </div>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              isEditingBulkReceivedProduct ? "hidden" : ""
            }`}
          >
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.quantity || "Quantity"}
              </label>
              <input
                type="number"
                step="0.01"
                value={currentProduct?.quantity || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, quantity: e.target.value }))
                }
                readOnly={hasConfiguredVariants(currentProduct?.variantRows)}
                className={`w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 outline-none ${
                  hasConfiguredVariants(currentProduct?.variantRows)
                    ? "bg-slate-50"
                    : "bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                }`}
              />
              {!hasConfiguredVariants(currentProduct?.variantRows) && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Stock:{" "}
                  {getInventoryQuantityForProduct(
                    currentProduct?.productId,
                    currentProduct?.name,
                  )}
                </p>
              )}
            </div>
          </div>

          {!isEditingBulkReceivedProduct &&
            !hasConfiguredVariants(currentProduct?.variantRows) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  {t.purchase_price || "Purchase Price"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentProduct?.purchase_price || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      purchase_price: e.target.value,
                    })
                  }
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                  {t.sale_price || "Sale Price"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentProduct?.sale_price || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      sale_price: e.target.value,
                    })
                  }
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          )}

          {/* ✅ Warranty block (Edit) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                  {t.warranty_coverage || "Warranty Coverage"}
                </span>
                <p className="text-[10px] font-bold text-slate-400">
                  {t.enable_warranty_if_product_has_warranty ||
                    "Enable if product has warranty"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentProduct((prev) => ({
                    ...prev,
                    hasWarranty: !prev?.hasWarranty,
                    warrantyValue: prev?.hasWarranty
                      ? ""
                      : prev?.warrantyValue || "",
                    warrantyUnit: prev?.hasWarranty
                      ? "Day"
                      : prev?.warrantyUnit || "Day",
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  currentProduct?.hasWarranty ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">
                  {t.toggle_warranty || "Toggle Warranty"}
                </span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    currentProduct?.hasWarranty
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {currentProduct?.hasWarranty && (
              <div className="bg-white rounded-xl border border-slate-100 m-1 p-4 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.duration || "Duration"}
                </label>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={currentProduct?.warrantyValue || ""}
                    onChange={(e) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        warrantyValue: e.target.value,
                      }))
                    }
                    placeholder="30"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none
                    focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />

                  <Select
                    options={[
                      { value: "Day", label: t.days },
                      { value: "Month", label: t.months || "Months" },
                      { value: "Year", label: t.years || "Years" },
                    ]}
                    value={{
                      value: currentProduct?.warrantyUnit || "Day",
                      label:
                        currentProduct?.warrantyUnit === "Month"
                          ? t.months || "Months"
                          : currentProduct?.warrantyUnit === "Year"
                            ? t.years || "Years"
                            : t.days,
                    }}
                    onChange={(selected) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        warrantyUnit: selected?.value || "Day",
                      }))
                    }
                    styles={selectStyles}
                    className="w-32 text-black"
                  />
                </div>
              </div>
            )}
          </div>

          {role === "superAdmin" || role === "admin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.status || "Status"}
              </label>
              <Select
                options={[
                  { value: "Pending", label: t.pending },
                  { value: "Active", label: t.active },
                  { value: "Approved", label: t.approved },
                ]}
                value={
                  currentProduct?.status
                    ? {
                        value: currentProduct.status,
                        label:
                          currentProduct.status === "Active"
                            ? t.active
                            : currentProduct.status === "Approved"
                              ? t.approved
                              : t.pending,
                      }
                    : null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: selected?.value || "",
                  })
                }
                styles={selectStyles}
                className="text-black"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.note || "Note"}
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full min-h-[90px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                placeholder={t.extra_details || "Extra details..."}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
          <button
            onClick={handleModalClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
          >
            {t.cancel || "Cancel"}
          </button>
          <button
            onClick={handleUpdateProduct}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
          >
            {t.update_changes || "Update Changes"}
          </button>
        </div>
      </Modal>

      {/* Add Purchase Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title={t.add_new_received || "Add New Purchase Product"}
      >
        <form
          onSubmit={handleCreateProduct}
          ref={createModalBodyRef}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find(
                  (o) => o.value === String(createProduct.productId),
                ) || null
              }
              onChange={handleCreateReceivedProductSelect}
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              {...selectMenuProps}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingAllProducts}
            />
          </div>

          {shouldShowCreateVariantOptions && (
            <>
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
                    disabled={!createProduct?.productId}
                  >
                    <Plus size={14} />
                    Add Variant
                  </button>
                </div>

                {normalizeVariantRows(createProduct?.variantRows).map(
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
                        ref={(element) => {
                          createVariantRowRefs.current[index] = element;
                        }}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <div className="sm:col-span-2">
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
                            {...selectMenuProps}
                            className="text-sm text-black font-medium"
                            isDisabled={
                              !createProduct?.productId ||
                              createSizeOptions.length === 0
                            }
                          />
                        </div>

                        <div className="sm:col-span-2">
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
                            {...selectMenuProps}
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
                              !createProduct?.productId ||
                              createSizeOptions.length === 0
                            }
                            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder=""
                          />
                          {createProduct?.productId && (row.size || row.color) && (
                            <p className="mt-1 text-[10px] text-slate-400">
                              Stock:{" "}
                              {getInventoryQuantityForVariant(
                                createProduct.productId,
                                row,
                              ) ?? 0}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Purchase Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.purchase_price}
                            onChange={(e) =>
                              updateVariantRow(
                                "create",
                                index,
                                "purchase_price",
                                e.target.value,
                              )
                            }
                            disabled={
                              !createProduct?.productId ||
                              createSizeOptions.length === 0
                            }
                            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder=""
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Sale Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.sale_price}
                            onChange={(e) =>
                              updateVariantRow(
                                "create",
                                index,
                                "sale_price",
                                e.target.value,
                              )
                            }
                            disabled={
                              !createProduct?.productId ||
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
                            normalizeVariantRows(createProduct?.variantRows)
                              .length === 1
                          }
                        >
                          <X size={16} className="mx-auto" />
                        </button>

                        <div className="sm:col-span-full">
                          <p className="text-[11px] font-semibold text-indigo-600 break-all">
                            Variant SKU:{" "}
                            {generateVariantSku(
                              createProduct?.sku,
                              row,
                              index,
                            ) || "Enter base SKU to auto generate"}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}

                <div className="flex justify-end border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={handleAddCreateProductVariants}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
                  >
                    <Plus size={16} />
                    Add Variants
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={createProduct?.sku || ""}
                    onChange={(e) =>
                      setCreateProduct({
                        ...createProduct,
                        sku: e.target.value,
                      })
                    }
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    placeholder="HD-2024-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    value={createProduct?.weight || ""}
                    onChange={(e) =>
                      setCreateProduct({
                        ...createProduct,
                        weight: e.target.value,
                      })
                    }
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    placeholder="1.5"
                  />
                </div>
              </div>
            </>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product Line Items
                </p>
                <p className="text-[11px] text-slate-400">
                  Select a product above to add a new row; then set quantity and
                  prices here
                </p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Quantity
                </p>
                <p className="text-lg font-black text-slate-900">
                  {createProductItemsTotalQuantity}
                </p>
              </div>
            </div>

            {createProductItems.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-3 text-left">Product</th>
                      <th className="px-3 py-3 text-left">Product Detail</th>
                      <th className="px-3 py-3 text-left">Variant Detail</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {createProductItems.map((item, index) => (
                      <tr key={`${item.label}-${index}`}>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {item.label}
                        </td>
                        <td className="px-3 py-3">
                          {item.payload.variants?.length > 0 ? (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Total Quantity
                              </p>
                              <p className="text-base font-black text-slate-900">
                                {blankIfZero(item.payload.quantity)}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Qty
                                </p>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={blankIfZero(item.payload.quantity)}
                                  onChange={(e) =>
                                    updateCreateProductItem(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Stock:{" "}
                                  {getInventoryQuantityForProduct(
                                    item.payload?.productId,
                                    item.label,
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Purchase
                                </p>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={blankIfZero(item.payload.purchase_price)}
                                  onChange={(e) =>
                                    updateCreateProductItem(
                                      index,
                                      "purchase_price",
                                      e.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                              </div>
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Sale
                                </p>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={blankIfZero(item.payload.sale_price)}
                                  onChange={(e) =>
                                    updateCreateProductItem(
                                      index,
                                      "sale_price",
                                      e.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {item.payload.variants?.length
                            ? item.payload.variants.map(
                                (variant, variantIndex) => (
                                  <div
                                    key={`${variant.size}-${variant.color}-${variantIndex}`}
                                    className="mb-2 grid grid-cols-[1fr_72px_92px_92px] items-end gap-2 last:mb-0"
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
                                          updateCreateProductItemVariantField(
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
                                        {getInventoryQuantityForVariant(
                                          item.payload?.productId,
                                          variant,
                                          item.label,
                                        ) ?? 0}
                                      </p>
                                    </div>
                                    <div>
                                      {variantIndex === 0 && (
                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                          Purchase
                                        </p>
                                      )}
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={variant.purchase_price}
                                        onChange={(e) =>
                                          updateCreateProductItemVariantField(
                                            index,
                                            variantIndex,
                                            "purchase_price",
                                            e.target.value,
                                          )
                                        }
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                      />
                                    </div>
                                    <div>
                                      {variantIndex === 0 && (
                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                          Sale
                                        </p>
                                      )}
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={variant.sale_price}
                                        onChange={(e) =>
                                          updateCreateProductItemVariantField(
                                            index,
                                            variantIndex,
                                            "sale_price",
                                            e.target.value,
                                          )
                                        }
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                      />
                                    </div>
                                  </div>
                                ),
                              )
                            : "No variants"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setCreateProductItems((prev) =>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.received_date || "Purchase Date"}
              </label>
              <input
                type="date"
                value={createProduct?.date || ""}
                onChange={(e) =>
                  setCreateProduct((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.warehouse || "Warehouse"}
              </label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct?.warehouseId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    warehouseId: selected?.value || "",
                  })
                }
                placeholder={t.select_warehouse || "Select Warehouse"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.supplier || "Supplier"}
              </label>
              <Select
                options={supplierOptions}
                value={
                  supplierOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct?.supplierId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    supplierId: selected?.value || "",
                  })
                }
                placeholder={t.select_supplier || "Select Supplier"}
                isClearable
                styles={selectStyles}
                {...selectMenuProps}
                className="text-black"
              />
            </div>
          </div>

          {/* ✅ Warranty block (Add) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                  {t.warranty_coverage || "Warranty Coverage"}
                </span>
                <p className="text-[10px] font-bold text-slate-400">
                  {t.enable_warranty_if_product_has_warranty ||
                    "Enable if product has warranty"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateProduct((prev) => ({
                    ...prev,
                    hasWarranty: !prev?.hasWarranty,
                    warrantyValue: prev?.hasWarranty
                      ? ""
                      : prev?.warrantyValue || "",
                    warrantyUnit: prev?.hasWarranty
                      ? "Day"
                      : prev?.warrantyUnit || "Day",
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  createProduct?.hasWarranty ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">
                  {t.toggle_warranty || "Toggle Warranty"}
                </span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    createProduct?.hasWarranty
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {createProduct?.hasWarranty && (
              <div className="bg-white rounded-xl border border-slate-100 m-1 p-4 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.duration || "Duration"}
                </label>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={createProduct?.warrantyValue || ""}
                    onChange={(e) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        warrantyValue: e.target.value,
                      }))
                    }
                    placeholder="30"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none
                    focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />

                  <select
                    value={createProduct?.warrantyUnit || "Day"}
                    onChange={(e) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        warrantyUnit: e.target.value,
                      }))
                    }
                    className="h-11 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none
                    focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition appearance-none cursor-pointer"
                  >
                    <option value="Day">{t.days}</option>
                    <option value="Month">{t.months || "Months"}</option>
                    <option value="Year">{t.years || "Years"}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.note || "Note"}
            </label>
            <textarea
              value={createProduct?.note || ""}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, note: e.target.value })
              }
              className="w-full min-h-[80px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
              placeholder={t.add_extra_info || "Add any extra info..."}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              {t.cancel || "Cancel"}
            </button>

            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              {createProductItems.length > 0
                ? "Save Products"
                : t.confirm_received || "Confirm Purchase"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Delete Modal */}
      <Modal
        isOpen={isModalOpen2 && !!currentProduct}
        onClose={handleModalClose2}
        title={t.action_confirmation || "Action Confirmation"}
      >
        <div className="space-y-4">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.update_status || "Update Status"}
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: e.target.value,
                  })
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              >
                <option value="Pending">{t.pending}</option>
                <option value="Active">{t.active}</option>
                <option value="Approved">{t.approved}</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.reason_for_removal || "Reason for Removal"}
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full min-h-[120px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                placeholder={
                  t.explain_why_remove_record ||
                  "Please explain why you want to remove this record..."
                }
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose2}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              {t.cancel || "Cancel"}
            </button>

            <button
              onClick={handleUpdateProduct1}
              className="px-8 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition shadow-md shadow-amber-100 active:scale-95"
            >
              {t.submit_request || "Submit Request"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default ReceivedProductTable;
