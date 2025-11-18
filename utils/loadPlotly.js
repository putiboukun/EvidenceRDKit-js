let plotlyPromise;

const DEFAULT_PLOTLY_URL =
  "https://cdn.plot.ly/plotly-2.30.0.min.js";

function getPreferredPlotlyUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_PLOTLY_URL;
  }

  if (window.__PlotlyScriptUrl && typeof window.__PlotlyScriptUrl === "string") {
    return window.__PlotlyScriptUrl;
  }

  const meta = document.querySelector("meta[name='plotly-src']");
  if (meta?.content) {
    return meta.content;
  }

  return DEFAULT_PLOTLY_URL;
}

export async function loadPlotly() {
  if (typeof window === "undefined") {
    throw new Error("Plotly はブラウザ環境でのみ利用できます。");
  }

  if (window.Plotly) {
    return window.Plotly;
  }

  if (!plotlyPromise) {
    plotlyPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = getPreferredPlotlyUrl();
      script.async = true;
      script.onload = () => {
        if (window.Plotly) {
          resolve(window.Plotly);
        } else {
          reject(new Error("Plotly の読み込みに成功しましたが、グローバルに公開されていません。"));
        }
      };
      script.onerror = () => {
        reject(new Error("Plotly の読み込みに失敗しました。ネットワークや CSP 設定を確認してください。"));
      };
      document.head.appendChild(script);
    });
  }

  return plotlyPromise;
}
