# BON CHOIX — Premier Nasal Dilator Landing Page

One-page Arabic (Moroccan Darija), RTL landing page for the **Premier Nasal Dilator – Anti-Snoring Kit** at **199 MAD**, with free delivery, cash on delivery, WhatsApp ordering and an optional order API.

No store, cart, account or extra pages. The page is plain HTML, CSS and JavaScript and can be hosted on any static host.

## Structure

```
index.html                 Page markup, SEO, JSON-LD, dialogs
assets/css/styles.css      All styles and responsive rules
assets/js/config.js        Price, WhatsApp number, order endpoint
assets/js/main.js          Validation, totals, API submit, WhatsApp fallback
assets/img/                Optimised responsive WebP images + og-image.jpg
assets/source/             Original uploaded product images
assets/favicon.svg         Brand favicon
scripts/build-images.js    Sharp image enhancement / responsive export
scripts/serve.js           Zero-dependency local static server
scripts/check.js           Static sanity checks
scripts/test-ui.js         Puppeteer UI smoke test + screenshots
screenshots/               Generated test screenshots (not needed in production)
```

## Local development

```bash
npm install
npm run serve
# open http://localhost:4173
```

Node 18+ is recommended. On Windows PowerShell, use `npm.cmd` if script execution is blocked.

## Configuration

Edit `assets/js/config.js`:

```js
window.BONCHOIX_CONFIG = {
  orderEndpoint: "", // empty = WhatsApp fallback
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
```

### Order API contract

When `orderEndpoint` is set, the form sends:

```http
POST <orderEndpoint>
Content-Type: application/json
Accept: application/json
```

```json
{
  "firstName": "محمد",
  "lastName": "العلمي",
  "phone": "+212612345678",
  "city": "الدار البيضاء",
  "address": "حي السلام، زنقة 12، رقم 45",
  "quantity": 1,
  "total": 199,
  "unitPrice": 199,
  "currency": "MAD",
  "product": "Premier Nasal Dilator – Starter Kit",
  "brand": "BON CHOIX",
  "source": "bonchoix-landing-page",
  "idempotencyKey": "uuid-v4",
  "submittedAt": "2026-01-01T12:00:00.000Z",
  "pageUrl": "https://bonchoix.ma/"
}
```

Expected response: any `2xx`. An optional JSON body can return an order reference:

```json
{ "ok": true, "id": "BC-1024" }
```

If the request fails, times out (12s) or returns `ok: false`, the page **does not claim the order was saved**. It shows an honest fallback panel and opens WhatsApp with the order details pre-filled.

### WhatsApp fallback (default)

With `orderEndpoint` empty, the page cannot save orders automatically. On submit it:

1. Shows a confirmation panel with the order summary.
2. Clearly states that the order was **not saved automatically**.
3. Opens WhatsApp with all order details ready to send.

The order only exists after the customer sends the WhatsApp message and the team confirms it. Do not change this wording to claim automatic saving unless an endpoint is configured and working.

## Images

The original images are in `assets/source/`. The build script uses `sharp` to enhance sharpness, lighting and colour, and exports responsive WebP sizes plus `og-image.jpg`:

```bash
npm run build:images
```

The script does not redesign the product, packaging, labels or proportions. The 30-day packaging image is intentionally not used in a way that conflicts with the advertised 15 adhesive applications.

## Reviews

The three review cards currently contain placeholder texts and anonymous first names. Replace them with real customer reviews before publishing. Keep the privacy note if you shorten names:

> الأسماء مختصرة حفاظاً على خصوصية الزبناء.

Do not present invented reviews as genuine customer testimonials.

## Testing

```bash
npm test                 # static checks: assets, copy, form wiring, JS/CSS syntax
npm run serve            # terminal 1
npm run test:ui          # terminal 2; needs Chrome or Edge + puppeteer-core
```

The UI test covers:

- 360, 390, 768 and 1440 px layouts
- no horizontal overflow
- hero essentials above the fold on mobile
- CTA jumps to the order form, not the price summary
- quantity and live total
- empty form validation in Darija
- Moroccan phone validation
- honest WhatsApp fallback
- duplicate-submit guard

Screenshots are written to `screenshots/`.

## Deployment

1. Set the production `orderEndpoint` in `assets/js/config.js`, or leave it empty to use WhatsApp.
2. Replace `https://bonchoix.ma/` in the canonical URL, Open Graph tags and JSON-LD with the real domain.
3. Upload the project root (without `node_modules`, `scripts`, `assets/source` and `screenshots` if not needed).
4. Serve over HTTPS.
5. Test the form on a real phone, including WhatsApp deep links and the sticky order bar.

## Notes

- The page avoids medical promises. It describes the product as helping to improve airflow comfort, not as a cure for snoring or a replacement for medical advice.
- `localStorage` is used only to prevent duplicate submissions and is explained in the privacy dialog.
- The page is not an online store; orders are confirmed by phone or WhatsApp.
