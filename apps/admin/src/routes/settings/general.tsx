import { useEffect, useState } from "react";
import { useAdminSettings, useAdminUpdateSettings } from "@oshap/shared/hooks";
import {
  basisPointsToPercent,
  percentToBasisPoints,
  errorMessage,
} from "@oshap/shared";
import { PrimaryButton, toast } from "@oshap/shared/ui";

/**
 * What the restaurant is and what it charges.
 *
 * The logo, cover photo and brand colour moved to Branding, and the bank
 * accounts to their own screen. This page was 400 lines holding six unrelated
 * errands behind one Save button, so changing a VAT rate meant scrolling past
 * a photo uploader — and the button at the bottom re-sent every field, which
 * is how a half-finished image edit could ride along with a tax change.
 *
 * Every key on the settings PATCH is optional, so this sends only its own.
 */
export default function GeneralSettings() {
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    operating_hours: "",
    whatsapp_number: "",
    // Held as the percentages a merchant types; converted to basis points on
    // save, since that is what the API stores.
    vat_rate: "",
    service_charge_rate: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      name: settings.name || "",
      description: settings.description || "",
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
  }, [settings]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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
        address: form.address || null,
        operating_hours: form.operating_hours || null,
        whatsapp_number: form.whatsapp_number || null,
        vat_rate: rateToBps(form.vat_rate),
        service_charge_rate: rateToBps(form.service_charge_rate),
      },
      {
        onSuccess: () => toast.success("Settings updated"),
        onError: (err) => toast.error(errorMessage(err, "save the settings")),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-xl">
        <div className="oshap-spinner" />
      </div>
    );
  }

  const inputClass =
    "w-full px-md py-s rounded-s bg-surface-container border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass =
    "block text-caption-md font-semibold text-primary-text mb-xs";

  return (
    <div className="flex flex-col gap-md pb-10">
      <div className="bg-surface-container-low rounded-md p-l flex flex-col gap-md">
        <h3 className="font-bold text-primary-text">The restaurant</h3>

        <div>
          <label className={labelClass} htmlFor="name">
            Restaurant name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="address">
            Address
          </label>
          <input
            id="address"
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="12 Adeola Odeku Street, Victoria Island, Lagos"
            className={inputClass}
          />
          <p className="text-caption-xs text-secondary-text mt-xs">
            Shown to guests as &ldquo;You&rsquo;re sitting at&hellip;&rdquo;.
            Write it the way a person would say it, not the way a courier would.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="whatsapp_number">
            WhatsApp number
          </label>
          <input
            id="whatsapp_number"
            type="text"
            name="whatsapp_number"
            value={form.whatsapp_number}
            onChange={handleChange}
            placeholder="+234..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="bg-surface-container-low rounded-md p-l flex flex-col gap-md">
        <h3 className="font-bold text-primary-text">Opening hours</h3>
        <div>
          <label className={labelClass} htmlFor="operating_hours">
            Hours of operation
          </label>
          <input
            id="operating_hours"
            type="text"
            name="operating_hours"
            value={form.operating_hours}
            onChange={handleChange}
            placeholder="09:00 - 22:00"
            className={inputClass}
          />
        </div>
      </div>

      <div className="bg-surface-container-low rounded-md p-l flex flex-col gap-md">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-primary-text">Charges</h3>
          {/* Until these are set a restaurant charges neither, silently — the
              totals simply come out lower than they should and nothing
              anywhere reports a problem. */}
          <p className="text-caption-xs text-secondary-text">
            Added to every bill and shown to guests as separate lines. Leave
            blank to charge neither. VAT applies after any discount and includes
            the service charge in its base.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <label className={labelClass} htmlFor="vat_rate">
              VAT (%)
            </label>
            <input
              id="vat_rate"
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
            <label className={labelClass} htmlFor="service_charge_rate">
              Service charge (%)
            </label>
            <input
              id="service_charge_rate"
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
      </div>

      <div className="flex justify-end pt-s">
        <PrimaryButton
          size="md"
          onClick={handleSave}
          disabled={updateSettings.isPending || !form.name}
          className="min-w-32"
        >
          {updateSettings.isPending ? "Saving…" : "Save Changes"}
        </PrimaryButton>
      </div>
    </div>
  );
}
