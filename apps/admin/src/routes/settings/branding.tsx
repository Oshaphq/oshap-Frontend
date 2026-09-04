import { useEffect, useRef, useState } from "react";
import {
  useAdminSettings,
  useAdminUpdateSettings,
  useAdminUploadSettingsImage,
} from "@oshap/shared/hooks";
import { errorMessage, validateImageFile, IMAGE_ACCEPT_ATTR } from "@oshap/shared";
import {
  Card,
  PrimaryButton,
  toast,
} from "@oshap/shared/ui";
import BrandColourField from "../../components/BrandColourField";

/**
 * The three things that make a guest's menu look like this restaurant rather
 * than like ours: the logo, the cover photo and the brand colour.
 *
 * They were scattered down the General page — the logo beside the VAT rate,
 * the cover two blocks below, the colour at the very bottom under the bank
 * accounts. Nobody setting up a restaurant thinks of those as three separate
 * errands.
 *
 * Saves only its own fields. The settings PATCH takes every key as optional,
 * so this screen and General can hold slices of the same record without one
 * writing over the other's.
 */
export default function BrandingSettings() {
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const uploadImage = useAdminUploadSettingsImage();

  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [colour, setColour] = useState("");

  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setLogoUrl(settings.logo_url || "");
    setCoverUrl(settings.cover_image_url || "");
    setColour(settings.primary_color || "");
  }, [settings]);

  const upload = (
    e: React.ChangeEvent<HTMLInputElement>,
    apply: (url: string) => void,
    what: string,
  ) => {
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
        apply(res.url);
        toast.success(`${what} uploaded — remember to save`);
      },
      onError: (err) => toast.error(errorMessage(err, `upload the ${what.toLowerCase()}`)),
    });
    // Let the same file be re-picked after a failure.
    e.target.value = "";
  };

  const save = () => {
    updateSettings.mutate(
      {
        logo_url: logoUrl || null,
        cover_image_url: coverUrl || null,
        primary_color: colour || null,
      },
      {
        onSuccess: () => toast.success("Branding updated"),
        onError: (err) => toast.error(errorMessage(err, "save the branding")),
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
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-on-surface">Logo</h3>
          <p className="text-label-small text-on-surface-variant">
            Shown on receipts and at the top of the guest&rsquo;s menu. A square
            image works best.
          </p>
        </div>
        <div
          className="w-32 h-32 rounded-lg bg-surface-container border border-dashed border-outline-variant flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
          onClick={() => logoInput.current?.click()}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : uploadImage.isPending ? (
            <div className="oshap-spinner" />
          ) : (
            <div className="text-center text-on-surface-variant">
              <i className="mgc_upload_line text-2xl" />
              <div className="text-body-medium mt-xs">Upload</div>
            </div>
          )}
        </div>
        {logoUrl && (
          <button
            type="button"
            onClick={() => setLogoUrl("")}
            className="self-start text-body-small font-semibold text-error hover:underline"
          >
            Remove logo
          </button>
        )}
        <input
          type="file"
          ref={logoInput}
          className="hidden"
          accept={IMAGE_ACCEPT_ATTR}
          onChange={(e) => upload(e, setLogoUrl, "Logo")}
        />
      </Card>

      <Card padding="l" gap="md">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-on-surface">Cover photo</h3>
          <p className="text-label-small text-on-surface-variant">
            Shown across the top of your guests&rsquo; menu, with your name over
            it. Landscape works best. Leave it empty and the menu simply starts
            at the food.
          </p>
        </div>

        <div
          className="relative w-full h-36 rounded-lg bg-surface-container border border-dashed border-outline-variant flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
          onClick={() => coverInput.current?.click()}
        >
          {coverUrl ? (
            <>
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              {/* The same scrim the guest sees, so what is previewed here is
                  what lands on their phone rather than a cleaner version. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-md left-md font-display text-title-medium font-semibold text-white drop-shadow">
                {settings?.name || "Your restaurant"}
              </p>
            </>
          ) : (
            <span className="text-body-medium text-on-surface-variant">
              {uploadImage.isPending ? "Uploading…" : "Tap to add a cover photo"}
            </span>
          )}
        </div>

        {coverUrl && (
          <button
            type="button"
            onClick={() => setCoverUrl("")}
            className="self-start text-body-small font-semibold text-error hover:underline"
          >
            Remove cover photo
          </button>
        )}

        <input
          type="file"
          ref={coverInput}
          className="hidden"
          accept={IMAGE_ACCEPT_ATTR}
          onChange={(e) => upload(e, setCoverUrl, "Cover photo")}
        />
      </Card>

      <Card padding="l">
        <BrandColourField value={colour} onChange={setColour} />
      </Card>

      <div className="flex justify-end pt-s">
        <PrimaryButton
          size="md"
          onClick={save}
          disabled={updateSettings.isPending}
          className="min-w-32"
        >
          {updateSettings.isPending ? "Saving…" : "Save Changes"}
        </PrimaryButton>
      </div>
    </div>
  );
}
