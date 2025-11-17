<script>
  import ChemicalStructure from "./ChemicalStructure.svelte";

  export let points = [];
  export let xField = "x";
  export let yField = "y";
  export let labelField = "label";
  export let smilesField = "smiles";
  export let width = 520;
  export let height = 360;
  export let pointRadius = 6;
  export let title = "";
  export let xLabel = "X";
  export let yLabel = "Y";

  const padding = { top: 20, right: 24, bottom: 48, left: 56 };

  let selectedPoint = null;

  const sanitizeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const getExtent = (values) => {
    if (!values.length) {
      return [0, 1];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      const delta = Math.abs(min) || 1;
      return [min - delta, max + delta];
    }

    return [min, max];
  };

  const scaleValue = (value, domainMin, domainMax, rangeMin, rangeMax) => {
    if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
    const ratio = (value - domainMin) / (domainMax - domainMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };

  $: validPoints = (points ?? []).map((point) => ({
    raw: point,
    x: sanitizeNumber(point?.[xField]),
    y: sanitizeNumber(point?.[yField]),
    label: point?.[labelField] ?? "",
    smiles: point?.[smilesField] ?? ""
  })).filter((point) => point.x !== null && point.y !== null && point.smiles);

  $: xValues = validPoints.map((point) => point.x);
  $: yValues = validPoints.map((point) => point.y);

  $: [xMin, xMax] = getExtent(xValues);
  $: [yMin, yMax] = getExtent(yValues);

  const tickCount = 5;

  const buildTicks = (min, max) => {
    if (min === max) {
      return [min];
    }

    const ticks = [];
    const step = (max - min) / (tickCount - 1);

    for (let i = 0; i < tickCount; i++) {
      ticks.push(min + step * i);
    }

    return ticks;
  };

  $: xTicks = buildTicks(xMin, xMax);
  $: yTicks = buildTicks(yMin, yMax);

  const formatTick = (value) => {
    if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
      return value.toExponential(1);
    }
    return Number.parseFloat(value.toFixed(2));
  };

  const handleSelect = (point) => {
    selectedPoint = point;
  };

  const handleKeydown = (event, point) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(point);
    }
  };
</script>

<div class="scatter-structure">
  {#if title}
    <h3>{title}</h3>
  {/if}

  {#if !validPoints.length}
    <div class="empty">表示可能なデータポイントがありません。</div>
  {:else}
    <div class="plot-wrapper" style={`width:${width}px;`}>
      <svg
        class="plot"
        width={width}
        height={height}
        role="img"
        aria-label={`${title || "scatterplot"}。ポイントをクリックすると構造が表示されます。`}
      >
        <g transform={`translate(${padding.left},${padding.top})`}>
          <line
            class="axis"
            x1={0}
            y1={height - padding.top - padding.bottom}
            x2={width - padding.left - padding.right}
            y2={height - padding.top - padding.bottom}
          />
          <line class="axis" x1={0} y1={0} x2={0} y2={height - padding.top - padding.bottom} />

          {#each xTicks as tick}
            {#if Number.isFinite(tick)}
              <g
                transform={`translate(${scaleValue(
                  tick,
                  xMin,
                  xMax,
                  0,
                  width - padding.left - padding.right
                )},${height - padding.top - padding.bottom})`}
              >
                <line class="tick" y2="6" />
                <text class="tick-label x" y="20">{formatTick(tick)}</text>
              </g>
            {/if}
          {/each}

          {#each yTicks as tick}
            {#if Number.isFinite(tick)}
              <g
                transform={`translate(0,${scaleValue(
                  tick,
                  yMax,
                  yMin,
                  0,
                  height - padding.top - padding.bottom
                )})`}
              >
                <line class="tick" x2="-6" />
                <text class="tick-label y" x="-10" dy="0.32em">{formatTick(tick)}</text>
              </g>
            {/if}
          {/each}

          {#each validPoints as point}
            <circle
              class:active={selectedPoint === point}
              cx={scaleValue(point.x, xMin, xMax, 0, width - padding.left - padding.right)}
              cy={scaleValue(point.y, yMax, yMin, 0, height - padding.top - padding.bottom)}
              r={pointRadius}
              tabindex="0"
              aria-label={`${point.label || "ポイント"} (${xLabel}: ${point.x}, ${yLabel}: ${point.y})。クリックで構造を表示。`}
              on:click={() => handleSelect(point)}
              on:keydown={(event) => handleKeydown(event, point)}
            />
          {/each}
        </g>

        <text
          class="axis-label"
          x={padding.left + (width - padding.left - padding.right) / 2}
          y={height - 10}
        >
          {xLabel}
        </text>
        <text
          class="axis-label"
          transform={`translate(16,${padding.top + (height - padding.top - padding.bottom) / 2}) rotate(-90)`}
        >
          {yLabel}
        </text>
      </svg>

      <div class="structure-panel">
        {#if selectedPoint}
          <div class="structure-meta">
            <h4>{selectedPoint.label || "選択中のポイント"}</h4>
            <p>{xLabel}: {selectedPoint.x}</p>
            <p>{yLabel}: {selectedPoint.y}</p>
          </div>
          <ChemicalStructure
            smiles={selectedPoint.smiles}
            width={200}
            height={160}
            title=""
          />
        {:else}
          <p class="hint">ポイントをクリックすると対応する化学構造が表示されます。</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .scatter-structure {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h3 {
    margin: 0;
  }

  .plot-wrapper {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  svg {
    border: 1px solid #e0e0e0;
    background-color: #fff;
    border-radius: 8px;
  }

  .axis {
    stroke: #444;
    stroke-width: 1;
  }

  .tick {
    stroke: #666;
  }

  .tick-label {
    font-size: 0.75rem;
    fill: #444;
  }

  .tick-label.x {
    text-anchor: middle;
  }

  .tick-label.y {
    text-anchor: end;
  }

  circle {
    fill: #1e88e5;
    opacity: 0.8;
    cursor: pointer;
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  circle.active,
  circle:focus,
  circle:hover {
    opacity: 1;
    transform: scale(1.2);
    outline: none;
  }

  .axis-label {
    fill: #333;
    font-weight: 600;
    text-anchor: middle;
  }

  .structure-panel {
    flex: 1;
    min-width: 220px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    background-color: #fafafa;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
  }

  .structure-meta {
    text-align: center;
  }

  .structure-meta h4 {
    margin: 0 0 0.25rem;
  }

  .hint {
    margin: 0;
    color: #666;
    text-align: center;
  }

  .empty {
    padding: 1rem;
    border: 1px dashed #ccc;
    border-radius: 8px;
    text-align: center;
    color: #666;
  }
</style>
