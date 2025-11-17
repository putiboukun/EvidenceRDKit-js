<script>
  import { onDestroy } from "svelte";
  import { loadRDKit } from "../utils/loadRDKit.js";

  export let rows = [];
  export let smilesField = "smiles";
  export let columns = [];
  export let structureWidth = 180;
  export let structureHeight = 140;
  export let rowsPerPageOptions = [5, 10, 25, 50];
  export let initialRowsPerPage = 10;

  let renderedRows = [];
  let displayColumns = [];
  let columnCount = 1;
  let loadError = "";
  let isLoading = false;
  let renderToken = 0;
  let isDestroyed = false;
  const defaultFileName = "molecule-table.csv";
  let currentPage = 1;
  let rowsPerPage = initialRowsPerPage;
  let totalRows = 0;
  let totalPages = 1;
  let paginatedRows = [];
  let visibleRangeStart = 0;
  let visibleRangeEnd = 0;
  let normalizedRowsPerPageOptions = [];
  let previousRowsRef = rows;

  const normalizeColumns = (cols) =>
    Array.isArray(cols) ? cols.filter(Boolean) : [];

  const normalizePerPageOptions = (options) => {
    if (!Array.isArray(options) || options.length === 0) {
      return [initialRowsPerPage];
    }
    const unique = Array.from(
      new Set(
        options
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );
    return unique.length > 0 ? unique.sort((a, b) => a - b) : [initialRowsPerPage];
  };

  const normalizeRowsPerPage = (value, options) => {
    if (!Number.isFinite(value) || value <= 0) {
      return options[0];
    }
    if (!options.includes(value)) {
      return options.reduce((closest, option) => {
        return Math.abs(option - value) < Math.abs(closest - value) ? option : closest;
      }, options[0]);
    }
    return value;
  };

  async function renderRows(rowsValue) {
    const currentToken = ++renderToken;

    if (!Array.isArray(rowsValue) || rowsValue.length === 0) {
      renderedRows = [];
      loadError = "";
      isLoading = false;
      return;
    }

    isLoading = true;
    loadError = "";

    try {
      const RDKit = await loadRDKit();

      if (currentToken !== renderToken || isDestroyed) {
        return;
      }

      const results = rowsValue.map((row, index) => {
        const record = row ?? {};
        const smiles = record?.[smilesField];
        if (!smiles || typeof smiles !== "string") {
          return {
            index,
            row: record,
            svg: "",
            error: "SMILESが空です",
          };
        }

        let mol;
        try {
          mol = RDKit.get_mol(smiles);
          if (!mol || (typeof mol.is_valid === "function" && !mol.is_valid())) {
            throw new Error("SMILESの解析に失敗しました");
          }

          const drawingOptions = JSON.stringify({
            width: structureWidth,
            height: structureHeight,
          });
          const svg = mol.get_svg_with_highlights(drawingOptions);
          return {
            index,
            row: record,
            svg,
            error: "",
          };
        } catch (error) {
          return {
            index,
            row: record,
            svg: "",
            error: error?.message || "構造の生成に失敗しました",
          };
        } finally {
          if (mol) {
            mol.delete();
          }
        }
      });

      if (currentToken !== renderToken || isDestroyed) {
        return;
      }

      renderedRows = results;
    } catch (error) {
      if (currentToken !== renderToken || isDestroyed) {
        return;
      }
      loadError = error?.message || "RDKit.jsの読み込みに失敗しました";
      renderedRows = rowsValue.map((row, index) => ({
        index,
        row: row ?? {},
        svg: "",
        error: "RDKit.jsの読み込みに失敗しました",
      }));
    } finally {
      if (currentToken === renderToken && !isDestroyed) {
        isLoading = false;
      }
    }
  }

  $: displayColumns = normalizeColumns(columns);
  $: {
    if (displayColumns.length === 0 && Array.isArray(rows) && rows.length > 0) {
      displayColumns = Object.keys(rows[0]).filter((key) => key !== smilesField);
    }
    columnCount = 1 + displayColumns.length;
  }

  $: normalizedRowsPerPageOptions = normalizePerPageOptions(rowsPerPageOptions);
  $: rowsPerPage = normalizeRowsPerPage(rowsPerPage, normalizedRowsPerPageOptions);

  $: if (rows !== previousRowsRef) {
    previousRowsRef = rows;
    currentPage = 1;
  }

  $: totalRows = Array.isArray(rows) ? rows.length : 0;
  $: totalPages = rowsPerPage > 0 ? Math.max(1, Math.ceil(totalRows / rowsPerPage)) : 1;
  $: if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  $:
    paginatedRows = Array.isArray(rows)
      ? rows.slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage)
      : [];

  $: {
    if (totalRows === 0) {
      visibleRangeStart = 0;
      visibleRangeEnd = 0;
    } else {
      visibleRangeStart = (currentPage - 1) * rowsPerPage + 1;
      visibleRangeEnd = Math.min(currentPage * rowsPerPage, totalRows);
    }
  }

  $: if (!isDestroyed) {
    renderRows(paginatedRows);
  }

  onDestroy(() => {
    isDestroyed = true;
    renderToken++;
  });

  function isNumeric(val) {
    if (val === null || val === undefined) return false;
    const s = String(val).trim();
    if (s === "") return false;
    return !Number.isNaN(Number(s.replace(/,/g, "")));
  }

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const buildCsvContent = () => {
    const headers = [smilesField, ...displayColumns];
    const lines = [];
    lines.push(headers.map((header) => escapeCsvValue(header)).join(","));

    renderedRows.forEach((item) => {
      const rowValues = headers.map((key) => escapeCsvValue(item.row?.[key] ?? ""));
      lines.push(rowValues.join(","));
    });

    return lines.join("\r\n");
  };

  function handleDownloadCsv() {
    if (typeof window === "undefined" || renderedRows.length === 0) {
      return;
    }

    const csv = buildCsvContent();
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      currentPage -= 1;
    }
  }

  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage += 1;
    }
  }

  function handleRowsPerPageChange(event) {
    const nextValue = Number(event?.target?.value);
    if (Number.isFinite(nextValue) && nextValue > 0) {
      rowsPerPage = nextValue;
      currentPage = 1;
    }
  }
