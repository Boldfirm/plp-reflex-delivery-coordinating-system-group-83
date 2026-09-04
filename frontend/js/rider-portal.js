async function renderRiderPortal(user) {
  const container = document.getElementById('portal-view');
  if (!container) return;
  container.innerHTML = `
    <div class="portal-header">
      <h2>Rider Dashboard — ${user.name}</h2>
      <div id="rider-earnings" class="earnings-badge">Total Earnings: Loading...</div>
    </div>
    <div id="open-jobs" class="jobs-list">Loading jobs...</div>
  `;
  loadRiderEarnings(user.id);
}

async function loadRiderEarnings(riderId) {
  try {
    const res = await fetch(`/api/earnings/${riderId}`);
    const data = await res.json();
    const el = document.getElementById('rider-earnings');
    if (el) el.innerText = `Total Earnings: KES ${data.totalEarnings || 0}`;
  } catch (err) {
    console.error('Error fetching rider earnings:', err);
  }
}