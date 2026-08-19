import { useEffect, useState, useRef } from "react";
import { 
  useAdminSettings, 
  useAdminUpdateSettings, 
  useAdminUploadSettingsImage 
} from "@oshap/shared/hooks";
import {
  basisPointsToPercent,
  percentToBasisPoints,
  errorMessage,
  validateImageFile,
  IMAGE_ACCEPT_ATTR,
} from "@oshap/shared";
import { PrimaryButton, toast } from "@oshap/shared/ui";
import { useAuth } from "../../context/AuthContext";
import BankAccountsSection from "../../components/BankAccountsSection";

export default function GeneralSettings() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const uploadImage = useAdminUploadSettingsImage();

  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    address: "",
    operating_hours: "",
    whatsapp_number: "",
    // Held as the percentages a merchant types; converted to basis points on
    // save, since that is what the API stores.
    vat_rate: "",
    service_charge_rate: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || "",
        description: settings.description || "",
        logo_url: settings.logo_url || "",
        address: settings.address || "",
        operating_hours: settings.operating_hours || "",
        whatsapp_number: settings.whatsapp_number || "",
        vat_rate:
          settings.vat_rate == null
            ? ""
            : String(basisPointsToPercent(settings.vat_rate)),
        service_charge_rate:
          settings.service_charge_rate == null
            ? ""
            : String(basisPointsToPercent(settings.service_charge_rate)),
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /** "" means leave it alone; a number means set it. */
  const rateToBps = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const percent = Number(trimmed);
    return Number.isFinite(percent) ? percentToBasisPoints(percent) : undefined;
  };

  const invalidRate = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") return false;
    const percent = Number(trimmed);
    return !Number.isFinite(percent) || percent < 0 || percent > 100;
  };

  const handleSave = () => {
    if (invalidRate(form.vat_rate) || invalidRate(form.service_charge_rate)) {
      toast.error("Tax rates must be a percentage between 0 and 100.");
      return;
    }

    updateSettings.mutate(
      {
        name: form.name,
        description: form.description || null,
        logo_url: form.logo_url || null,
        address: form.address || null,
        operating_hours: form.operating_hours || null,
        whatsapp_number: form.whatsapp_number || null,
        vat_rate: rateToBps(form.vat_rate),
        service_charge_rate: rateToBps(form.service_charge_rate),
      },
      {
        onSuccess: () => {
          toast.success("Settings updated successfully");
        },
        onError: () => {
          toast.error("Failed to update settings");
        },
      }
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      e.target.value = "";
      return;
    }

    uploadImage.mutate(file, {
      onSuccess: (res) => {
        setForm((prev) => ({ ...prev, logo_url: res.url }));
        toast.success("Logo uploaded — remember to save");
      },
      onError: (err) => {
        toast.error(errorMessage(err, "upload the logo"));
      },
    });
    // Let the same file be re-picked after a failure.
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-xl">
        <div className="oshap-spinner" />
      </div>
    );
  }

  const inputClass = "w-full px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "block text-caption-md font-semibold text-primary-text mb-xs";

  return (
    <div className="flex flex-col gap-l pb-10">
      <div className="bg-surface-container-low rounded-md p-l flex flex-col gap-md border border-transparent hover:border-outline-variant transition-colors">
        <h3 className="font-bold text-primary-text">
          General Info
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-l items-start">
          <div className="flex-1 flex flex-col gap-md w-full">
            <div>
              <label className={labelClass}>
                Restaurant Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            
            <div>
              <label className={labelClass}>
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
            
            <div>
              <label className={labelClass}>
                Address
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="12 Adeola Odeku Street, Victoria Island, Lagos"
                className={inputClass}
              />
              <p className="text-caption-xs text-secondary-text mt-xs">
                Shown to guests as &ldquo;You&rsquo;re sitting at&hellip;&rdquo;. Write it the
                way a person would say it, not the way a courier would.
              </p>
            </div>

            <div>
              <label className={labelClass}>
                WhatsApp Number
              </label>
              <input
                type="text"
                name="whatsapp_number"
                value={form.whatsapp_number}
                onChange={handleChange}
                placeholder="+234..."
                className={inputClass}
              />
            </div>

            {/* Until these are set a restaurant charges neither, silently —
                the totals simply come out lower than they should and nothing
                anywhere reports a problem. */}
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className={labelClass}>VAT (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="vat_rate"
                  value={form.vat_rate}
                  onChange={handleChange}
                  placeholder="7.5"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Service charge (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="service_charge_rate"
                  value={form.service_charge_rate}
                  onChange={handleChange}
                  placeholder="5"
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-caption-xs text-secondary-text -mt-s">
              Added to every bill and shown to guests as separate lines. Leave
              blank to charge neither. VAT applies after any discount and
              includes the service charge in its base.
            </p>
          </div>
          
          <div className="w-full sm:w-40 flex flex-col items-start gap-s">
            <label className={labelClass}>
              Logo
            </label>
            <div 
              className="w-32 h-32 rounded-xl bg-surface-container-low border border-dashed border-outline-variant flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : uploadImage.isPending ? (
                <div className="oshap-spinner" />
              ) : (
                <div className="text-center text-secondary-text">
                  <i className="mgc_upload_line text-2xl" />
                  <div className="text-caption-md mt-xs">Upload</div>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept={IMAGE_ACCEPT_ATTR}
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-md p-l flex flex-col gap-md border border-transparent hover:border-outline-variant transition-colors">
        <h3 className="font-bold text-primary-text">
          Operating Hours
        </h3>
        <div>
          <label className={labelClass}>
            Hours of Operation (e.g., 09:00 - 22:00)
          </label>
          <input
            type="text"
            name="operating_hours"
            value={form.operating_hours}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <BankAccountsSection canEdit={isOwner} />

      <div className="flex justify-end pt-s">
        <PrimaryButton 
          size="md"
          onClick={handleSave} 
          disabled={updateSettings.isPending || !form.name}
          className="min-w-32"
        >
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </PrimaryButton>
      </div>
    </div>
  );
}
