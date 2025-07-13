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
  const daysSelected = parseFloat(document.getElementById("days").value);

  const initialValue = priceA * amountA + priceB * amountB;
  const hodlValue = futureA * amountA + futureB * amountB;
  const poolValue = 2 * Math.sqrt(futureA * amountA * futureB * amountB);
  const dailyRate = apr / 365 / 100;
  const feeGain = initialValue * dailyRate * daysSelected;
  const poolTotal = poolValue + feeGain;
  const netReturn = poolTotal - hodlValue;
  const impermanentLoss = hodlValue - poolValue;

  let breakEvenDay = "No break-even point within selected timeframe";
  for (let d = 1; d <= 365; d++) {
    const gain = initialValue * dailyRate * d;
    if (poolValue + gain >= hodlValue) {
      breakEvenDay = `${d} day${d > 1 ? "s" : ""}`;
      break;
    }
  }

  const verdict = poolTotal > hodlValue ? "🟢 Pool strategy is better" : "🛑 HODL strategy is safer";

  document.getElementById("output").innerHTML = `
    <p><strong>HODL Value:</strong> $${hodlValue.toFixed(2)}</p>
    <p><strong>Pool Value + Fees:</strong> $${poolTotal.toFixed(2)}</p>
    <p><strong>Fee Gains:</strong> $${feeGain.toFixed(2)} over ${daysSelected} days (${apr}% APR)</p>
    <p><strong>Impermanent Loss:</strong> -$${impermanentLoss.toFixed(2)}</p>
    <p><strong>Break-even Point:</strong> ${breakEvenDay}</p>
    <p><strong>Verdict:</strong> <span style="font-weight:bold; color:#00ffc8;">${verdict}</span></p>
  `;

  drawChart(initialValue, poolValue, hodlValue, dailyRate);
}

function drawChart(initialValue, poolValue, hodlValue, dailyRate) {
  const ctx = document.getElementById('chart').getContext('2d');
  const labels = [];
  const netReturns = [];
  let breakevenIndex = -1;
  let breakevenDayLabel = '';

  for (let day = 0; day <= 365; day += 15) {
    labels.push(`${day}`);
    const gain = initialValue * dailyRate * day;
    const totalPool = poolValue + gain;
    const diff = ((totalPool - hodlValue) / hodlValue) * 100;
    netReturns.push(diff.toFixed(2));

    if (breakevenIndex === -1 && totalPool >= hodlValue) {
      breakevenIndex = labels.length - 1;
      breakevenDayLabel = day;
    }
  }

  if (window.myChart) {
    window.myChart.destroy();
  }

  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Net Return vs HODL (%)',
        data: netReturns,
        fill: true,
        backgroundColor: function(context) {
          const value = context.chart.data.datasets[0].data[context.dataIndex];
          return value >= 0 ? 'rgba(0,255,150,0.2)' : 'rgba(255,0,0,0.2)';
        },
        borderColor: '#00ffc8',
        tension: 0.4,
        pointBackgroundColor: function(context) {
          return context.dataIndex === breakevenIndex ? '#ff0' : '#fff';
        },
        pointRadius: function(context) {
          return context.dataIndex === breakevenIndex ? 7 : 4;
        }
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#fff' }
        },
        tooltip: {
          callbacks: {
            label: context => `Net Difference: ${context.parsed.y}%`
          }
        },
        annotation: breakevenIndex >= 0 ? {
          annotations: {
            line1: {
              type: 'line',
              scaleID: 'x',
              value: breakevenDayLabel.toString(),
              borderColor: '#00ffc8',
              borderWidth: 2,
              label: {
                content: `Break-even at ${breakevenDayLabel} days`,
                enabled: true,
                position: 'start',
                backgroundColor: '#00ffc8',
                color: '#000'
              }
            }
          }
        } : {}
      },
      scales: {
        x: {
          title: { display: true, text: 'Days', color: '#ccc' },
          ticks: { color: '#ccc' },
          grid: { color: '#333' }
        },
        y: {
          title: { display: true, text: 'Net Return (%)', color: '#ccc' },
          ticks: { color: '#ccc' },
          grid: { color: '#333' }
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      }
    }
  });
}
