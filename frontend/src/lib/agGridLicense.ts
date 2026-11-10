import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";
import { AgStudioLicenseManager } from "ag-studio";

let isInitialized = false;

/**
 * Initializes AG Grid Enterprise & AG Studio licenses and registers enterprise modules.
 * Strictly reads credentials dynamically from environment variables.
 */
export function initAgEnterprise(): void {
  if (isInitialized) return;
  isInitialized = true;

  const licenseKey =
    process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY ||
    process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY;

  if (licenseKey) {
    try {
      LicenseManager.setLicenseKey(licenseKey);
      AgStudioLicenseManager.setLicenseKey(licenseKey);
    } catch (err) {
      console.warn("Failed to apply AG Enterprise license key:", err);
    }
  }

  try {
    ModuleRegistry.registerModules([AllEnterpriseModule]);
  } catch (err) {
    console.warn("AG Grid Enterprise module registration warning:", err);
  }
}
