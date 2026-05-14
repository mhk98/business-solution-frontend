import { useCallback, useEffect, useState } from "react";
import { setDeleteConfirmationProviderReady } from "../../utils/deleteConfirmation";
import ConfirmDialog from "./ConfirmDialog";

const initialDialog = {
  isOpen: false,
  title: "Delete record?",
  message: "This record will be removed permanently. This action cannot be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  resolve: null,
};

const DeleteConfirmationProvider = () => {
  const [dialog, setDialog] = useState(initialDialog);

  useEffect(() => {
    setDeleteConfirmationProviderReady(true);

    const handleOpen = (event) => {
      setDialog({
        ...initialDialog,
        ...(event.detail || {}),
        isOpen: true,
      });
    };

    window.addEventListener("delete-confirmation:open", handleOpen);

    return () => {
      setDeleteConfirmationProviderReady(false);
      window.removeEventListener("delete-confirmation:open", handleOpen);
    };
  }, []);

  const closeDialog = useCallback(
    (confirmed) => {
      dialog.resolve?.(confirmed);
      setDialog(initialDialog);
    },
    [dialog],
  );

  return (
    <ConfirmDialog
      isOpen={dialog.isOpen}
      title={dialog.title}
      message={dialog.message}
      confirmLabel={dialog.confirmLabel}
      cancelLabel={dialog.cancelLabel}
      onCancel={() => closeDialog(false)}
      onConfirm={() => closeDialog(true)}
    />
  );
};

export default DeleteConfirmationProvider;
