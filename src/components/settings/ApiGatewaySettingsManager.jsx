import { Cable, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useGetApiGatewaySettingQuery,
  useUpdateApiGatewaySettingMutation,
} from "../../features/apiGateway/apiGateway";
import SettingSection from "./SettingSection";

const SMS_DEFAULTS = {
  apiUrl: "http://bulksmsbd.net/api/smsapi",
  method: "GET",
  apiKey: "",
  apiKeyField: "api_key",
  smsType: "text",
  typeField: "type",
  headers: "",
  bodyTemplate: "",
  queryTemplate:
    '{"api_key":"{apiKey}","type":"{smsType}","number":"{to}","senderid":"{senderId}","message":"{message}"}',
  toField: "number",
  messageField: "message",
  senderId: "",
  senderField: "senderid",
  timeoutMs: 10000,
};

const EMAIL_DEFAULTS = {
  smtpHost: "",
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: "",
  smtpPass: "",
  fromEmail: "",
  fromName: "",
  supportEmail: "",
  brandName: "",
};

const parseGatewayConfig = (config) => {
  if (!config) return {};
  if (typeof config === "object" && !Array.isArray(config)) return config;

  try {
    const parsed = JSON.parse(config);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    return {};
  }
};

const ApiGatewaySettingsManager = ({ gatewayType }) => {
  const isSms = gatewayType === "sms";
  const title = isSms ? "SMS Gateway" : "Email Notification";
  const [isEnabled, setIsEnabled] = useState(true);
  const [form, setForm] = useState(isSms ? SMS_DEFAULTS : EMAIL_DEFAULTS);
  const [showAdvancedSms, setShowAdvancedSms] = useState(false);

  const { data, isLoading } = useGetApiGatewaySettingQuery(gatewayType);
  const [updateSetting, { isLoading: isSaving }] =
    useUpdateApiGatewaySettingMutation();

  useEffect(() => {
    const setting = data?.data;
    const defaults = isSms ? SMS_DEFAULTS : EMAIL_DEFAULTS;
    setIsEnabled(setting?.isEnabled ?? true);
    setForm({ ...defaults, ...parseGatewayConfig(setting?.config) });
  }, [data, isSms]);

  const helperText = useMemo(
    () =>
      isSms
        ? "BulkSMSBD থেকে পাওয়া API Key এবং approved Sender ID দিলেই Appointment Serial create করলে mobile number-এ SMS যাবে।"
        : "Notification email-এর SMTP credentials এখান থেকে update করা যাবে। Password masked থাকলে পুরনো password রাখা হবে।",
    [isSms],
  );

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await updateSetting({
        gatewayType,
        data: {
          isEnabled,
          config: form,
        },
      }).unwrap();
      toast.success(`${title} saved successfully.`);
    } catch (error) {
      toast.error(error?.data?.message || `Failed to save ${title}.`);
    }
  };

  return (
    <SettingSection icon={Cable} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              {helperText}
            </p>
          </div>

          <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(event) => setIsEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Enabled
          </label>
        </div>

        {isSms ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">BulkSMSBD setup</p>
              <p className="mt-1">
                শুধু <span className="font-semibold">API Key</span> এবং{" "}
                <span className="font-semibold">Sender ID</span> বসালেই হবে।
                Mobile number Appointment form থেকে auto যাবে।
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <GatewayInput
                label="API Key"
                type="password"
                value={form.apiKey}
                onChange={(value) => updateField("apiKey", value)}
                placeholder="BulkSMSBD API key"
              />
              <GatewayInput
                label="Sender ID"
                value={form.senderId}
                onChange={(value) => updateField("senderId", value)}
                placeholder="8809604904732"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedSms((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {showAdvancedSms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Advanced SMS Settings
            </button>

            {showAdvancedSms && (
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
                <GatewayInput
                  label="API URL"
                  value={form.apiUrl}
                  onChange={(value) => updateField("apiUrl", value)}
                  placeholder="https://sms-provider.com/api/send"
                />
                <GatewaySelect
                  label="Method"
                  value={form.method}
                  onChange={(value) => updateField("method", value)}
                  options={["POST", "GET"]}
                />
                <GatewayTextarea
                  label="Headers JSON"
                  value={form.headers}
                  onChange={(value) => updateField("headers", value)}
                  placeholder='{"Authorization":"Bearer token"}'
                />
                <GatewayTextarea
                  label="Body Template JSON"
                  value={form.bodyTemplate}
                  onChange={(value) => updateField("bodyTemplate", value)}
                  placeholder='{"to":"{to}","message":"{message}"}'
                />
                <GatewayTextarea
                  label="Query Template JSON"
                  value={form.queryTemplate}
                  onChange={(value) => updateField("queryTemplate", value)}
                  placeholder='{"api_key":"{apiKey}","type":"text","number":"{to}","senderid":"{senderId}","message":"{message}"}'
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <GatewayInput
                    label="API Key Field"
                    value={form.apiKeyField}
                    onChange={(value) => updateField("apiKeyField", value)}
                  />
                  <GatewayInput
                    label="To Field"
                    value={form.toField}
                    onChange={(value) => updateField("toField", value)}
                  />
                  <GatewayInput
                    label="Message Field"
                    value={form.messageField}
                    onChange={(value) => updateField("messageField", value)}
                  />
                  <GatewayInput
                    label="Sender Field"
                    value={form.senderField}
                    onChange={(value) => updateField("senderField", value)}
                    placeholder="senderid"
                  />
                  <GatewayInput
                    label="SMS Type"
                    value={form.smsType}
                    onChange={(value) => updateField("smsType", value)}
                    placeholder="text"
                  />
                  <GatewayInput
                    label="Type Field"
                    value={form.typeField}
                    onChange={(value) => updateField("typeField", value)}
                  />
                  <GatewayInput
                    label="Timeout MS"
                    type="number"
                    value={form.timeoutMs}
                    onChange={(value) => updateField("timeoutMs", value)}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <GatewayInput
              label="SMTP Host"
              value={form.smtpHost}
              onChange={(value) => updateField("smtpHost", value)}
              placeholder="smtp.hostinger.com"
            />
            <GatewayInput
              label="SMTP Port"
              type="number"
              value={form.smtpPort}
              onChange={(value) => updateField("smtpPort", value)}
            />
            <GatewayInput
              label="SMTP User"
              value={form.smtpUser}
              onChange={(value) => updateField("smtpUser", value)}
            />
            <GatewayInput
              label="SMTP Password"
              type="password"
              value={form.smtpPass}
              onChange={(value) => updateField("smtpPass", value)}
            />
            <GatewayInput
              label="From Email"
              value={form.fromEmail}
              onChange={(value) => updateField("fromEmail", value)}
            />
            <GatewayInput
              label="From Name"
              value={form.fromName}
              onChange={(value) => updateField("fromName", value)}
            />
            <GatewayInput
              label="Support Email"
              value={form.supportEmail}
              onChange={(value) => updateField("supportEmail", value)}
            />
            <GatewayInput
              label="Brand Name"
              value={form.brandName}
              onChange={(value) => updateField("brandName", value)}
            />
            <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.smtpSecure)}
                onChange={(event) =>
                  updateField("smtpSecure", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              SMTP Secure
            </label>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Credentials"}
          </button>
        </div>
      </form>
    </SettingSection>
  );
};

const GatewayInput = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) => (
  <label className="block">
    <span className="block text-sm font-semibold text-slate-700 mb-1">
      {label}
    </span>
    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
    />
  </label>
);

const GatewaySelect = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-slate-700 mb-1">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const GatewayTextarea = ({ label, value, onChange, placeholder = "" }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-slate-700 mb-1">
      {label}
    </span>
    <textarea
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
    />
  </label>
);

export default ApiGatewaySettingsManager;
