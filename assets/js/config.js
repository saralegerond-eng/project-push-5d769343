/**
 * BON CHOIX — landing page configuration
 * ------------------------------------------------------------------
 * orderEndpoint:
 *   Leave empty to use the WhatsApp fallback (default).
 *   Set it to your backend URL to save orders automatically.
 *   The page sends a POST request with a JSON body and expects a 2xx
 *   response. An optional JSON body can return { ok: true, id: "..." }.
 *
 * whatsappNumber:
 *   International format without "+" or spaces.
 */
window.BONCHOIX_CONFIG = {
  orderEndpoint: "", // مثال: "https://your-api.com/orders"
  whatsappNumber: "212679502789",
  whatsappDisplay: "0679502789",
  unitPrice: 199,
  currency: "درهم",
  productName: "Premier Nasal Dilator – Starter Kit",
  brand: "BON CHOIX",
  minQuantity: 1,
  maxQuantity: 10,
  duplicateWindowMs: 90000,
  source: "bonchoix-landing-page"
};
