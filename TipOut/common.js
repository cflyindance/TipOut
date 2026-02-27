/**
 * TipOut - Common Interactive Logic
 */

// Sidebar toggle for mobile
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.mobile-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.mobile-overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

// Modal controls
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Drawer controls
function openDrawer(id) {
  const overlay = document.getElementById(id + '-overlay');
  const drawer = document.getElementById(id);
  if (overlay) overlay.classList.add('show');
  if (drawer) drawer.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeDrawer(id) {
  const overlay = document.getElementById(id + '-overlay');
  const drawer = document.getElementById(id);
  if (overlay) overlay.classList.remove('show');
  if (drawer) drawer.classList.remove('show');
  document.body.style.overflow = '';
}

// Confirm dialog
function confirmAction(message, callback) {
  if (confirm(message)) {
    callback();
  }
}

// Notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  notification.style.cssText = `
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    padding: 10px 24px; border-radius: 8px; z-index: 9999;
    display: flex; align-items: center; gap: 8px; font-size: 14px;
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    animation: slideDown 0.3s ease;
    background: ${type === 'success' ? '#f6ffed' : type === 'error' ? '#fff2f0' : '#e6f4ff'};
    border: 1px solid ${type === 'success' ? '#b7eb8f' : type === 'error' ? '#ffccc7' : '#91caff'};
    color: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#1677ff'};
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add delete row functionality for tables
function deleteTableRow(btn) {
  confirmAction('确定要删除该行吗？', () => {
    const row = btn.closest('tr');
    if (row) {
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.3s';
      setTimeout(() => row.remove(), 300);
      showNotification('删除成功');
    }
  });
}

// Add row to table
function addTableRow(tableId, template) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (tbody && template) {
    const newRow = document.createElement('tr');
    newRow.innerHTML = template;
    tbody.appendChild(newRow);
    showNotification('新增成功');
  }
}

// Chip selection toggle
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('chip')) {
    const group = e.target.closest('.chip-group');
    if (group && !group.dataset.multi) {
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    }
    e.target.classList.toggle('selected');
  }
});

// Close modal/drawer on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
    document.body.style.overflow = '';
  }
  if (e.target.classList.contains('drawer-overlay')) {
    const drawerId = e.target.id.replace('-overlay', '');
    closeDrawer(drawerId);
  }
  if (e.target.classList.contains('mobile-overlay')) {
    closeSidebar();
  }
});

// CSS animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(style);
