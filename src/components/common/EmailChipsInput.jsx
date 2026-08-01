import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const splitEmails = (value) =>
  String(value || "")
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeEmail = (email) => String(email || "").trim();

const getUniqueEmails = (items) => {
  const seen = new Set();
  const emails = [];

  items.forEach((item) => {
    const email = normalizeEmail(item);
    const key = email.toLowerCase();
    if (!email || seen.has(key)) return;
    seen.add(key);
    emails.push(email);
  });

  return emails;
};

const EmailChipsInput = forwardRef(function EmailChipsInput(
  {
    value,
    onChange,
    placeholder = "Type email and press Enter",
    disabled = false,
  },
  ref,
) {
  const emails = useMemo(() => getUniqueEmails(splitEmails(value)), [value]);
  const [draft, setDraft] = useState("");
  const [invalidDraft, setInvalidDraft] = useState("");

  useEffect(() => {
    if (!value) {
      setDraft("");
      setInvalidDraft("");
    }
  }, [value]);

  const commitEmails = (rawValue = draft) => {
    const candidates = splitEmails(rawValue);
    if (!candidates.length) {
      return {
        value: emails.join(", "),
        invalidEmails: [],
        committed: false,
      };
    }

    const validEmails = candidates.filter((email) => EMAIL_PATTERN.test(email));
    const invalidEmails = candidates.filter(
      (email) => !EMAIL_PATTERN.test(email),
    );
    const nextEmails = getUniqueEmails([...emails, ...validEmails]);

    if (validEmails.length) {
      onChange(nextEmails.join(", "));
    }

    setDraft(invalidEmails.join(", "));
    setInvalidDraft(invalidEmails.join(", "));
    return {
      value: nextEmails.join(", "),
      invalidEmails,
      committed: Boolean(validEmails.length),
    };
  };

  useImperativeHandle(
    ref,
    () => ({
      commitPendingEmails: () => commitEmails(draft),
      getEmailsValue: () => emails.join(", "),
    }),
    [draft, emails],
  );

  const removeEmail = (emailToRemove) => {
    const nextEmails = emails.filter(
      (email) => email.toLowerCase() !== emailToRemove.toLowerCase(),
    );
    onChange(nextEmails.join(", "));
  };

  const handleKeyDown = (event) => {
    if (
      ["Enter", "Tab", ",", ";"].includes(event.key) ||
      (event.key === " " && EMAIL_PATTERN.test(draft.trim()))
    ) {
      if (draft.trim()) {
        event.preventDefault();
        commitEmails();
      }
      return;
    }

    if (event.key === "Backspace" && !draft && emails.length) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handlePaste = (event) => {
    const pastedText = event.clipboardData.getData("text");
    if (!pastedText || !/[,\s;]/.test(pastedText)) return;

    event.preventDefault();
    commitEmails(`${draft} ${pastedText}`);
  };

  return (
    <div>
      <div
        className={`flex min-h-11 w-full flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 ${
          invalidDraft ? "border-rose-300" : "border-slate-200"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
          >
            <span className="max-w-[210px] truncate">{email}</span>
            <button
              type="button"
              onClick={() => removeEmail(email)}
              disabled={disabled}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:cursor-not-allowed"
              aria-label={`Remove ${email}`}
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalidDraft("");
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (draft.trim()) commitEmails();
          }}
          disabled={disabled}
          placeholder={emails.length ? "" : placeholder}
          className="h-7 min-w-[180px] flex-1 border-0 bg-transparent px-1 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>
      {invalidDraft ? (
        <p className="mt-1.5 text-xs font-medium text-rose-500">
          Invalid email: {invalidDraft}
        </p>
      ) : (
        <p className="mt-1.5 text-xs font-medium text-slate-400">
          Type an email and press Enter, comma, Tab, or paste multiple emails.
        </p>
      )}
    </div>
  );
});

export default EmailChipsInput;
