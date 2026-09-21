/**
 * Razorpay Client-Side Script Loader
 *
 * Dynamically loads the Razorpay checkout script from their CDN.
 * This is needed because Razorpay's payment widget runs entirely in the browser.
 *
 * The flow:
 * 1. Server creates an order via /api/razorpay/checkout
 * 2. This script loads the Razorpay widget
 * 3. User enters payment details in the widget
 * 4. Widget sends payment to Razorpay
 * 5. On success, client calls /api/razorpay/verify to confirm the payment
 *
 * Returns true if script is loaded/ready, false on SSR or failure.
 */
export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    // Don't load on the server side (SSR) - Razorpay needs the browser
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    // Script already loaded - return immediately (avoids duplicate script tags)
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    // Create a script element and load the Razorpay checkout library
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
