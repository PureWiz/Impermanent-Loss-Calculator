const tokenASelect = document.getElementById("tokenA");
const tokenBSelect = document.getElementById("tokenB");
const priceAField = document.getElementById("priceA");
const priceBField = document.getElementById("priceB");
const aprSlider = document.getElementById("apr");
const aprLabel = document.getElementById("aprLabel");

let topCoins = [];

// Load top 100 coins from CoinGecko
fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1")
  .then(res => res.json())
  .then(data => {
    topCoins = data;
    populateDropdown(tokenASelect, topCoins);
    populateDropdown(tokenBSelect, topCoins);
  });

function populateDropdown(select, coins) {
  coins.forEach(coin => {
    const option = document.createElement("option");
    option.value = coin.id;
    option.textContent = `${coin.symbol.toUpperCase()} (${coin.name})`;
    select.appendChild(option);
  });
}

tokenASelect.onchange = () => updatePrice(tokenASelect.value, priceAField);
tokenBSelect.onchange = () => updatePrice(tokenBSelect.value, priceBField);
aprSlider.oninput = () => aprLabel.textContent = `${aprSlider.value}%`;

function updatePrice(id, field) {
  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
    .then(res => res.json())
    .then(data => {
      const newPrice = data[id]?.usd?.toFixed(2);
      if (newPrice) {
        field.textContent = newPrice;
        field.parentElement.style.opacity = 0.3;
        setTimeout(() => field.parentElement.style.opacity = 1, 250);
      }
    });
}

function calculate() {
  const priceA = parseFloat(priceAField.textContent);
  const priceB = parseFloat(priceBField.textContent);
  const amountA = parseFloat(document.getElementById("amountA").value);
  const amountB = parseFloat(document.getElementById("amountB").value);
  const futureA = parseFloat(document.getElementById("futureA").value);
  const futureB = parseFloat(document.getElementById("futureB").value);
  const apr = parseFloat(aprSlider.value);
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

function drawChart(futureA, futureB, amountA, amountB) {
  const ctx = document.getElementById('chart').getContext('2d');
  const labels = ['-50%', '-25%', '0%', '+25%', '+50%'];
  const ilData = [];

  const priceRatios = [-0.5, -0.25, 0, 0.25, 0.5];

  priceRatios.forEach(change => {
    const adjA = futureA * (1 + change);
    const adjB = futureB * (1 - change);
    const pool = 2 * Math.sqrt(adjA * amountA * adjB * amountB);
    const hodl = adjA * amountA + adjB * amountB;
    const il = ((pool - hodl) / hodl) * 100;
    ilData.push(il.toFixed(2));
  });

  if (window.myChart) {
    window.myChart.destroy();
  }

  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Impermanent Loss (%)',
        data: ilData,
        fill: true,
        backgroundColor: 'rgba(0,255,200,0.2)',
        borderColor: '#00ffc8',
        tension: 0.4,
        pointBackgroundColor: '#ffffff',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#fff'
          }
        },
        tooltip: {
          callbacks: {
            label: context => `IL: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#ccc' },
          grid: { color: '#333' }
        },
        y: {
          ticks: { color: '#ccc' },
          grid: { color: '#333' },
          title: {
            display: true,
            text: 'Loss vs HODL (%)',
            color: '#ccc'
          }
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      }
    }
  });
}
