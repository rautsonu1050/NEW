const scripts = new Map<string, Promise<void>>();
export function loadScript(src: string): Promise<void> {
  const old = scripts.get(src);
  if (old) return old;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scripts.delete(src);
      script.remove();
      reject(new Error("This feature could not load. Please try again."));
    };
    document.head.appendChild(script);
  });
  scripts.set(src, promise);
  return promise;
}
declare global {
  interface Window {
    L: any;
    google: any;
    Razorpay: any;
    qrcode: any;
  }
}
export function speak(text: string, language = "en-IN") {
  if (!("speechSynthesis" in window))
    throw new Error("Speech is not supported in this browser.");
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
  return utterance;
}
