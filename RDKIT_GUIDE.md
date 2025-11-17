# RDKit.js 統合ガイド

このプロジェクトにRDKit.jsを統合し、化学構造を表示できるようにしました。

## 仕組み

- `utils/loadRDKit.js`にて事前にRDKit.jsをロードしてそのRDKit.jsを利用して化学構造を描画する。

## 使用可能なコンポーネント

### 1. ChemicalStructure.svelte

単一の分子構造を表示します。

**プロパティ:**
- `smiles` (string): 分子のSMILES表記
- `molblock` (string): Molblock形式のデータ（オプション）
- `title` (string): タイトル（オプション）
- `width` (number): キャンバスの幅（デフォルト: 300）
- `height` (number): キャンバスの高さ（デフォルト: 300）

**例:**
```markdown
<ChemicalStructure 
  smiles="CC(=O)Oc1ccccc1C(=O)O" 
  title="アセチルサリチル酸" 
  width={350} 
  height={300}
/>
```

### 2. MoleculeGallery.svelte

複数の分子構造をギャラリー表示します。

**プロパティ:**
- `molecules` (array): 分子データの配列（各要素は `{smiles: string, title: string}`）
- `width` (number): 各キャンバスの幅（デフォルト: 250）
- `height` (number): 各キャンバスの高さ（デフォルト: 250）

**例:**
```markdown
<MoleculeGallery
  molecules={[
    { smiles: "c1ccccc1", title: "ベンゼン" },
    { smiles: "CCO", title: "エタノール" }
  ]}
  width={300}
  height={300}
/>
```

### 3. MoleculeTable.svelte

SQLクエリなどから取得した表形式データの`smiles`列を基に、各行の分子構造をテーブル表示します。

**プロパティ:**
- `rows` (array): 分子情報を含む行データ
- `smilesField` (string): SMILES文字列を保持する列名（デフォルト: `"smiles"`）
- `columns` (array): テーブルに表示する列名（省略時は`smiles`以外の列を自動表示）
- `structureWidth` / `structureHeight` (number): 描画する分子構造セルのサイズ

**例:**
```markdown
sql molecule_library
select 'Aspirin' as name, 'Pain Reliever' as category, 'CC(=O)Oc1ccccc1C(=O)O' as smiles
```
```
<MoleculeTable rows={molecule_library} smilesField="smiles" columns={["name", "category"]} />
```

### 4. ScatterStructurePlot.svelte

散布図と化学構造プレビューを 1 つのビューにまとめ、クリックで選択したポイントを RDKit.js で描画した構造に紐付けられます。Evidence の SQL ブロックなどで取得した行配列をそのまま渡せるため、薬効や物性指標を視覚的に比較しながら構造を確認する用途に便利です。

**プロパティ:**
- `points` (array): 散布図に描画するレコード配列
- `xField` / `yField` (string): 横軸・縦軸として使用する列名
- `labelField` (string): ポイントのラベルに利用する列名（任意）
- `smilesField` (string): プレビューする SMILES 列名
- `title`, `xLabel`, `yLabel` (string): 見出しや軸ラベルのカスタマイズ
- `width`, `height`, `pointRadius` (number): SVG 散布図のサイズやポイント半径
- `backgroundColor`, `pointColor` (string): プロット背景とポイントのカラーリング

**例:**
```markdown
sql potency_map
select 'Aspirin' as compound, 5.5 as potency, 1.2 as logp, 'CC(=O)Oc1ccccc1C(=O)O' as smiles
union all select 'Caffeine', 7.8, -0.1, 'Cn1cnc2c1c(=O)n(C)c(=O)n2C'
union all select 'Ibuprofen', 6.8, 3.5, 'CC(C)CC1=CC=C(C=C1)[C@@H](C)C(=O)O'
union all select 'Nicotine', 6.2, 1.0, 'CN1CCC[C@H]1c2cccnc2'
```
```
<ScatterStructurePlot
  points={potency_map}
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

## SMILES表記の例

- `CCO` - エタノール
- `c1ccccc1` - ベンゼン
- `CC(=O)Oc1ccccc1C(=O)O` - アセチルサリチル酸（アスピリン）
- `CC(C)Cc1ccc(cc1)C(C)C(O)=O` - イブプロフェン
- `C(C(C(=O)O)N)S` - システイン

## 機能

- ✅ SMILES文字列からの分子構造表示
- ✅ Molblock形式のサポート
- ✅ SVG形式での高品質な描画
- ✅ カスタマイズ可能なサイズ
- ✅ エラーハンドリング

## トラブルシューティング

### 分子構造が表示されない場合

1. SMILES文字列が正しいか確認してください
2. ブラウザの開発者ツール（F12）でコンソールエラーを確認してください
3. RDKit.jsが正しく読み込まれているか確認してください

### パフォーマンスの改善

大量の分子を表示する場合は、以下を検討してください：
- 表示する分子の数を制限する
- 表示サイズを小さくする
- 仮想スクロールを使用する

## 参考資料

- [RDKit Documentation](https://www.rdkit.org/)
- [RDKit.js GitHub](https://github.com/rdkit/rdkit-js)
- [SMILES表記について](https://en.wikipedia.org/wiki/Simplified_molecular_input_line_entry_system)
