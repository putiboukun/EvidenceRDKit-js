<script>
  import { onDestroy, onMount } from "svelte";
  import { loadRDKit } from "../utils/loadRDKit.js";

  export let smiles = "";
  export let molblock = ""; // 後方互換性のための小文字プロパティ
  export let molBlock = "";
  export let width = 300;
  export let height = 300;
  export let title = "";

  let svg = "";
  let error = "";
  let loading = false;

  let currentMol;
  let isMounted = false;
  let renderToken = 0;
  let isDestroyed = false;

  const normalize = (value) => value?.trim?.() ?? "";

  async function renderMolecule(smilesValue, molBlockValue, widthValue, heightValue) {
    const requestId = ++renderToken;

    const hasSmiles = Boolean(smilesValue);
    const hasMolBlock = Boolean(molBlockValue);

    if (!hasSmiles && !hasMolBlock) {
      if (currentMol) {
        currentMol.delete();
        currentMol = null;
      }

      svg = "";
      error = "SMILES文字列またはMolblock形式を指定してください";
      loading = false;
      return;
    }

    loading = true;
    error = "";

    try {
      const RDKit = await loadRDKit();

      if (requestId !== renderToken || isDestroyed) {
        return;
      }

      if (currentMol) {
        currentMol.delete();
        currentMol = null;
      }

      const input = hasMolBlock ? molBlockValue : smilesValue;
      currentMol = RDKit.get_mol(input);

      if (!currentMol || !currentMol.is_valid?.()) {
        throw new Error(
          hasMolBlock
            ? "Molblockデータが正しくありません。"
            : `SMILES文字列が不正です: ${smilesValue}`
        );
      }

      const drawingOptions = JSON.stringify({ width: widthValue, height: heightValue });
      svg = currentMol.get_svg_with_highlights(drawingOptions);
      error = "";
    } catch (err) {
      svg = "";
      error = err?.message || "分子構造の描画に失敗しました。";
      if (currentMol) {
        currentMol.delete();
        currentMol = null;
      }
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    isMounted = true;
  });

  $: normalizedSmiles = normalize(smiles);
  $: normalizedMolBlock = normalize(molBlock || molblock);

  $: if (isMounted) {
    renderMolecule(normalizedSmiles, normalizedMolBlock, width, height);
  }

  onDestroy(() => {
    isDestroyed = true;
    renderToken++;
    if (currentMol) {
      currentMol.delete();
      currentMol = null;
    }
  });

  $: ariaLabel =
    normalize(title) || normalizedSmiles || (normalizedMolBlock ? "Molblock構造" : "化学構造");
</script>

<div class="chemical-structure-container" aria-live="polite">
  {#if title}
    <h3>{title}</h3>
  {/if}

  {#if loading}
    <div class="loading">読み込み中...</div>
  {:else if svg}
    <div class="canvas-wrapper" style={`width: ${width}px; height: ${height}px;`}>
      <div class="svg" aria-label={ariaLabel} role="img">{@html svg}</div>
    </div>
  {:else if error}
    <div class="error">{error}</div>
  {/if}
</div>

<style>
  .chemical-structure-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #fafafa;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
  }

  .canvas-wrapper {
    border: 1px solid #e0e0e0;
    background-color: white;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 100%;
  }

  .svg :global(svg) {
    max-width: 100%;
    max-height: 100%;
  }

  .loading {
    padding: 1rem;
    color: #666;
  }

  .error {
    color: #d32f2f;
    padding: 1rem;
    background-color: #ffebee;
    border-radius: 4px;
    border-left: 4px solid #d32f2f;
  }
</style>
