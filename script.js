const tokenASelect = document.getElementById("tokenA");
const tokenBSelect = document.getElementById("tokenB");
const priceAField = document.getElementById("priceA");
const priceBField = document.getElementById("priceB");
const aprSlider = document.getElementById("apr");
const aprLabel = document.getElementById("aprLabel");

// Load top 100 coins from CoinGecko
fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=100&page=1")
  .then(res => res.json())
  .then(data => {
    data.forEach(coin => {
      const optionA = document.createElement("option");
      optionA.value = coin.id;
      optionA.textContent = coin.symbol.toUpperCase();
      tokenASelect.appendChild(optionA);

      const optionB = document.createElement("option");
      optionB.value = coin.id;
      optionB.textContent = coin.symbol.toUpperCase();
      tokenBSelect.appendChild(optionB);
    });
  });

tokenASelect.onchange = () => updatePrice(tokenASelect.value, priceAField);
tokenBSelect.onchange = () => updatePrice(tokenBSelect.value, priceBField);
aprSlider.oninput = () => aprLabel.textContent = aprSlider.value + "%";

function updatePrice(id, field) {
  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
    .then(res => res.json())
    .then(data => {
      field.textContent = data[id].usd.toFixed(2);
    });
}

function calculate() {
  const priceA = parseFloat(priceAField.textContent);
  const priceB = parseFloat(priceBField.textContent);
  const amountA = parseFloat(document.getElementById("amountA").value);
  const amountB = parseFloat(document.getElementById("amountB").value);
  const futureA = parseFloat(document.getElementById("futureA").value);
  const futureB = parseFloat(document.getElementById("futureB").value);
  const apr = parseFloat(document.getElementById("apr").value);
  const days = parseFloat(document.getElementById("days").value);

  const initialValue = priceA * amountA + priceB * amountB;
  const hodlValue = futureA * amountA + futureB * amountB;
  const poolValue = 2 * Math.sqrt(futureA * amountA * futureB * amountB);
  const feeGain = initialValue * (apr / 100) * (days / 365);
  const poolTotal = poolValue + feeGain;
  const impermanentLoss = ((poolTotal - hodlValue) / hodlValue) * 100;

  document.getElementById("output").innerHTML = `
    <p><strong>HODL Value:</strong> $${hodlValue.toFixed(2)}</p>
    <p><strong>Pool Value + Fees:</strong> $${poolTotal.toFixed(2)}</p>
    <p><strong>Fee Gains:</strong> $${feeGain.toFixed(2)} (${apr}%)</p>
    <p><strong>Impermanent Loss (vs HODL):</strong> ${impermanentLoss.toFixed(2)}%</p>
  `;

  drawChart(futureA, futureB, amountA, amountB);
}

function drawChart(fA, fB, amtA, amtB) {
  const ctx = document.getElementById('chart').getContext('2d');
  const labels = [];
  const ilData = [];

  for (let i = -50; i <= 50; i += 5) {
    const ratio = (fA * (1 + i/100)) / (fB * (1 - i/100));
    const il = 2 * Math.sqrt(ratio) / (1 + ratio) - 1;
    labels.push(`${i}%`);
    ilData.push((il * 100).toFixed(2));
  }

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Impermanent Loss (%)',
        data: ilData,
        borderColor: '#00ffc8',
        backgroundColor: 'rgba(0,255,200,0.2)',
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}