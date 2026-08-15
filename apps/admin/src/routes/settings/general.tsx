import { useEffect, useState, useRef } from "react";
import { 
  useAdminSettings, 
  useAdminUpdateSettings, 
  useAdminUploadSettingsImage 
} from "@oshap/shared/hooks";
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
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate(
      {
        name: form.name,
        description: form.description || null,
        logo_url: form.logo_url || null,
        address: form.address || null,
        operating_hours: form.operating_hours || null,
        whatsapp_number: form.whatsapp_number || null,
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

    uploadImage.mutate(file, {
      onSuccess: (res) => {
        setForm((prev) => ({ ...prev, logo_url: res.url }));
        toast.success("Logo uploaded successfully");
      },
      onError: () => {
        toast.error("Failed to upload logo");
      },
    });
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
              accept="image/*"
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
