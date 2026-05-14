import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DUPLICATE_CLASS = "duplicate-same-day-entry";
const DATE_MATCHER =
  /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/;

const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeMetric = (value) => {
  const cleaned = String(value || "")
    .replace(/৳|tk|bdt|units?|pcs|piece|,|\s/gi, "")
    .trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);

  if (!match) return "";

  const number = Number(match[0]);
  return Number.isFinite(number) ? String(number) : "";
};

const normalizeDate = (value) => {
  const match = String(value || "").match(DATE_MATCHER);
  if (!match) return "";

  const raw = match[0].replace(/\//g, "-");
  const parts = raw.split("-");
  if (parts[0]?.length === 4) {
    const [year, month, day] = parts;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0",
    )}`;
  }

  const [day, month, year] = parts;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
};

const isDateHeader = (header) =>
  /\b(date|entry date|day|created|updated)\b/.test(header) &&
  !/\b(start|end|from|to)\b/.test(header);

const keyHeaderPriority = [
  "product",
  "item",
  "campaign",
  "employee",
  "supplier",
  "warehouse",
  "customer",
  "user",
  "account",
  "name",
  "type",
  "category",
  "title",
  "description",
];

const ignoredKeyHeader = (header) =>
  /\b(action|status|date|id|sl|no|note|remarks|amount|total|quantity|qty|price|rate|balance)\b/.test(
    header,
  );

const metricHeaderMatchers = [
  /\b(quantity|qty)\b/,
  /\bamount\b/,
];

const getHeaderTexts = (table) =>
  Array.from(table.querySelectorAll("thead th")).map((header) =>
    normalizeText(header.textContent),
  );

const getDateIndex = (headers, cells) => {
  const headerIndex = headers.findIndex(isDateHeader);
  if (headerIndex >= 0 && normalizeDate(cells[headerIndex]?.textContent)) {
    return headerIndex;
  }

  return cells.findIndex((cell) => normalizeDate(cell.textContent));
};

const getKeyIndex = (headers, cells, dateIndex) => {
  for (const key of keyHeaderPriority) {
    const index = headers.findIndex(
      (header, headerIndex) =>
        headerIndex !== dateIndex &&
        !ignoredKeyHeader(header) &&
        header.includes(key),
    );

    if (index >= 0 && cells[index]?.textContent?.trim()) return index;
  }

  return cells.findIndex((cell, index) => {
    const header = headers[index] || "";
    return (
      index !== dateIndex &&
      !ignoredKeyHeader(header) &&
      normalizeText(cell.textContent).length > 1
    );
  });
};

const getMetricIndexes = (headers, cells, dateIndex, keyIndex) =>
  metricHeaderMatchers
    .map((matcher) =>
      headers.findIndex(
        (header, index) =>
          index !== dateIndex &&
          index !== keyIndex &&
          matcher.test(header) &&
          normalizeMetric(cells[index]?.textContent),
      ),
    )
    .filter((index, position, indexes) => index >= 0 && indexes.indexOf(index) === position);

const markDuplicateRowsInTable = (table) => {
  const headers = getHeaderTexts(table);
  const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
    (row) => row.querySelectorAll("td").length > 1,
  );
  const seen = new Set();

  rows.forEach((row) => {
    row.classList.remove(DUPLICATE_CLASS);
    row.removeAttribute("title");
  });

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    const dateIndex = getDateIndex(headers, cells);
    if (dateIndex < 0) return;

    const date = normalizeDate(cells[dateIndex]?.textContent);
    if (!date) return;

    const keyIndex = getKeyIndex(headers, cells, dateIndex);
    if (keyIndex < 0) return;

    const entryKey = normalizeText(cells[keyIndex]?.textContent);
    if (!entryKey || entryKey === "-") return;

    const metricIndexes = getMetricIndexes(headers, cells, dateIndex, keyIndex);
    const duplicateKeys =
      metricIndexes.length > 0
        ? metricIndexes
            .map((metricIndex) => {
              const metric = normalizeMetric(cells[metricIndex]?.textContent);
              return metric ? `${date}__${entryKey}__${metric}` : "";
            })
            .filter(Boolean)
        : [`${date}__${entryKey}`];

    if (duplicateKeys.some((duplicateKey) => seen.has(duplicateKey))) {
      row.classList.add(DUPLICATE_CLASS);
      row.setAttribute("title", "Same day duplicate entry");
      return;
    }

    duplicateKeys.forEach((duplicateKey) => seen.add(duplicateKey));
  });
};

const highlightDuplicateRows = () => {
  document.querySelectorAll("table").forEach(markDuplicateRowsInTable);
};

const DuplicateSameDayEntryHighlighter = () => {
  const location = useLocation();

  useEffect(() => {
    let frameId = 0;
    const run = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(highlightDuplicateRows);
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [location.pathname]);

  return null;
};

export default DuplicateSameDayEntryHighlighter;
