/**
 * NRO Shield v2 Dashboard Logic
 */

// Chart Initialization
const ctx = document.getElementById('trafficChart').getContext('2d');
const trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array(20).fill(''),
        datasets: [{
            label: 'Packets Per Second',
            data: Array(20).fill(0),
            borderColor: '#00f2fe',
            backgroundColor: 'rgba(0, 242, 254, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { display: false }, ticks: { display: false } }
        }
    }
});

const protoCtx = document.getElementById('protocolChart').getContext('2d');
const protocolChart = new Chart(protoCtx, {
    type: 'doughnut',
    data: {
        labels: ['UDP Game', 'Queries', 'Others'],
        datasets: [{
            data: [85, 10, 5],
            backgroundColor: ['#00f2fe', '#4facfe', '#1e293b'],
            borderWidth: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
    }
});

// WebSocket Connection
const socket = new WebSocket(`ws://${window.location.hostname}:5050/ws`);

socket.onopen = () => {
    console.log('[V2-WS] Connected to backend');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'TRAFFIC_UPDATE') {
        updateUI(data.metrics);
    }
};

function updateUI(metrics) {
    // Update Stats
    document.getElementById('traffic-value').innerText = `${metrics.bandwidth} Mbps`;
    document.getElementById('conn-value').innerText = metrics.connections;
    document.getElementById('cpu-value').innerText = `${metrics.cpu}%`;

    // Update Chart
    trafficChart.data.datasets[0].data.shift();
    trafficChart.data.datasets[0].data.push(metrics.pps);
    trafficChart.update('none');
}

// Simulated real-time updates for Demo
setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) {
        const mockMetrics = {
            bandwidth: (Math.random() * 50 + 10).toFixed(1),
            connections: Math.floor(Math.random() * 200 + 50),
            cpu: Math.floor(Math.random() * 30 + 5),
            pps: Math.floor(Math.random() * 1000 + 500)
        };
        updateUI(mockMetrics);
    }
}, 2000);
