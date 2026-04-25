// data-theme（<html> の属性）を観測し、変更のたびに callback を呼ぶ。
// 初回登録時にも現在値で callback を1回呼ぶ。
// 戻り値の関数で監視解除。
export type Theme = "light" | "dark";

function getTheme(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "dark" ? "dark" : "light";
}

export function observeTheme(callback: (theme: Theme) => void): () => void {
  callback(getTheme());

  const observer = new MutationObserver(() => callback(getTheme()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => observer.disconnect();
}
