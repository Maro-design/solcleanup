/** Server-safe: the storage key and the pre-paint script that applies the saved theme. */
export const THEME_KEY = "solcleanup-theme";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;
