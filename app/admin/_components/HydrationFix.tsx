"use client";

import { useEffect } from "react";

/**
 * HydrationFix component removes browser extension attributes that cause hydration errors.
 * Browser extensions (like Bitdefender Wallet) inject attributes like `bis_skin_checked`
 * into the DOM before React hydrates, causing server/client mismatches.
 */
export default function HydrationFix() {
  useEffect(() => {
    // Remove browser extension attributes that cause hydration errors
    const removeExtensionAttributes = () => {
      // Remove common browser extension attributes
      const extensionAttributes = [
        "bis_skin_checked",
        "data-bis_skin_checked",
        "bis_skin",
        "data-bis_skin",
      ];

      extensionAttributes.forEach((attr) => {
        const elements = document.querySelectorAll(`[${attr}]`);
        elements.forEach((el) => {
          el.removeAttribute(attr);
        });
      });
    };

    // Run immediately and also after a short delay to catch late-injected attributes
    removeExtensionAttributes();
    const timeoutId = setTimeout(removeExtensionAttributes, 100);
    const timeoutId2 = setTimeout(removeExtensionAttributes, 500);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, []);

  return null;
}
