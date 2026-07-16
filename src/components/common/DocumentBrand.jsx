import { useGetAllLogoQuery } from "../../features/logo/logo";
import { DEFAULT_COMPANY_NAME, buildAssetUrl } from "../../utils/pdfBranding";

const DocumentBrand = ({
  subtitle,
  align = "right",
  logoUrl: logoUrlOverride = "",
  logoClassName = "ml-auto h-10 max-w-32 object-contain",
  nameClassName = "text-sm font-semibold text-slate-900",
  subtitleClassName = "text-xs text-slate-600",
}) => {
  const { data } = useGetAllLogoQuery();
  const logoRecord = Array.isArray(data?.data) ? data.data[0] : data?.data;
  const logoUrl = logoUrlOverride || buildAssetUrl(logoRecord?.file);

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={DEFAULT_COMPANY_NAME}
          crossOrigin="anonymous"
          className={logoClassName}
        />
      ) : (
        <div className={nameClassName}>{DEFAULT_COMPANY_NAME}</div>
      )}
      {subtitle ? <div className={subtitleClassName}>{subtitle}</div> : null}
    </div>
  );
};

export default DocumentBrand;
