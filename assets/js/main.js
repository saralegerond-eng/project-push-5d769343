/**
 * BON CHOIX — landing page behaviour
 * - reveal on scroll
 * - live order total
 * - Moroccan phone validation
 * - duplicate submission guard
 * - configurable API endpoint with honest WhatsApp fallback
 */
(() => {
  "use strict";

  const config = window.BONCHOIX_CONFIG || {};
  const unitPrice = Number(config.unitPrice) || 199;
  const currency = config.currency || "درهم";
  const minQty = Number(config.minQuantity) || 1;
  const maxQty = Number(config.maxQuantity) || 10;
  const whatsappNumber = String(config.whatsappNumber || "212679502789").replace(/\D/g, "");
  const duplicateWindowMs = Number(config.duplicateWindowMs) || 90000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  const numberFormat = new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 });
  const formatMoney = (value) => `${numberFormat.format(value)} ${currency}`;

  /* ------------------------------------------------------------------ */
  /* Anonymous visit count                                               */
  /* ------------------------------------------------------------------ */
  const visitStorageKey = "bonchoix-visit-recorded";
  const recordVisit = async () => {
    if (!window.bonchoixDb || window.sessionStorage.getItem(visitStorageKey)) return;
    window.sessionStorage.setItem(visitStorageKey, "1");
    try {
      await window.bonchoixDb.from("site_visits").insert({});
    } catch (_) {
      window.sessionStorage.removeItem(visitStorageKey);
    }
  };
  recordVisit();

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -36px 0px" }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  /* ------------------------------------------------------------------ */
  /* Smooth in-page scrolling                                            */
  /* ------------------------------------------------------------------ */
  const htmlElement = document.documentElement;

  const scrollToTarget = (target, { center = false } = {}) => {
    if (!target) return;
    const headerOffset = header ? header.offsetHeight : 0;
    const targetRect = target.getBoundingClientRect();
    let targetY = targetRect.top + window.scrollY - headerOffset - 16;
    if (center) targetY = targetRect.top + window.scrollY - (window.innerHeight - targetRect.height) / 2;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    targetY = Math.min(Math.max(0, targetY), maxScroll);

    if (reduceMotion) {
      window.scrollTo(0, targetY);
      return;
    }

    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    // Disable CSS smooth scrolling while animating so each frame is exact.
    const previousBehavior = htmlElement.style.scrollBehavior;
    htmlElement.style.scrollBehavior = "auto";
    const duration = Math.min(900, Math.max(420, Math.abs(distance) * 0.22));
    let startedAt = null;

    const step = (timestamp) => {
      if (startedAt === null) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        window.scrollTo(0, targetY);
        htmlElement.style.scrollBehavior = previousBehavior;
      }
    };

    window.requestAnimationFrame(step);
  };

  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      if (window.history && typeof window.history.pushState === "function") {
        window.history.pushState(null, "", hash);
      }
      scrollToTarget(target);

      // Move keyboard focus to the form without letting the browser scroll again.
      if (target.id === "orderForm") {
        const firstInput = target.querySelector("input, textarea, button");
        if (firstInput) {
          window.setTimeout(
            () => firstInput.focus({ preventScroll: true }),
            reduceMotion ? 0 : 700
          );
        }
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* Header shadow                                                       */
  /* ------------------------------------------------------------------ */
  const header = $(".site-header");
  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ------------------------------------------------------------------ */
  /* Quantity + live total                                               */
  /* ------------------------------------------------------------------ */
  const quantityInput = $("#quantity");
  const linePrice = $("#linePrice");
  const lineQty = $("#lineQty");
  const totalPrice = $("#totalPrice");

  const clampQuantity = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return minQty;
    return Math.min(maxQty, Math.max(minQty, parsed));
  };

  const getQuantity = () => clampQuantity(quantityInput ? quantityInput.value : minQty);

  const updateTotals = () => {
    const quantity = getQuantity();
    if (linePrice) linePrice.textContent = String(unitPrice);
    if (lineQty) lineQty.textContent = String(quantity);
    if (totalPrice) totalPrice.textContent = String(unitPrice * quantity);
  };

  const setQuantity = (value) => {
    if (!quantityInput) return;
    quantityInput.value = String(clampQuantity(value));
    updateTotals();
  };

  if (quantityInput) {
    quantityInput.addEventListener("input", () => {
      const digits = quantityInput.value.replace(/\D/g, "");
      if (digits === "") {
        updateTotals();
        return;
      }
      const clamped = clampQuantity(digits);
      if (String(clamped) !== digits) quantityInput.value = String(clamped);
      updateTotals();
    });
    quantityInput.addEventListener("blur", () => setQuantity(getQuantity()));
    updateTotals();
  }

  $$(".qty-btn").forEach((button) => {
    button.addEventListener("click", () => {
      setQuantity(getQuantity() + Number(button.dataset.qty || 0));
    });
  });

  /* ------------------------------------------------------------------ */
  /* Phone helpers                                                       */
  /* ------------------------------------------------------------------ */
  const normalizePhone = (value) => {
    let phone = String(value || "").replace(/[\s\-().]/g, "");
    if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
    if (/^[5-7]\d{8}$/.test(phone)) phone = `0${phone}`;
    return phone;
  };

  const isValidMoroccanPhone = (value) => /^(?:\+212|0)[5-7]\d{8}$/.test(normalizePhone(value));

  const toInternationalPhone = (value) => {
    const phone = normalizePhone(value);
    if (phone.startsWith("0")) return `+212${phone.slice(1)}`;
    return phone;
  };

  const formatPhoneDisplay = (value) => {
    const phone = normalizePhone(value);
    if (/^\+212\d{9}$/.test(phone)) {
      return phone.replace(/^\+212(\d{3})(\d{2})(\d{2})(\d{2})$/, "+212 $1 $2 $3 $4");
    }
    if (/^0\d{9}$/.test(phone)) {
      return phone.replace(/^0(\d{3})(\d{2})(\d{2})(\d{2})$/, "0$1 $2 $3 $4");
    }
    return value;
  };

  /* ------------------------------------------------------------------ */
  /* Form validation                                                     */
  /* ------------------------------------------------------------------ */
  const form = $("#orderForm");
  const orderGrid = $("#orderGrid");
  const formError = $("#formError");
  const submitButton = $("#submitBtn");
  const submitLabel = submitButton ? submitButton.querySelector(".btn-label") : null;
  const spinner = submitButton ? submitButton.querySelector(".spinner") : null;
  const successCard = $("#orderSuccess");
  const successTitle = $("#successTitle");
  const successText = $("#successText");
  const successSummary = $("#successSummary");
  const successWa = $("#successWa");
  const successWaLabel = $("#successWaLabel");
  const successNote = $("#successNote");
  const newOrderButton = $("#newOrder");
  const orderSection = $("#order");
  const stickyBar = $("#stickyBar");

  const fields = {
    firstName: {
      input: $("#firstName"),
      empty: "عافاك دخل الاسم الشخصي.",
      invalid: "الاسم الشخصي خاصو يكون بالحروف، على الأقل حرفين."
    },
    lastName: {
      input: $("#lastName"),
      empty: "عافاك دخل النسب.",
      invalid: "النسب خاصو يكون بالحروف، على الأقل حرفين."
    },
    phone: {
      input: $("#phone"),
      empty: "عافاك دخل رقم الهاتف.",
      invalid: "رقم الهاتف ماشي صحيح. دخل رقم مغربي بحال 06XXXXXXXX أو +2126XXXXXXXX."
    },
    city: {
      input: $("#city"),
      empty: "عافاك دخل المدينة.",
      invalid: "المدينة خاصها تكون بالحروف."
    },
    address: {
      input: $("#address"),
      empty: "عافاك دخل العنوان بالتفصيل.",
      invalid: "العنوان قصير بزاف. زيد الحي، الزنقة ورقم الدار."
    }
  };

  const namePattern = /^[\p{L}\p{M}\s'’\-]+$/u;

  const setFieldError = (name, message) => {
    const field = document.querySelector(`[data-field="${name}"]`);
    if (!field) return;
    const error = field.querySelector(".error");
    const input = field.querySelector("input, textarea");
    field.classList.toggle("has-error", Boolean(message));
    if (error) error.textContent = message || "";
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  };

  const clearErrors = () => {
    Object.keys(fields).forEach((name) => setFieldError(name, ""));
    if (formError) {
      formError.textContent = "";
      formError.hidden = true;
    }
    const quantityError = $("#error-quantity");
    if (quantityError) {
      quantityError.textContent = "";
      quantityError.hidden = true;
    }
  };

  const showFormError = (message) => {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = false;
  };

  const collectValues = () => ({
    firstName: fields.firstName.input.value.trim(),
    lastName: fields.lastName.input.value.trim(),
    phone: toInternationalPhone(fields.phone.input.value),
    phoneDisplay: formatPhoneDisplay(fields.phone.input.value),
    city: fields.city.input.value.trim(),
    address: fields.address.input.value.trim(),
    quantity: getQuantity(),
    total: unitPrice * getQuantity()
  });

  const validate = (values) => {
    const errors = {};

    if (!values.firstName) errors.firstName = fields.firstName.empty;
    else if (values.firstName.length < 2 || !namePattern.test(values.firstName)) errors.firstName = fields.firstName.invalid;

    if (!values.lastName) errors.lastName = fields.lastName.empty;
    else if (values.lastName.length < 2 || !namePattern.test(values.lastName)) errors.lastName = fields.lastName.invalid;

    if (!fields.phone.input.value.trim()) errors.phone = fields.phone.empty;
    else if (!isValidMoroccanPhone(fields.phone.input.value)) errors.phone = fields.phone.invalid;

    if (!values.city) errors.city = fields.city.empty;
    else if (values.city.length < 2 || !namePattern.test(values.city)) errors.city = fields.city.invalid;

    if (!values.address) errors.address = fields.address.empty;
    else if (values.address.length < 8) errors.address = fields.address.invalid;

    if (!Number.isFinite(values.quantity) || values.quantity < minQty || values.quantity > maxQty) {
      errors.quantity = `الكمية خاصها تكون بين ${minQty} و${maxQty}.`;
    }

    return errors;
  };

  const focusFirstError = (errors) => {
    const first = Object.keys(errors)[0];
    if (!first) return;
    const input = fields[first] ? fields[first].input : document.getElementById(first);
    if (input) input.focus({ preventScroll: false });
  };

  if (form) {
    form.addEventListener("input", (event) => {
      const field = event.target.closest(".field");
      if (field && field.dataset.field) setFieldError(field.dataset.field, "");
      if (formError && !formError.hidden) {
        formError.hidden = true;
        formError.textContent = "";
      }
    });

    fields.phone.input.addEventListener("blur", () => {
      if (fields.phone.input.value.trim() && isValidMoroccanPhone(fields.phone.input.value)) {
        fields.phone.input.value = formatPhoneDisplay(fields.phone.input.value);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Duplicate protection                                                */
  /* ------------------------------------------------------------------ */
  const LOCK_KEY = "bonchoix:last-order:v1";

  const isDuplicate = (values) => {
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      if (!raw) return false;
      const last = JSON.parse(raw);
      if (!last || !last.phone || !last.at) return false;
      return (
        normalizePhone(last.phone) === normalizePhone(values.phone) &&
        Date.now() - Number(last.at) < duplicateWindowMs
      );
    } catch {
      return false;
    }
  };

  const markSubmitted = (values) => {
    try {
      localStorage.setItem(
        LOCK_KEY,
        JSON.stringify({ phone: values.phone, at: Date.now(), total: values.total })
      );
    } catch {
      /* storage may be disabled; the in-memory guard still protects the button */
    }
  };

  /* ------------------------------------------------------------------ */
  /* WhatsApp message                                                    */
  /* ------------------------------------------------------------------ */
  const buildWhatsAppUrl = (values) => {
    const message = [
      "سلام BON CHOIX 👋",
      "بغيت نأكد هاد الطلب:",
      "",
      `الاسم الشخصي: ${values.firstName}`,
      `النسب: ${values.lastName}`,
      `رقم الهاتف: ${values.phone}`,
      `المدينة: ${values.city}`,
      `العنوان: ${values.address}`,
      `الكمية: ${values.quantity}`,
      `المجموع: ${formatMoney(values.total)}`,
      "التوصيل: مجاني",
      "",
      "شكراً!"
    ].join("\n");

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const genericWhatsAppUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "سلام BON CHOIX 👋 عندي شي سؤال على Premier Nasal Dilator."
  )}`;

  /* ------------------------------------------------------------------ */
  /* Success / fallback panel                                            */
  /* ------------------------------------------------------------------ */
  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[character];
    });

  const renderSummary = (values, orderId) => {
    if (!successSummary) return;
    const rows = [
      ["الاسم الكامل", `${values.firstName} ${values.lastName}`],
      ["رقم الهاتف", values.phoneDisplay || values.phone],
      ["المدينة", values.city],
      ["العنوان", values.address],
      ["الكمية", String(values.quantity)],
      ["المجموع", formatMoney(values.total)]
    ];
    if (orderId) rows.splice(1, 0, ["رقم الطلب", String(orderId)]);

    successSummary.innerHTML = rows
      .map(([label, value], index) => {
        const isTotal = index === rows.length - 1;
        return `<div${isTotal ? ' class="success-total"' : ""}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
      })
      .join("");
  };

  const showSuccess = ({ saved, values, orderId = null, waUrl, reason = "no-endpoint" }) => {
    if (!successCard) return;
    if (orderGrid) orderGrid.hidden = true;
    successCard.hidden = false;

    if (saved) {
      if (successTitle) successTitle.textContent = "تسجل الطلب ديالك بنجاح!";
      if (successText) successText.textContent = "غادي نتصلو بيك قريب باش نأكدو الطلب.";
      if (successNote) successNote.textContent = orderId ? `رقم الطلب ديالك: ${orderId}` : "إلا بغيت تبدل شي حاجة، تواصل معانا عبر واتساب.";
      if (successWa) successWa.href = genericWhatsAppUrl;
      if (successWaLabel) successWaLabel.textContent = "تواصل معانا عبر واتساب";
    } else if (reason === "error") {
      if (successTitle) successTitle.textContent = "ما قدرناش نسجلو الطلب تلقائياً";
      if (successText) successText.textContent = "وقع شي مشكل فالاتصال. الطلب مازال ما تسجلش — كمّل عبر واتساب باش نأكدو.";
      if (successNote) successNote.textContent = "ما كاينش تأكيد أوتوماتيكي. خاصك تصيفط الرسالة فواتساب.";
      if (successWa) successWa.href = waUrl || genericWhatsAppUrl;
      if (successWaLabel) successWaLabel.textContent = "افتح واتساب وأكد الطلب";
    } else {
      if (successTitle) successTitle.textContent = "الطلب ديالك واجد فواتساب";
      if (successText) successText.textContent = "ما تسجلش الطلب أوتوماتيكياً. صيفط الرسالة اللي فواتساب باش نأكدو الطلب.";
      if (successNote) successNote.textContent = "الطلب مازال ما تسجلش حتى تصيفط الرسالة فواتساب.";
      if (successWa) successWa.href = waUrl || genericWhatsAppUrl;
      if (successWaLabel) successWaLabel.textContent = "افتح واتساب وأكد الطلب";
    }

    renderSummary(values, orderId);
    successCard.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  };

  /* ------------------------------------------------------------------ */
  /* Submit                                                              */
  /* ------------------------------------------------------------------ */
  let isSubmitting = false;

  const setLoading = (loading) => {
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.setAttribute("aria-busy", loading ? "true" : "false");
    if (submitLabel) submitLabel.hidden = loading;
    if (spinner) spinner.hidden = !loading;
  };

  const generateId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `bc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const honeypot = $("#website");
    if (honeypot && honeypot.value.trim()) return;

    clearErrors();
    const values = collectValues();
    const errors = validate(values);

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([name, message]) => {
        if (name === "quantity") {
          const quantityError = $("#error-quantity");
          if (quantityError) {
            quantityError.textContent = message;
            quantityError.hidden = false;
          }
        } else {
          setFieldError(name, message);
        }
      });
      showFormError("عافاك صحح المعلومات اللي فوق.");
      focusFirstError(errors);
      return;
    }

    if (isDuplicate(values)) {
      showFormError("هاد الطلب تصيفط قريب. عافاك تسنى شوية قبل ما تعاود.");
      if (formError) formError.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      return;
    }

    isSubmitting = true;
    setLoading(true);

    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      city: values.city,
      address: values.address,
      quantity: values.quantity,
      total: values.total,
      unitPrice,
      currency: "MAD",
      product: config.productName || "Premier Nasal Dilator – Starter Kit",
      brand: config.brand || "BON CHOIX",
      source: config.source || "landing-page",
      idempotencyKey: generateId(),
      submittedAt: new Date().toISOString(),
      pageUrl: window.location.href
    };

    const waUrl = buildWhatsAppUrl(values);

    try {
      if (window.bonchoixDb) {
        const orderToSave = {
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone,
          city: values.city,
          full_address: values.address,
          product_name: config.productName || "Premier Nasal Dilator – Starter Kit",
          product_price: unitPrice,
          quantity: values.quantity,
          total_amount: values.total,
          delivery_fee: 0,
          status: "new",
          admin_notes: "",
          source: "landing-page",
          idempotency_key: payload.idempotencyKey
        };
        const { error } = await window.bonchoixDb.from("orders").insert(orderToSave);
        if (error) throw new Error("Order could not be saved");
        markSubmitted(values);
        showSuccess({ saved: true, values, waUrl });
      } else if (config.orderEndpoint) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 12000);
        let response;

        try {
          response = await fetch(config.orderEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
            credentials: "same-origin",
            mode: "cors"
          });
        } finally {
          window.clearTimeout(timeout);
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        let result = {};
        try {
          result = await response.json();
        } catch {
          result = {};
        }

        if (result && result.ok === false) throw new Error(result.message || "Order rejected");

        const orderId = result.id || result.orderId || result.order_id || result.reference || null;
        markSubmitted(values);
        showSuccess({ saved: true, values, orderId, waUrl });
      } else {
        markSubmitted(values);
        showSuccess({ saved: false, values, waUrl, reason: "no-endpoint" });
        // This branch runs inside the click gesture, so the popup is usually allowed.
        const popup = window.open(waUrl, "_blank", "noopener");
        if (!popup) {
          // The success panel keeps a visible WhatsApp button as a fallback.
          if (successWa) successWa.focus();
        }
      }
    } catch (error) {
      console.error("[BON CHOIX] Order submission failed:", error);
      markSubmitted(values);
      showSuccess({ saved: false, values, waUrl, reason: "error" });
    } finally {
      isSubmitting = false;
      setLoading(false);
    }
  };

  if (form) form.addEventListener("submit", submitOrder);

  /* ------------------------------------------------------------------ */
  /* Reset order                                                         */
  /* ------------------------------------------------------------------ */
  if (newOrderButton) {
    newOrderButton.addEventListener("click", () => {
      if (!form || !successCard) return;
      form.reset();
      setQuantity(minQty);
      clearErrors();
      successCard.hidden = true;
      if (orderGrid) orderGrid.hidden = false;
      if (successSummary) successSummary.innerHTML = "";
      if (successWa) successWa.href = genericWhatsAppUrl;
      if (successWaLabel) successWaLabel.textContent = "تواصل معانا عبر واتساب";
      if (orderSection) orderSection.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      const firstInput = $("#firstName");
      if (firstInput) window.setTimeout(() => firstInput.focus({ preventScroll: true }), reduceMotion ? 0 : 450);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Sticky bar + floating WhatsApp                                      */
  /* ------------------------------------------------------------------ */
  if (orderSection && stickyBar && "IntersectionObserver" in window) {
    const orderObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        stickyBar.classList.toggle("is-hidden", visible);
        document.body.classList.toggle("order-in-view", visible);
      },
      { threshold: 0.05, rootMargin: "0px 0px -18% 0px" }
    );
    orderObserver.observe(orderSection);
  }

  /* ------------------------------------------------------------------ */
  /* Dialogs                                                             */
  /* ------------------------------------------------------------------ */
  $$("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById(button.dataset.openDialog);
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    });
  });

  $$("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog) dialog.close();
    });
  });

  $$("dialog.modal").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  /* ------------------------------------------------------------------ */
  /* Footer year                                                         */
  /* ------------------------------------------------------------------ */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
