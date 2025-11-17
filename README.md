# EvidenceRDKit-js

RDKit.js を Evidence プロジェクトや Svelte ページに組み込み、SMILES/Molblock 情報から分子構造を表示するためのコンポーネント集です。`components/` 以下の Svelte コンポーネントと、RDKit.js を CDN から遅延読み込みするユーティリティ (`utils/loadRDKit.js`) だけで完結しているため、既存の Evidence プロジェクトにそのまま取り込めます。

## ディレクトリ構成

| パス | 説明 |
| --- | --- |
| `components/ChemicalStructure.svelte` | 単一分子の SVG レンダリング、SMILES と Molblock の両方をサポート。 |
| `components/MoleculeGallery.svelte` | 複数分子をレスポンシブなグリッドで表示。未指定時はサンプル分子を表示。 |
| `components/MoleculeTable.svelte` | テーブルの各行で分子構造を描画し、残りの列をそのまま表示。列推測やエラー表示も実装。 |
| `components/ScatterStructurePlot.svelte` | 散布図と構造プレビューを連動させ、ポイントをクリックすると対応する分子を表示。 |
| `utils/loadRDKit.js` | 主要 CDN 候補から RDKit.js を探し、初回アクセス時にロードして共有。 |

## 使い方

1. Evidence プロジェクト（`/components` と `/utils` を配置できる構成）に本リポジトリの対応ディレクトリをコピーします。
2. Evidence の Markdown ページや Svelte ファイルで必要なコンポーネントを `import` し、SMILES/Molblock データを渡します。
3. ブラウザで初めてコンポーネントがマウントされた際に `loadRDKit()` が実行され、利用可能な CDN から RDKit.js/WASM を自動取得します。

```svelte
<!-- 例: ChemicalStructure コンポーネント -->
<script>
  import ChemicalStructure from "../components/ChemicalStructure.svelte";
</script>

<ChemicalStructure
  smiles="CC(=O)Oc1ccccc1C(=O)O"
  title="アスピリン"
  width={320}
  height={280}
/>
```

### MoleculeGallery（ギャラリー表示）

```svelte
<MoleculeGallery
  molecules=[
    { smiles: "c1ccccc1", title: "ベンゼン" },
    { smiles: "CCO", title: "エタノール" }
  ]
  width={280}
  height={280}
/>
```

### MoleculeTable（テーブル表示）

Evidenceの SQL ブロックなどで取得した配列を`rows`ブロックとして渡し、化学構造を含んだ表を表示することができます。抽出された SQL ブロックが多数ある場合には表示件数を
調整することも可能で、ダウンロードボタンからcsvとして保存することもできます。


```svelte
<!-- rows は Evidence の SQL ブロックなどで取得した配列を想定 -->
<MoleculeTable
  rows={rows}
  smilesField="smiles"
  columns={["name", "category", "score"]}
  structureWidth={200}
  structureHeight={160}
/>
```

### ScatterStructurePlot（散布図＋構造プレビュー）

数値指標を縦横軸にとった散布図と、クリックで選択したポイントの化学構造プレビューを 1 つのコンポーネントで表示できます。Evidence
の SQL ブロックなどで取得した配列を `points` プロパティとして渡し、`xField` / `yField` / `smilesField` などで列名を指定してください。
`backgroundColor` や `pointColor` を使えば、背景やポイントの色味もブランドカラーに合わせて調整できます。

```svelte
<ScatterStructurePlot
  points={rows}
  xField="logp"
  yField="potency"
  labelField="compound"
  smilesField="smiles"
  xLabel="LogP"
  yLabel="Potency"
  title="LogP vs Potency"
  width={520}
  height={340}
  backgroundColor="#f9fbff"
  pointColor="#d81b60"
/>
```
## デモページ

それぞれの表示例（散布図と構造プレビューを含む）を demo.md に記載しています。コンポーネントとあわせてお使いの Evidence プロジェクトに組み込むことで表示確認できるようになっています。


## RDKit.js の読み込み戦略

- `loadRDKit()` は `unpkg` や `jsDelivr` の複数 CDN を順番に試行し、`initRDKitModule` が成功するまで繰り返します。
- 成功時にはモジュールを `window.__rdkitModule` にキャッシュし、以降の描画では即座に再利用されます。
- サーバーサイド（Evidence のデータ準備フェーズなど）で呼び出された場合は明示的にエラーを返し、ブラウザでのみ実行されるようにしています。

## エラーハンドリングとアクセシビリティ

- ChemicalStructure / MoleculeTable はレンダリング中のローディング表示と、無効な SMILES・Molblock への詳細なエラーメッセージを備えています。
- 生成した SVG には `aria-label` を付与し、スクリーンリーダーでも内容を把握できるよう配慮しています。
- テーブルでは SMILES 列が空の場合に明示的なエラー表示を行い、数字列は太字で整形して可読性を高めています。

## トラブルシューティング

| 症状 | チェックポイント |
| --- | --- |
| 分子が描画されない | SMILES/Molblock の内容を確認し、コンソールに表示される RDKit.js の読み込みエラーを参照。 |
| すべての行が「エラー」表示になる | `smilesField` プロパティがデータ列名と一致しているか確認。 |
| CDN からの読み込みに失敗する | ファイアウォールや CSP 設定で `unpkg.com` / `cdn.jsdelivr.net` が許可されているか確認。必要に応じて `utils/loadRDKit.js` の候補 URL を追加。 |

詳細なサンプルや SMILES の例は `RDKIT_GUIDE.md` を参照してください。

## ライセンス

本リポジトリは MIT License の下で提供されています。RDKit.js 自体のライセンス条件についても別途ご確認ください。
