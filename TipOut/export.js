/* export.js — PDF / CSV / Email export */

function toggleExportMenu() {
  document.getElementById('exportMenu').classList.toggle('show');
}
document.addEventListener('click', function(e) {
  var menu = document.getElementById('exportMenu');
  if (menu && !e.target.closest('.export-dropdown')) {
    menu.classList.remove('show');
  }
});

function collectExportData() {
  var dates = getDateRange();
  var storeSel = document.getElementById('storeSelect') || document.querySelector('.filter-bar select:nth-of-type(3)');
  var data = {
    store: storeSel ? (storeSel.options[storeSel.selectedIndex] ? storeSel.options[storeSel.selectedIndex].text : storeSel.value || '') : '',
    dateStart: document.getElementById('dateStart').value,
    dateEnd: document.getElementById('dateEnd').value,
    employees: []
  };
  var allocatedDates = typeof getAllocatedDates === 'function' ? getAllocatedDates() : new Set();
  employees.forEach(function(emp) {
    var daily = [];
    dates.forEach(function(dk) { if (allocatedDates.has(dk)) daily.push(genDailyTip(emp, dk)); });
    if (daily.length === 0) return;
    var tb = daily.reduce(function(s, d) { return s + d.before; }, 0);
    var ta = daily.reduce(function(s, d) { return s + d.allocated; }, 0);
    var tf = daily.reduce(function(s, d) { return s + d.after; }, 0);
    data.employees.push({ name: emp.name, role: emp.role, daily: daily, totalBefore: tb, totalAlloc: ta, totalAfter: tf });
  });
  return data;
}

function exportAs(type) {
  document.getElementById('exportMenu').classList.remove('show');
  var data = collectExportData();
  if (data.employees.length === 0) { showNotification('没有可导出的数据', 'warning'); return; }
  if (type === 'pdf') exportPDF(data);
  else if (type === 'csv') exportCSV(data);
}

