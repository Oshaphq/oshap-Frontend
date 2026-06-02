import { useEffect, useState, useRef } from "react";
import { 
  useAdminSettings, 
  useAdminUpdateSettings, 
  useAdminUploadSettingsImage 
} from "@oshap/shared/hooks";
import { PrimaryButton, toast } from "@oshap/shared/ui";

export default function SettingsPage() {
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const uploadImage = useAdminUploadSettingsImage();

  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    operating_hours: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    whatsapp_number: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || "",
        description: settings.description || "",
        logo_url: settings.logo_url || "",
        operating_hours: settings.operating_hours || "",
        bank_name: settings.bank_name || "",
        account_number: settings.account_number || "",
        account_name: settings.account_name || "",
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
        operating_hours: form.operating_hours || null,
        bank_name: form.bank_name || null,
        account_number: form.account_number || null,
        account_name: form.account_name || null,
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

  return (
    <div className="p-md max-w-3xl mx-auto space-y-xl pb-32">
      <div>
        <h1 className="text-display-h2 font-display font-semibold text-primary-text mb-s">
          Restaurant Settings
        </h1>
        <p className="text-p2 text-secondary-text">
          Manage your restaurant details, operating hours, and bank information.
        </p>
      </div>

      <div className="bg-surface-container rounded-xl p-md space-y-md">
        <h2 className="text-display-h3 font-display font-semibold text-primary-text border-b border-surface-container-high pb-s">
          General Info
        </h2>
        
        <div className="flex gap-md items-start">
          <div className="flex-1 space-y-md">
            <div>
              <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
                Restaurant Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors resize-none"
              />
            </div>
            
            <div>
              <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
                WhatsApp Number
              </label>
              <input
                type="text"
                name="whatsapp_number"
                value={form.whatsapp_number}
                onChange={handleChange}
                placeholder="+234..."
                className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
              />
            </div>
          </div>
          
          <div className="w-40 flex flex-col items-center gap-s">
            <label className="text-label-l4 font-semibold text-primary-text self-start">
              Logo
            </label>
            <div 
              className="w-32 h-32 rounded-xl bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : uploadImage.isPending ? (
                <div className="oshap-spinner" />
              ) : (
                <div className="text-center text-secondary-text">
                  <i className="mgc_upload_line text-2xl" />
                  <div className="text-caption-md mt-1">Upload</div>
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

      <div className="bg-surface-container rounded-xl p-md space-y-md">
        <h2 className="text-display-h3 font-display font-semibold text-primary-text border-b border-surface-container-high pb-s">
          Operating Hours
        </h2>
        <div>
          <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
            Hours of Operation (e.g., 09:00 - 22:00)
          </label>
          <input
            type="text"
            name="operating_hours"
            value={form.operating_hours}
            onChange={handleChange}
            className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
          />
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-md space-y-md">
        <h2 className="text-display-h3 font-display font-semibold text-primary-text border-b border-surface-container-high pb-s">
          Bank Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div>
            <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
              Bank Name
            </label>
            <input
              type="text"
              name="bank_name"
              value={form.bank_name}
              onChange={handleChange}
              className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
              Account Number
            </label>
            <input
              type="text"
              name="account_number"
              value={form.account_number}
              onChange={handleChange}
              className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-label-l4 font-semibold text-primary-text mb-xs">
              Account Name
            </label>
            <input
              type="text"
              name="account_name"
              value={form.account_name}
              onChange={handleChange}
              className="w-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary rounded-lg px-s py-xs text-p2 text-primary-text outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-md">
        <PrimaryButton 
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