</script>

<div
  class="molecule-table-container"
  style={`--structure-width: ${structureWidth}px; --structure-height: ${structureHeight}px;`}
>
  <div class="table-actions">
    <div class="rows-per-page-control">
      <label>
        Rows per page
        <select value={rowsPerPage} on:change={handleRowsPerPageChange}>
          {#each normalizedRowsPerPageOptions as option}
            <option value={option} selected={option === rowsPerPage}>{option}</option>
          {/each}
        </select>
      </label>
    </div>
    <button
      type="button"
      class="download-button"
      on:click={handleDownloadCsv}
      disabled={isLoading || renderedRows.length === 0}
    >
      Download
    </button>
  </div>
  {#if loadError}
    <div class="load-error" role="alert">{loadError}</div>
  {/if}

  <div class="table-wrapper" role="region" aria-live="polite">
    <table class="molecule-table">
      <thead>
        <tr>
          <th scope="col" class="structure-header">Structure</th>
          {#each displayColumns as column}
            <th scope="col">{column}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#if isLoading}
          <tr>
            <td colspan={columnCount} class="status-cell">分子構造を生成しています...</td>
          </tr>
        {:else if renderedRows.length === 0}
          <tr>
            <td colspan={columnCount} class="status-cell">表示できるデータがありません。</td>
          </tr>
        {:else}
          {#each renderedRows as item (item.index)}
            <tr>
              <td class="structure-cell">
                {#if item.error}
                  <span class="cell-error" title={item.error}>エラー</span>
                {:else if item.svg}
                  <div
                    class="structure-figure"
                    aria-label={`Structure for ${item.row?.[smilesField]}`}
                  >
                    {@html item.svg}
                  </div>
                {/if}
              </td>
              {#each displayColumns as column}
                <td data-column={column} class={isNumeric(item.row?.[column] ?? '') ? 'cell-number' : ''}>
                  {item.row?.[column] ?? ""}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="pagination" aria-live="polite">
    <div class="pagination-info">
      {#if totalRows === 0}
        No records to display
      {:else}
        Showing {visibleRangeStart} - {visibleRangeEnd} of {totalRows}
      {/if}
    </div>
    <div class="pagination-controls">
      <button type="button" on:click={goToPreviousPage} disabled={currentPage <= 1}>
        Prev
      </button>
      <span class="pagination-status">Page {currentPage} / {totalPages}</span>
      <button type="button" on:click={goToNextPage} disabled={currentPage >= totalPages}>
        Next
      </button>
    </div>
  </div>
</div>

<style>
  .molecule-table-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .table-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .rows-per-page-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .rows-per-page-control select {
    padding: 0.4rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--evidence-border-color, #d7dce0);
    font-size: 0.9rem;
  }

  .download-button {
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem 1.25rem;
    background: #0f172a;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .download-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .download-button:not(:disabled):hover {
    opacity: 0.85;
  }

  .download-button:not(:disabled):active {
    transform: scale(0.98);
  }

  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--evidence-border-color, #d7dce0);
    border-radius: 0.75rem;
    background: var(--evidence-surface, #fff);
    box-shadow: 0 0.75rem 1.5rem rgba(15, 23, 42, 0.08);
  }

  .molecule-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 480px;
  }

  thead {
    background: linear-gradient(135deg, #0f172a, #1f2937);
    color: #fff;
  }

  th,
  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
    text-align: left;
    vertical-align: middle;
    font-size: 0.95rem;
  }

  /* tbody のセル文字を太字かつ黒にする（thead の色指定を優先） */
  tbody td {
    color: #000;
    font-weight: 700;
    padding: 0.5rem 1rem;
  }

  /* 数字セルをさらに強調する */
  .cell-number {
    color: #000;
    font-weight: 800;
  }

  tbody tr:nth-child(even) {
    background: rgba(15, 23, 42, 0.02);
  }

  .structure-header,
  .structure-cell {
    width: var(--structure-width, 180px);
  }

  .structure-figure {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .structure-figure :global(svg) {
    width: 100%;
    height: auto;
    max-width: var(--structure-width, 180px);
    max-height: var(--structure-height, 140px);
  }

  .status-cell {
    text-align: center;
    color: #475569;
    font-weight: 500;
  }

  .load-error {
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    color: #991b1b;
    font-weight: 600;
  }

  .cell-error {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: rgba(220, 38, 38, 0.1);
    color: #b91c1c;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .pagination-info {
    font-weight: 600;
    color: #475569;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pagination-controls button {
    border: none;
    border-radius: 0.5rem;
    padding: 0.4rem 0.85rem;
    background: #1e293b;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .pagination-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-controls button:not(:disabled):hover {
    opacity: 0.85;
  }

  .pagination-controls button:not(:disabled):active {
    transform: scale(0.98);
  }

  .pagination-status {
    font-weight: 600;
    color: #0f172a;
  }

  @media (max-width: 768px) {
    .molecule-table {
      min-width: 100%;
    }

    th,
    td {
      padding: 0.5rem 0.75rem;
    }

    .pagination {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
