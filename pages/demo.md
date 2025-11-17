---
title: StructureDemo
components:
  ChemicalStructure: ../components/ChemicalStructure.svelte
  MoleculeGallery: ../components/MoleculeGallery.svelte
  MoleculeTable: ../components/MoleculeTable.svelte
  ScatterStructurePlot: ../components/ScatterStructurePlot.svelte
---

## 化学構造の表示

化学構造をSMILES形式で表示できます。

<ChemicalStructure smiles="CC(=O)Oc1ccccc1C(=O)O" title="アセチルサリチル酸 (アスピリン)" width={150} height={100}/>
<ChemicalStructure smiles="c1ccccc1" title="ベンゼン" width={150} height={100}/>
<ChemicalStructure smiles="CC(C)Cc1ccc(cc1)C(C)C(O)=O" title="イブプロフェン" width={150} height={100}/>

## 化学構造のギャラリー表示

化学構造をギャラリー表示できます。

<MoleculeGallery 
  molecules={[
    { smiles: "c1ccccc1", title: "ベンゼン" },
    { smiles: "CCO", title: "エタノール" }
  ]}
  width={150}
  height={100}
/>

## SQL検索結果を用いた分子一覧表示

以下のSQLで取得した表の`smiles`列を使って、`MoleculeTable`コンポーネントが自動的に化学構造を描画します。

```sql molecule_library
select 'Aspirin' as name, 'Pain Reliever' as category, 'CC(=O)Oc1ccccc1C(=O)O' as smiles
union all
select 'Caffeine', 'Stimulant', 'Cn1cnc2c1c(=O)n(C)c(=O)n2C'
union all
select 'Nicotine', 'Stimulant', 'CN1CCC[C@H]1c2cccnc2'
union all
select 'Morphine', 'Analgesic', 'CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)O)O[C@H]3[C@H](C=C4)O'
union all
select 'Ibuprofen', 'Anti-inflammatory', 'CC(C)CC1=CC=C(C=C1)[C@@H](C)C(=O)O'
union all
select 'Acetaminophen', 'Pain Reliever', 'CC(=O)NC1=CC=C(C=C1)O'
```

<MoleculeTable rows={molecule_library} smilesField="smiles" columns={["name", "category"]} />

## 散布図と連動した化学構造プレビュー

`ScatterStructurePlot`を使うと、散布図のポイントをクリックするだけで該当レコードの化学構造を横に表示できます。例えば以下では、`potency` と `logp` を縦横軸に、`smiles` 列を構造描画に利用しています。`backgroundColor` や `pointColor` を指定すると、図の雰囲気を好きな色にまとめられます。

```sql potency_map
select 'Aspirin' as compound, 5.5 as potency, 1.2 as logp, 'CC(=O)Oc1ccccc1C(=O)O' as smiles
union all select 'Caffeine', 7.8, -0.1, 'Cn1cnc2c1c(=O)n(C)c(=O)n2C'
union all select 'Ibuprofen', 6.8, 3.5, 'CC(C)CC1=CC=C(C=C1)[C@@H](C)C(=O)O'
union all select 'Nicotine', 6.2, 1.0, 'CN1CCC[C@H]1c2cccnc2'
union all select 'Acetaminophen', 5.0, 0.5, 'CC(=O)NC1=CC=C(C=C1)O'
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
