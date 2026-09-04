import { useEffect, useState } from "react";
import { useAdminSettings, useAdminUpdateSettings } from "@oshap/shared/hooks";
import {
  basisPointsToPercent,
  percentToBasisPoints,
  errorMessage,
} from "@oshap/shared";
import {
  Card,
  PrimaryButton,
  TextField,
  toast,
} from "@oshap/shared/ui";

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

  return (
    <div className="flex flex-col gap-md pb-10">
      <Card padding="l" gap="md">
        <h3 className="font-bold text-on-surface">The restaurant</h3>

        <TextField
          id="name"
          label="Restaurant name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
        />

        <TextField
          id="description"
          label="Description"
          multiline
          rows={3}
          name="description"
          value={form.description}
          onChange={handleChange}
          className="resize-none"
        />

        <TextField
          id="address"
          label="Address"
          type="text"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="12 Adeola Odeku Street, Victoria Island, Lagos"
          hint={
            <>
              Shown to guests as &ldquo;You&rsquo;re sitting at&hellip;&rdquo;.
              Write it the way a person would say it, not the way a courier
              would.
            </>
          }
        />

        <TextField
          id="whatsapp_number"
          label="WhatsApp number"
          type="text"
          name="whatsapp_number"
          value={form.whatsapp_number}
          onChange={handleChange}
          placeholder="+234..."
        />
      </Card>

      <Card padding="l" gap="md">
        <h3 className="font-bold text-on-surface">Opening hours</h3>
        <TextField
          id="operating_hours"
          label="Hours of operation"
          type="text"
          name="operating_hours"
          value={form.operating_hours}
          onChange={handleChange}
          placeholder="09:00 - 22:00"
        />
      </Card>

      <Card padding="l" gap="md">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-on-surface">Charges</h3>
          {/* Until these are set a restaurant charges neither, silently — the
              totals simply come out lower than they should and nothing
              anywhere reports a problem. */}
          <p className="text-label-small text-on-surface-variant">
            Added to every bill and shown to guests as separate lines. Leave
            blank to charge neither. VAT applies after any discount and includes
            the service charge in its base.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-md">
          <TextField
            id="vat_rate"
            label="VAT (%)"
            type="text"
            inputMode="decimal"
            name="vat_rate"
            value={form.vat_rate}
            onChange={handleChange}
            placeholder="7.5"
          />
          <TextField
            id="service_charge_rate"
            label="Service charge (%)"
            type="text"
            inputMode="decimal"
            name="service_charge_rate"
            value={form.service_charge_rate}
            onChange={handleChange}
            placeholder="5"
          />
        </div>
      </Card>

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
