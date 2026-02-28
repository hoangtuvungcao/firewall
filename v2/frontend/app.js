/**
 * NRO Shield v2 Dashboard Logic
 */

// Chart Initialization
let trafficChart, systemChart;
const trafficData = {
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
};
const systemData = {
    labels: Array(20).fill(''),
    datasets: [
        { label: 'CPU %', data: Array(20).fill(0), borderColor: '#f43f5e', tension: 0.4, fill: true, backgroundColor: 'rgba(244, 63, 94, 0.1)', pointRadius: 0 },
        { label: 'RAM %', data: Array(20).fill(0), borderColor: '#22c55e', tension: 0.4, fill: true, backgroundColor: 'rgba(34, 197, 94, 0.1)', pointRadius: 0 }
    ]
};

const ctx = document.getElementById('trafficChart').getContext('2d');
trafficChart = new Chart(ctx, {
    type: 'line',
    data: trafficData,
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

const systemCtx = document.getElementById('systemChart').getContext('2d');
systemChart = new Chart(systemCtx, {
    type: 'line',
    data: systemData,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#94a3b8' } } },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, beginAtZero: true, max: 100 },
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
    } else if (data.type === 'GEOFENCE_STATUS') {
        updateGeofenceUI(data.data);
    } else if (data.type === 'SYSTEM_STATS') {
        updateSystemUI(data.data);
    } else if (data.type === 'SAMP_STATUS') {
        updateSAMPUI(data.data);
    } else if (data.type === 'NEW_ATTACK_LOG') {
        updateAttackLogs(data.data);
    } else if (data.type === 'RECENT_ATTACKS') {
        const tbody = document.getElementById('attack-body');
        tbody.innerHTML = '';
        data.data.forEach(log => updateAttackLogs(log));
    }
};

function updateSAMPUI(data) {
    const badge = document.getElementById('samp-badge');
    badge.innerText = data.online ? 'ONLINE' : 'OFFLINE';
    badge.className = `badge ${data.online ? 'online' : 'offline'}`;

    if (data.online) {
        document.getElementById('samp-hostname').innerText = data.hostname;
        document.getElementById('samp-players').innerText = `${data.players} / ${data.maxplayers}`;
        document.getElementById('samp-gamemode').innerText = data.gamemode;
        document.getElementById('samp-map').innerText = data.map;
    } else {
        document.getElementById('samp-hostname').innerText = 'N/A';
        document.getElementById('samp-players').innerText = 'N/A';
        document.getElementById('samp-gamemode').innerText = 'N/A';
        document.getElementById('samp-map').innerText = 'N/A';
    }
}

function updateSystemUI(data) {
    document.getElementById('cpu-value').innerText = data.cpu + '%';
    document.getElementById('ram-value').innerText = data.mem + '%';

    // Convert bits to Mbps
    const mbps = (data.netIn / 1000000).toFixed(2);
    // Nếu có div net-value thì update
    if (document.getElementById('net-value')) {
        document.getElementById('net-value').innerText = mbps + ' Mbps';
    }

    const now = new Date().toLocaleTimeString();
    systemData.labels.push(now);
    systemData.datasets[0].data.push(data.cpu);
    systemData.datasets[1].data.push(data.mem);

    if (systemData.labels.length > 20) {
        systemData.labels.shift();
        systemData.datasets[0].data.shift();
        systemData.datasets[1].data.shift();
    }
    systemChart.update('none');
}

function updateAttackLogs(data) {
    const tbody = document.getElementById('attack-body');
    // Remove empty message if exists
    if (tbody.innerText.includes('No recent attacks')) tbody.innerHTML = '';

    const tr = document.createElement('tr');
    tr.className = 'animate-fade';
    tr.innerHTML = `
        <td>${new Date().toLocaleTimeString()}</td>
        <td>${data.ip}</td>
        <td>${data.type}</td>
        <td>${data.pps}</td>
        <td><span class="severity-${data.severity.toLowerCase()}">${data.severity}</span></td>
        <td>${data.action || 'BLOCKED'}</td>
    `;

    tbody.prepend(tr);
    if (tbody.children.length > 50) tbody.lastElementChild.remove();
}

function refreshLogs() {
    socket.send(JSON.stringify({ type: 'GET_RECENT_ATTACKS' }));
}

function serverAction(action) {
    socket.send(JSON.stringify({ type: 'SERVER_ACTION', action }));
}

function manageIP(action) {
    const ip = document.getElementById('unlock-ip').value;
    if (!ip) return alert('Vui lòng nhập IP!');
    socket.send(JSON.stringify({ type: 'MANAGE_IP', action, ip }));
}

function saveSettings() {
    const data = {
        pps: document.getElementById('config-pps').value,
        query: document.getElementById('config-query').value,
        block: document.getElementById('config-block').value
    };
    socket.send(JSON.stringify({ type: 'UPDATE_CONFIG', data }));
    alert('Đang áp dụng cấu hình mới...');
}

function updateGeofenceUI(data) {
    const statusCircle = document.querySelector('.status-circle');
    const statusText = document.querySelector('#geofence-status strong');
    const timerText = document.querySelector('#geofence-timer strong');

    statusText.innerText = data.status;

    if (data.status === 'VN_ONLY') {
        statusCircle.className = 'status-circle blocked';
        const remaining = Math.max(0, 300 - Math.floor((Date.now() - data.lastDdos) / 1000));
        timerText.innerText = `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
    } else {
        statusCircle.className = 'status-circle';
        timerText.innerText = 'Stable';
    }

    // Update Buttons
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(data.mode));
    });
}

function setGeofence(mode) {
    socket.send(JSON.stringify({ type: 'SET_GEOFENCE_MODE', mode }));
}

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
