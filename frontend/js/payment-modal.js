function openPaymentModal(deliveryId, riderId) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'mpesa-modal';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>M-Pesa STK Push Payment</h3>
      <p>Enter M-Pesa phone number to initiate payment:</p>
      <input type="text" id="mpesa-phone" placeholder="e.g. 254712345678" class="form-input" />
      <div class="modal-actions" style="margin-top: 12px;">
        <button onclick="triggerStkPush('${deliveryId}', '${riderId}')" class="btn btn-success">Send STK Push</button>
        <button onclick="closePaymentModal()" class="btn btn-secondary">Cancel</button>
      </div>
      <div id="mpesa-status" style="margin-top: 10px;"></div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closePaymentModal() {
  const modal = document.getElementById('mpesa-modal');
  if (modal) modal.remove();
}

async function triggerStkPush(deliveryId, riderId) {
  const phone = document.getElementById('mpesa-phone').value;
  const statusEl = document.getElementById('mpesa-status');

  if (!phone || phone.trim().length < 10) {
    statusEl.innerHTML = '<span style="color: red; font-weight: bold;">Please enter a valid M-Pesa phone number.</span>';
    return;
  }

  statusEl.innerHTML = 'Sending STK Push to phone...';

  try {
    const res = await fetch('/api/mpesa/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, deliveryId, riderId })
    });

    const data = await res.json();

    if (data.ok) {
      statusEl.innerHTML = '<span style="color: green; font-weight: bold;">STK Push Sent! Check phone for PIN prompt.</span>';
    } else {
      statusEl.innerHTML = `<span style="color: red; font-weight: bold;">${data.message || 'Failed to send STK Push.'}</span>`;
    }
  } catch (error) {
    console.error('STK Push error:', error);
    statusEl.innerHTML = '<span style="color: red; font-weight: bold;">Unable to connect to the payment service.</span>';
  }
}