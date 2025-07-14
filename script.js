const tokenASelect = document.getElementById("tokenA");
const tokenBSelect = document.getElementById("tokenB");
const priceAField = document.getElementById("priceA");
const priceBField = document.getElementById("priceB");
const aprSlider = document.getElementById("apr");
const aprLabel = document.getElementById("aprLabel");
const customRangeToggle = document.getElementById("customRangeToggle");
const customRangeInputs = document.getElementById("customRangeInputs");
const rangeMinInput = document.getElementById("rangeMin");
const rangeMaxInput = document.getElementById("rangeMax");

let topCoins = [];

customRangeToggle.onchange = () => {
  customRangeInputs.style.display = customRangeToggle.checked ? "block" : "none";
};

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
aprSlider.oninput = () => {
  aprLabel.textContent = `${aprSlider.value}%`;
};

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
  const useCustomRange = customRangeToggle.checked;
  const rangeMin = parseFloat(rangeMinInput.value);
  const rangeMax = parseFloat(rangeMaxInput.value);

  const initialValue = priceA * amountA + priceB * amountB;
  const hodlValue = futureA * amountA + futureB * amountB;
  const dailyRate = apr / 365 / 100;
  let inRangeDays = daysSelected; // ✅ Always exists!


  let rangeNote = "";
  let adjustedAmountA = amountA;
  let adjustedAmountB = amountB;
  let feeGain = 0;

  if (useCustomRange) {
  inRangeDays = 0;
  for (let day = 1; day <= daysSelected; day++) {
    const simulatedPrice = priceA + (day / daysSelected) * (futureA - priceA);
    if (simulatedPrice >= rangeMin && simulatedPrice <= rangeMax) {
      inRangeDays++;
    }
  }


    feeGain = initialValue * dailyRate * inRangeDays;

    if (futureA < rangeMin) {
      adjustedAmountB = 0;
      rangeNote = `Price ended below range → LP converted to ETH. Fees collected for ${inRangeDays} day${inRangeDays !== 1 ? "s" : ""}`;
    } else if (futureA > rangeMax) {
      adjustedAmountA = 0;
      rangeNote = `Price ended above range → LP converted to USDC. Fees collected for ${inRangeDays} day${inRangeDays !== 1 ? "s" : ""}`;
    } else {
      rangeNote = `Price ended in range → LP stayed active. Fees collected for ${inRangeDays} day${inRangeDays !== 1 ? "s" : ""}`;
    }

    drawRangeChart(rangeMin, rangeMax, priceA, futureA);
  } else {
  feeGain = initialValue * dailyRate * daysSelected;
  inRangeDays = daysSelected;
  rangeNote = `Full range pool → LP active for all ${daysSelected} days.`;
  document.getElementById("rangeChart").style.display = "none";
}

  const poolValue = 2 * Math.sqrt(futureA * adjustedAmountA * futureB * adjustedAmountB);
  const poolTotal = poolValue + feeGain;
  const impermanentLoss = hodlValue - poolValue;

  let breakEvenDay = "No break-even within 1 year";
  for (let d = 1; d <= 365; d++) {
    const gain = initialValue * dailyRate * d;
    const total = poolValue + (useCustomRange ? initialValue * dailyRate * Math.min(d, inRangeDays) : gain);
    if (total >= hodlValue) {
      breakEvenDay = `${d} day${d > 1 ? "s" : ""}`;
      break;
    }
  }

  const verdict = poolTotal > hodlValue ? "🟢 Pool strategy is better" : "🛑 HODL strategy is safer";

  document.getElementById("output").innerHTML = `
    <p><strong>HODL Value:</strong> $${hodlValue.toFixed(2)}</p>
    <p><strong>Pool Value + Fees:</strong> $${poolTotal.toFixed(2)}</p>
    <p><strong>Fee Gains:</strong> $${feeGain.toFixed(2)}</p>
    <p><strong>Impermanent Loss:</strong> -$${impermanentLoss.toFixed(2)}</p>
    <p><strong>Break-even Point:</strong> ${breakEvenDay}</p>
    <p><strong>Verdict:</strong> <span style="font-weight:bold; color:#00ffc8;">${verdict}</span></p>
    <p><em>${rangeNote}</em></p>
  `;

  drawChart(initialValue, poolValue, hodlValue, dailyRate, useCustomRange ? inRangeDays : daysSelected);
}

function drawChart(initialValue, poolValue, hodlValue, dailyRate, effectiveDays) {
  const ctx = document.getElementById('chart').getContext('2d');
  const labels = [];
  const netReturns = [];
  let breakevenIndex = -1;
  let breakevenDayLabel = '';

  for (let day = 0; day <= 365; day += 15) {
    labels.push(`${day}`);
    const gain = initialValue * dailyRate * Math.min(day, effectiveDays);
    const totalPool = poolValue + gain;
    const diff = ((totalPool - hodlValue) / hodlValue) * 100;
    netReturns.push(diff.toFixed(2));

    if (breakevenIndex === -1 && totalPool >= hodlValue) {
      breakevenIndex = labels.length - 1;
      breakevenDayLabel = day;
    }
  }

  if (window.myChart) window.myChart.destroy();

  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Net Return vs HODL (%)',
        data: netReturns,
        fill: true,
        backgroundColor: context =>
          parseFloat(context.chart.data.datasets[0].data[context.dataIndex]) >= 0
            ? 'rgba(0,255,150,0.2)'
            : 'rgba(255,0,0,0.2)',
        borderColor: '#00ffc8',
        tension: 0.4,
        pointBackgroundColor: ctx =>
          ctx.dataIndex === breakevenIndex ? '#ff0' : '#fff',
        pointRadius: ctx =>
          ctx.dataIndex === breakevenIndex ? 7 : 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        tooltip: {
          callbacks: {
            label: ctx => `Net: ${ctx.parsed.y}%`
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
                content: `Break-even at ${breakevenDayLabel}d`,
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
          title: {
            display: true,
            text: 'Net Return (%)',
            color: '#ccc'
          },
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
} // ← End of drawChart()

function drawRangeChart(min, max, current, future) {
  const ctx = document.getElementById("rangeChart").getContext("2d");
  if (window.rangeVisChart) window.rangeVisChart.destroy();
  window.rangeVisChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Min', 'Current', 'Max', 'Future'],
      datasets: [{
        label: 'Price Position',
        data: [min, current, max, future],
        backgroundColor: ['#888', '#00ffc8', '#888', '#ffaa00']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#ccc' },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#ccc' },
          grid: { color: '#333' }
        }
      }
    }
  });
}