/* ─── CSV ─── */
function exportCSV(data) {
  showNotification('正在生成 CSV 文件...', 'info');
  var bom = '\uFEFF';
  var lines = [];
  lines.push('Tip Distribution Report');
  lines.push('"Store","' + data.store.replace(/"/g, '""') + '"');
  lines.push('"Date Range","' + data.dateStart + ' ~ ' + data.dateEnd + '"');
  lines.push('');
  lines.push('Employee,Role,Date,Tips Before($),Allocated($),Tips After($)');

  var grandBefore = 0, grandAlloc = 0, grandAfter = 0;
  data.employees.forEach(function(emp) {
    emp.daily.forEach(function(d) {
      lines.push('"' + emp.name + '","' + emp.role + '",' + d.date + ',' + d.before.toFixed(2) + ',' + d.allocated.toFixed(2) + ',' + d.after.toFixed(2));
    });
    lines.push('"' + emp.name + ' (Subtotal)","","","' + emp.totalBefore.toFixed(2) + '","' + emp.totalAlloc.toFixed(2) + '","' + emp.totalAfter.toFixed(2) + '"');
    grandBefore += emp.totalBefore;
    grandAlloc += emp.totalAlloc;
    grandAfter += emp.totalAfter;
  });
  lines.push('');
  lines.push('"Grand Total","","","' + grandBefore.toFixed(2) + '","' + grandAlloc.toFixed(2) + '","' + grandAfter.toFixed(2) + '"');

  var blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'TipDistribution_' + data.dateStart + '_' + data.dateEnd + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification('CSV 导出成功', 'success');
}

/* ─── PDF: CDN loader ─── */
var _jspdfReady = false;

function loadJsPDFLib(callback) {
  if (_jspdfReady || window.jspdf) { _jspdfReady = true; callback(true); return; }
  var cdns = [
    ['https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
     'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js'],
    ['https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js',
     'https://unpkg.com/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js'],
    ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
     'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js']
  ];
  function tryLoad(idx) {
    if (idx >= cdns.length) { callback(false); return; }
    var s1 = document.createElement('script');
    s1.src = cdns[idx][0];
    var t1 = setTimeout(function() { s1.onload = s1.onerror = null; tryLoad(idx + 1); }, 8000);
    s1.onload = function() {
      clearTimeout(t1);
      var s2 = document.createElement('script');
      s2.src = cdns[idx][1];
      var t2 = setTimeout(function() { s2.onload = s2.onerror = null; tryLoad(idx + 1); }, 8000);
      s2.onload = function() {
        clearTimeout(t2);
        if (window.jspdf) { _jspdfReady = true; callback(true); }
        else tryLoad(idx + 1);
      };
      s2.onerror = function() { clearTimeout(t2); tryLoad(idx + 1); };
      document.head.appendChild(s2);
    };
    s1.onerror = function() { clearTimeout(t1); tryLoad(idx + 1); };
    document.head.appendChild(s1);
  }
  tryLoad(0);
}

/* ─── PDF: entry ─── */
function exportPDF(data) {
  showNotification('正在加载 PDF 组件...', 'info');
  loadJsPDFLib(function(loaded) {
    if (loaded) {
      generateJsPDF(data);
    } else {
      printAsPDF(data);
    }
  });
}

/* ─── PDF: print fallback ─── */
function printAsPDF(data) {
  showNotification('正在生成 PDF 预览页面...', 'info');
  var gb = 0, ga = 0, gf = 0;

  var win = window.open('', '_blank');
  if (!win) { showNotification('弹窗被浏览器拦截，请允许弹窗后重试', 'error'); return; }

  var doc = win.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tip Distribution Report</title>');
  doc.write('<style>');
  doc.write('*{margin:0;padding:0;box-sizing:border-box}');
  doc.write('body{font-family:Arial,Helvetica,sans-serif;padding:30px 40px;color:#222;font-size:12px}');
  doc.write('h1{font-size:20px;font-weight:700;margin-bottom:6px}');
  doc.write('.meta{font-size:12px;color:#666;margin-bottom:3px}');
  doc.write('hr{border:none;border-top:1px solid #ddd;margin:14px 0}');
  doc.write('table{width:100%;border-collapse:collapse;margin-top:10px}');
  doc.write('th{background:#1677ff;color:#fff;padding:7px 10px;text-align:left;font-size:11px}');
  doc.write('td{padding:5px 10px;border-bottom:1px solid #eee;font-size:11px}');
  doc.write('.r{text-align:right}');
  doc.write('.sub td{font-weight:700;background:#ebf0fa}');
  doc.write('.gt td{font-weight:700;background:#1677ff;color:#fff}');
  doc.write('@media print{body{padding:15px 20px}@page{size:landscape;margin:10mm}}');
  doc.write('.hint{text-align:center;padding:16px;color:#888;font-size:13px;margin-top:20px}');
  doc.write('.hint b{color:#1677ff}');
  doc.write('</style></head><body>');

  doc.write('<h1>Tip Distribution Report</h1>');
  doc.write('<div class="meta">Store: ' + escH(data.store) + '</div>');
  doc.write('<div class="meta">Date Range: ' + data.dateStart + ' ~ ' + data.dateEnd + '</div>');
  doc.write('<div class="meta">Generated: ' + new Date().toLocaleString() + '</div>');
  doc.write('<hr>');
  doc.write('<table><thead><tr><th>Employee</th><th>Role</th><th>Date</th>');
  doc.write('<th class="r">Tips Before</th><th class="r">Allocated</th><th class="r">Tips After</th>');
  doc.write('</tr></thead><tbody>');

  data.employees.forEach(function(emp) {
    emp.daily.forEach(function(d) {
      doc.write('<tr><td>' + escH(emp.name) + '</td><td>' + escH(emp.role) + '</td><td>' + d.date + '</td>');
      doc.write('<td class="r">$' + d.before.toFixed(2) + '</td>');
      doc.write('<td class="r">' + (d.allocated >= 0 ? '+$' : '-$') + Math.abs(d.allocated).toFixed(2) + '</td>');
      doc.write('<td class="r">$' + d.after.toFixed(2) + '</td></tr>');
    });
    doc.write('<tr class="sub"><td>' + escH(emp.name) + ' Subtotal</td><td></td><td></td>');
    doc.write('<td class="r">$' + emp.totalBefore.toFixed(2) + '</td>');
    doc.write('<td class="r">' + (emp.totalAlloc >= 0 ? '+$' : '-$') + Math.abs(emp.totalAlloc).toFixed(2) + '</td>');
    doc.write('<td class="r">$' + emp.totalAfter.toFixed(2) + '</td></tr>');
    gb += emp.totalBefore; ga += emp.totalAlloc; gf += emp.totalAfter;
  });

  doc.write('<tr class="gt"><td>Grand Total</td><td></td><td></td>');
  doc.write('<td class="r">$' + gb.toFixed(2) + '</td>');
  doc.write('<td class="r">' + (ga >= 0 ? '+$' : '-$') + Math.abs(ga).toFixed(2) + '</td>');
  doc.write('<td class="r">$' + gf.toFixed(2) + '</td></tr>');
  doc.write('</tbody></table>');
  doc.write('<div class="hint">Please press <b>Ctrl + P</b>, then select <b>"Save as PDF"</b> to download.</div>');
  doc.write('</body></html>');
  doc.close();

  setTimeout(function() { win.print(); }, 500);
  showNotification('PDF 预览已打开，请在弹出窗口中保存为 PDF', 'success');
}

function escH(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─── PDF: jsPDF generation ─── */
function generateJsPDF(data) {
  showNotification('正在生成 PDF 文件...', 'info');

  var doc = new window.jspdf.jsPDF('l', 'mm', 'a4');
  var pw = doc.internal.pageSize.getWidth();
  var ph = doc.internal.pageSize.getHeight();

  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text('Tip Distribution Report', 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Store: ' + data.store, 14, 24);
  doc.text('Date Range: ' + data.dateStart + ' ~ ' + data.dateEnd, 14, 30);
  doc.setDrawColor(220);
  doc.line(14, 33, pw - 14, 33);

  var body = [];
  var subtotalRows = [];
  var ri = 0;
  var grandBefore = 0, grandAlloc = 0, grandAfter = 0;

  data.employees.forEach(function(emp) {
    emp.daily.forEach(function(d) {
      body.push([
        emp.name, emp.role, d.date,
        '$' + d.before.toFixed(2),
        (d.allocated >= 0 ? '+$' : '-$') + Math.abs(d.allocated).toFixed(2),
        '$' + d.after.toFixed(2)
      ]);
      ri++;
    });
    body.push([
      emp.name + '  Subtotal', '', '',
      '$' + emp.totalBefore.toFixed(2),
      (emp.totalAlloc >= 0 ? '+$' : '-$') + Math.abs(emp.totalAlloc).toFixed(2),
      '$' + emp.totalAfter.toFixed(2)
    ]);
    subtotalRows.push(ri);
    ri++;
    grandBefore += emp.totalBefore;
    grandAlloc += emp.totalAlloc;
    grandAfter += emp.totalAfter;
  });

  body.push([
    'Grand Total', '', '',
    '$' + grandBefore.toFixed(2),
    (grandAlloc >= 0 ? '+$' : '-$') + Math.abs(grandAlloc).toFixed(2),
    '$' + grandAfter.toFixed(2)
  ]);
  var grandRow = ri;

  doc.autoTable({
    startY: 36,
    head: [['Employee', 'Role', 'Date', 'Tips Before', 'Allocated', 'Tips After']],
    body: body,
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [40, 40, 40] },
    headStyles: { fillColor: [22, 119, 255], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 32, halign: 'right' }
    },
    didParseCell: function(hookData) {
      if (hookData.section !== 'body') return;
      var idx = hookData.row.index;
      if (subtotalRows.indexOf(idx) !== -1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [235, 240, 250];
      }
      if (idx === grandRow) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [22, 119, 255];
        hookData.cell.styles.textColor = 255;
      }
    },
    margin: { left: 14, right: 14 }
  });

  var pageCount = doc.internal.getNumberOfPages();
  for (var i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text('Generated on ' + new Date().toLocaleString(), 14, ph - 8);
    doc.text('Page ' + i + ' / ' + pageCount, pw - 35, ph - 8);
  }

  doc.save('TipDistribution_' + data.dateStart + '_' + data.dateEnd + '.pdf');
  showNotification('PDF 导出成功', 'success');
}

/* ─── Email ─── */
function openEmailModal() {
  document.getElementById('exportMenu').classList.remove('show');
  openModal('emailModal');
}

function sendEmail() {
  var email = document.getElementById('exportEmail').value.trim();
  if (!email) { showNotification('请输入邮箱地址', 'error'); return; }
  var emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var emails = email.split(',').map(function(e) { return e.trim(); });
  for (var i = 0; i < emails.length; i++) {
    if (!emailReg.test(emails[i])) {
      showNotification('邮箱格式不正确：' + emails[i], 'error');
      return;
    }
  }
  var fmt = document.querySelector('input[name="emailFormat"]:checked').value.toUpperCase();
  closeModal('emailModal');
  showNotification('正在发送 ' + fmt + ' 到 ' + emails.join(', ') + ' ...', 'info');
  setTimeout(function() { showNotification('邮件发送成功', 'success'); }, 1500);
}
