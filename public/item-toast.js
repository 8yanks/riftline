const params = new URLSearchParams(location.search);
const item = Number(params.get('item')) || 3157;
document.getElementById('title').textContent = params.get('title') || 'Item option';
document.getElementById('detail').textContent = params.get('detail') || 'Compare this option at your next recall.';
const image = document.getElementById('item');
try {
  const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
  image.src = `https://ddragon.leagueoflegends.com/cdn/${versions[0]}/img/item/${item}.png`;
} catch { image.style.display = 'none'; }
