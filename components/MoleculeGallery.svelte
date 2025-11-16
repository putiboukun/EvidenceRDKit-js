<script>
	import ChemicalStructure from './ChemicalStructure.svelte';

	export let molecules = [];
	export let width = 250;
	export let height = 250;

	// サンプル分子データ（何も指定されない場合）
	const defaultMolecules = [
		{ smiles: 'CC(=O)Oc1ccccc1C(=O)O', title: 'アスピリン' },
		{ smiles: 'c1ccccc1', title: 'ベンゼン' },
		{ smiles: 'CCO', title: 'エタノール' },
		{ smiles: 'CC(C)Cc1ccc(cc1)C(C)C(O)=O', title: 'イブプロフェン' }
	];

	const molsToDisplay = molecules.length > 0 ? molecules : defaultMolecules;
</script>

<div class="molecule-gallery">
	{#each molsToDisplay as mol (mol.title)}
		<ChemicalStructure
			smiles={mol.smiles}
			title={mol.title}
			{width}
			{height}
		/>
	{/each}
</div>

<style>
	.molecule-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		margin: 2rem 0;
	}
</style>
