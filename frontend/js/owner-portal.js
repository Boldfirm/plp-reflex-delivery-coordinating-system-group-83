async function renderOwnerPortal(user) {
  const container = document.getElementById('portal-view');
  if (!container) return;
  container.innerHTML = `
    <div class="portal-header">
      <h2>Welcome, ${user.name} (Business Owner)</h2>
      <button class="btn btn-primary" onclick="showNewDeliveryModal()">+ Create Delivery</button>
    </div>
    <div id="deliveries-list" class="deliveries-grid">Loading deliveries...</div>
  `;
  loadOwnerDeliveries(user.id);
}

async function loadOwnerDeliveries(userId) {
  try {
    const res = await fetch(`/api/deliveries?role=retailer&userId=${userId}`);
    const data = await res.json();
    const listEl = document.getElementById('deliveries-list');
    if (!data.length) { listEl.innerHTML = '<p>No deliveries requested yet.</p>'; return; }
    listEl.innerHTML = data.map(d => `
      <div class="delivery-card">
        <h3>${d.item}</h3>
        <p><strong>Customer:</strong> ${d.customerName} (${d.customerPhone})</p>
        <p><strong>Address:</strong> ${d.address}</p>
        <p><strong>Status:</strong> <span class="badge ${d.status}">${d.status}</span></p>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading owner deliveries:', err);
  }
}