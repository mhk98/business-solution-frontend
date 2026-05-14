# TODO: Purchase Requisition Invoice (Print & Download)

## Plan

1. Add imports (`useRef`, `Printer` icon, `useReactToPrint`, `html2canvas`, `jsPDF`)
2. Add state & refs (`invoiceOpen`, `invoiceData`, `invoiceRef`)
3. Add `handlePrint` hook using `useReactToPrint`
4. Add `handleDownloadPdf` using `html2canvas` + `jspdf`
5. Add `handleInvoiceClick` to build invoice data from requisition row
6. Add `RequisitionInvoiceModal` component
7. Update Action column — conditionally show invoice button when `status === "Approved"`
8. Render modal at bottom of component

## Status

- [x] Step 1: Add imports
- [x] Step 2: Add state & refs
- [x] Step 3: Add print handler
- [x] Step 4: Add PDF download handler
- [x] Step 5: Add invoice click handler
- [x] Step 6: Add invoice modal component
- [x] Step 7: Update Action column
- [x] Step 8: Render modal
