// Preload critical resources
const preloadResources = [
  "/images/backgrounds/"
  // Preload most used CS2 item images
];

// Service worker for caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

// Performance optimizations
if (typeof window !== "undefined") {
  // Reduce animation frame rate on lower-end devices
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    document.documentElement.style.setProperty("--animation-duration", "0.6s");
  }
}
