let isDeleteConfirmationProviderReady = false;

export const setDeleteConfirmationProviderReady = (isReady) => {
  isDeleteConfirmationProviderReady = isReady;
};

export const requestDeleteConfirmation = (options = {}) =>
  new Promise((resolve) => {
    const message =
      options.message ||
      "This record will be removed permanently. This action cannot be undone.";

    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (!isDeleteConfirmationProviderReady) {
      resolve(window.confirm(message));
      return;
    }

    window.dispatchEvent(
      new CustomEvent("delete-confirmation:open", {
        detail: {
          title: "Delete record?",
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
          ...options,
          message,
          resolve,
        },
      }),
    );
  });
