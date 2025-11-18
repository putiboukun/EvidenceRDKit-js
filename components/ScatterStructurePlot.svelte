<script>
  import { onDestroy, onMount } from "svelte";
  import ChemicalStructure from "./ChemicalStructure.svelte";
  import { loadPlotly } from "../utils/loadPlotly.js";

  export let points = [];
  export let xField = "x";
  export let yField = "y";
  export let labelField = "label";
  export let smilesField = "smiles";
  export let width = 520;
  export let height = 360;
  export let pointRadius = 6;
  export let backgroundColor = "#fff";
  export let pointColor = "#1e88e5";
  export let title = "";
  export let xLabel = "X";
  export let yLabel = "Y";
  export let tooltipStructureWidth = 200;
  export let tooltipStructureHeight = 160;

  let plotHost;
  let isMounted = false;
  let renderToken = 0;
  let hoveredPoint = null;
  let tooltipPosition = { left: 0, top: 0 };
  let isRendering = false;
  let plotError = "";
  let hoverHandlersAttached = false;
  let plotlyModule = null;

  const sanitizeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  $: validPoints = (points ?? [])
    .map((point) => ({
      raw: point,
      x: sanitizeNumber(point?.[xField]),
      y: sanitizeNumber(point?.[yField]),
      label: point?.[labelField] ?? "",
      smiles: point?.[smilesField] ?? ""
    }))
    .filter((point) => point.x !== null && point.y !== null && point.smiles);

  const resetTooltip = () => {
    hoveredPoint = null;
  };

  function estimateTooltipSize() {
    const estimatedWidth = tooltipStructureWidth + 96;
    const estimatedHeight = tooltipStructureHeight + 140;
    return { estimatedWidth, estimatedHeight };
  }

  function updateTooltipPosition(clientX, clientY) {
    if (!plotHost) return;
    const bounds = plotHost.getBoundingClientRect();
    const offsetX = clientX - bounds.left + 12;
    const offsetY = clientY - bounds.top + 12;
    const { estimatedWidth, estimatedHeight } = estimateTooltipSize();

    let left = offsetX;
    let top = offsetY;

    if (left + estimatedWidth > bounds.width) {
      left = Math.max(8, bounds.width - estimatedWidth - 8);
    }

    if (top + estimatedHeight > bounds.height) {
      top = Math.max(8, bounds.height - estimatedHeight - 8);
    }

    tooltipPosition = { left, top };
  }

  function bindHoverEvents() {
    if (!plotHost?.on || hoverHandlersAttached) {
      return;
    }

    plotHost.on("plotly_hover", (eventData) => {
      const point = eventData?.points?.[0];
      if (!point) return;
      const hovered = validPoints[point.pointIndex];
      if (!hovered) return;
      hoveredPoint = hovered;
      const clientX = eventData.event?.clientX ?? 0;
      const clientY = eventData.event?.clientY ?? 0;
      updateTooltipPosition(clientX, clientY);
    });

    plotHost.on("plotly_unhover", () => {
      hoveredPoint = null;
    });

    hoverHandlersAttached = true;
  }

  function teardownPlot() {
    if (plotlyModule && plotHost) {
      plotlyModule.purge(plotHost);
    }
    hoverHandlersAttached = false;
    resetTooltip();
  }

  async function renderPlot() {
    const requestId = ++renderToken;

    if (!plotHost || !isMounted) {
      return;
    }

    if (!validPoints.length) {
      teardownPlot();
      plotError = "";
      return;
    }

    isRendering = true;
    plotError = "";
    resetTooltip();

    try {
      plotlyModule = await loadPlotly();
      if (requestId !== renderToken) {
        return;
      }

      const trace = {
        x: validPoints.map((point) => point.x),
        y: validPoints.map((point) => point.y),
        text: validPoints.map((point) => point.label || ""),
        mode: "markers",
        type: "scattergl",
        hoverinfo: "skip",
        marker: {
          size: Math.max(2, pointRadius * 2),
          color: pointColor,
          line: { width: 0 }
        }
      };

      const layout = {
        title: title || undefined,
        xaxis: { title: xLabel },
        yaxis: { title: yLabel },
        plot_bgcolor: backgroundColor,
        paper_bgcolor: backgroundColor,
        margin: { t: title ? 56 : 32, r: 32, b: 56, l: 64 },
        width,
        height,
        font: { family: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }
      };

      const config = {
        displayModeBar: false,
        responsive: true
      };

      await plotlyModule.react(plotHost, [trace], layout, config);
      bindHoverEvents();
    } catch (error) {
      if (requestId !== renderToken) {
        return;
      }
      plotError = error?.message || "散布図の描画に失敗しました。Plotly の読み込み状況を確認してください。";
    } finally {
      if (requestId === renderToken) {
        isRendering = false;
      }
    }
  }

  onMount(() => {
    isMounted = true;
    renderPlot();
  });

  onDestroy(() => {
    isMounted = false;
    teardownPlot();
  });

  $: if (isMounted) {
    // 参照することで依存関係を追跡
    validPoints;
    xLabel;
    yLabel;
    title;
    pointColor;
    pointRadius;
    width;
    height;
    backgroundColor;
    renderPlot();
  }
</script>

<div class="scatter-structure">
  {#if title}
    <h3>{title}</h3>
  {/if}

  {#if !validPoints.length}
    <div class="empty">表示可能なデータポイントがありません。</div>
  {:else}
    <div
      class="plot-container"
      style={`width:${width ? `${width}px` : "100%"};height:${
        height ? `${height}px` : "360px"
      };--plot-background:${backgroundColor};`}
    >
      <div
        class="plotly-host"
        bind:this={plotHost}
        role="img"
        aria-label={`${title || "scatterplot"}。ポイントにマウスオーバーすると構造プレビューが表示されます。`}
      ></div>

      {#if hoveredPoint}
        <div
          class="structure-tooltip"
          style={`left:${tooltipPosition.left}px;top:${tooltipPosition.top}px;`}
        >
          <div class="structure-tooltip__meta">
            <strong>{hoveredPoint.label || "データポイント"}</strong>
            <div>{xLabel}: {hoveredPoint.x}</div>
            <div>{yLabel}: {hoveredPoint.y}</div>
          </div>
          <ChemicalStructure
            smiles={hoveredPoint.smiles}
            width={tooltipStructureWidth}
            height={tooltipStructureHeight}
            title=""
          />
        </div>
      {/if}

      {#if isRendering}
        <div class="loading-overlay">描画中...</div>
      {/if}
    </div>
  {/if}

  {#if plotError}
    <div class="error">{plotError}</div>
  {/if}
</div>

<style>
  .scatter-structure {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .plot-container {
    position: relative;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--plot-background, #fff);
    min-height: 320px;
  }

  .plotly-host {
    width: 100%;
    height: 100%;
  }

  .structure-tooltip {
    position: absolute;
    min-width: 220px;
    padding: 0.75rem;
    border-radius: 8px;
    background-color: rgba(255, 255, 255, 0.95);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
    border: 1px solid rgba(0, 0, 0, 0.08);
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  .structure-tooltip__meta {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    font-size: 0.85rem;
    color: #374151;
  }

  .structure-tooltip__meta strong {
    font-size: 0.95rem;
    color: #111827;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.65);
    color: #555;
    font-size: 0.95rem;
  }

  .empty {
    padding: 1rem;
    border: 1px dashed #ccc;
    border-radius: 8px;
    text-align: center;
    color: #666;
    background-color: #fafafa;
  }

  .error {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    background-color: #fff5f5;
    border: 1px solid #fecaca;
    color: #b91c1c;
  }
</style>
