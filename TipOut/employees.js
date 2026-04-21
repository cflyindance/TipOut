/**
 * TipOut 员工管理 — 主数据字段对齐小费分配（TipOut）与报税报表（Payroll）
 */
(function () {
  "use strict";

  const STORAGE_KEY = "tipout-employees-roster-v1";
  const DEFAULT_STORE_NAME = "Golden Dragon Chinese Kitchen - Dallas, TX 75231";
  const EXTRA_STORES = [
    "Lone Star BBQ House - Austin, TX 78701",
    "Pacific Bowl & Grill - San Diego, CA 92101",
  ];
  let storeFilter = "";

  /** @type {typeof DEFAULT_ROSTER} */
  const DEFAULT_ROSTER = [
    {
      id: "roster-seed-1",
      name: "小飞鸽",
      store: "Golden Dragon Chinese Kitchen - Dallas, TX 75231",
      role: "Floor",
      tipType: "deduct",
      baseTip: 160,
      tipRate: 0.15,
      department: "Floor",
      adpFile: "924",
      rate: 48.07,
      otRate: 72.11,
      ot2Rate: 96.14,
    },
    {
      id: "roster-seed-2",
      name: "Maria Garcia",
      store: "Golden Dragon Chinese Kitchen - Dallas, TX 75231",
      role: "Server",
      tipType: "deduct",
      baseTip: 185,
      tipRate: 0.15,
      department: "Floor",
      adpFile: "101",
      rate: 15.5,
      otRate: 23.25,
      ot2Rate: 31,
    },
    {
      id: "roster-seed-3",
      name: "Jason Chen",
      store: "Sakura Sushi & Ramen House - Dallas, TX 75247",
      role: "Server",
      tipType: "deduct",
      baseTip: 168,
      tipRate: 0.15,
      department: "Floor",
      adpFile: "102",
      rate: 16.2,
      otRate: 24.3,
      ot2Rate: 32.4,
    },
    {
      id: "roster-seed-4",
      name: "Emily Watson",
      store: "Sakura Sushi & Ramen House - Dallas, TX 75247",
      role: "Server",
      tipType: "deduct",
      baseTip: 155,
      tipRate: 0.15,
      department: "Floor",
      adpFile: "103",
      rate: 15.8,
      otRate: 23.7,
      ot2Rate: 31.6,
    },
    {
      id: "roster-seed-5",
      name: "Mike Johnson",
      store: "Golden Dragon Chinese Kitchen - Dallas, TX 75231",
      role: "Bartender",
      tipType: "deduct",
      baseTip: 156,
      tipRate: 0.15,
      department: "Bar",
      adpFile: "104",
      rate: 18.5,
      otRate: 27.75,
      ot2Rate: 37,
    },
    {
      id: "roster-seed-6",
      name: "Tom Wilson",
      store: "Sakura Sushi & Ramen House - Dallas, TX 75247",
      role: "Kitchen",
      tipType: "receive",
      baseTip: 0,
      tipRate: 0,
      department: "Kitchen",
      adpFile: "105",
      rate: 22.5,
      otRate: 33.75,
      ot2Rate: 45,
    },
    {
      id: "roster-seed-7",
      name: "Carlos Lopez",
      store: "Lone Star BBQ House - Austin, TX 78701",
      role: "Busser",
      tipType: "receive",
      baseTip: 0,
      tipRate: 0,
      department: "Floor",
      adpFile: "106",
      rate: 14.2,
      otRate: 21.3,
      ot2Rate: 28.4,
    },
    {
      id: "roster-seed-8",
      name: "Linda Nguyen",
      store: "Lone Star BBQ House - Austin, TX 78701",
      role: "Cashier",
      tipType: "deduct",
      baseTip: 45,
      tipRate: 0.15,
      department: "Front",
      adpFile: "107",
      rate: 17.1,
      otRate: 25.65,
      ot2Rate: 34.2,
    },
    {
      id: "roster-seed-9",
      name: "Daniel Ortiz",
      store: "Pacific Bowl & Grill - San Diego, CA 92101",
      role: "Runner",
      tipType: "receive",
      baseTip: 0,
      tipRate: 0,
      department: "Floor",
      adpFile: "108",
      rate: 15.1,
      otRate: 22.65,
      ot2Rate: 30.2,
    },
    {
      id: "roster-seed-10",
      name: "Rachel Scott",
      store: "Pacific Bowl & Grill - San Diego, CA 92101",
      role: "Host",
      tipType: "receive",
      baseTip: 0,
      tipRate: 0,
      department: "Front",
      adpFile: "109",
      rate: 16.4,
      otRate: 24.6,
      ot2Rate: 32.8,
    },
  ];

  function $(sel) {
    return document.querySelector(sel);
  }

  function getTipOutStores() {
    const rules = window.ruleData && typeof ruleData.getRules === "function" ? ruleData.getRules() : [];
    const seen = {};
    const stores = [];
    rules.forEach((r) => {
      const s = String((r && r.store) || "").trim();
      if (s && !seen[s]) {
        seen[s] = 1;
        stores.push(s);
      }
    });
    EXTRA_STORES.forEach((s) => {
      if (s && !seen[s]) {
        seen[s] = 1;
        stores.push(s);
      }
    });
    if (!seen[DEFAULT_STORE_NAME]) stores.unshift(DEFAULT_STORE_NAME);
    return stores;
  }

  function loadRoster() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_ROSTER);
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) && parsed.length ? parsed : structuredClone(DEFAULT_ROSTER);
      let changed = false;
      const idSet = new Set(list.map((e) => String((e && e.id) || "")));
      DEFAULT_ROSTER.forEach((seed) => {
        if (!idSet.has(seed.id)) {
          list.push(structuredClone(seed));
          changed = true;
        }
      });
      list.forEach((e) => {
        if (!e.store || String(e.store).trim() === "") {
          e.store = DEFAULT_STORE_NAME;
          changed = true;
        }
      });
      if (changed) saveRoster(list);
      return list;
    } catch {
      return structuredClone(DEFAULT_ROSTER);
    }
  }

  function saveRoster(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function tipTypeLabel(t) {
    return t === "receive" ? "接收" : "扣款";
  }

  function renderStoreFilter(list) {
    const select = $("#employee-store-filter");
    if (!select) return;
    const stores = getTipOutStores();
    select.innerHTML = ['<option value="">全部门店</option>']
      .concat(stores.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`))
      .join("");
    if (storeFilter && stores.includes(storeFilter)) {
      select.value = storeFilter;
    } else {
      storeFilter = "";
      select.value = "";
    }
  }

  function renderTable() {
    const tbody = $("#employeesTableBody");
    if (!tbody) return;
    const list = loadRoster();
    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="12" style="padding:48px;text-align:center;color:var(--text-tertiary)">暂无员工，请点击「新增员工」添加</td></tr>';
      return;
    }
    renderStoreFilter(list);
    const filtered = storeFilter ? list.filter((e) => String(e.store || "").trim() === storeFilter) : list;
    if (filtered.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="12" style="padding:48px;text-align:center;color:var(--text-tertiary)">该门店暂无员工数据。</td></tr>';
      return;
    }
    tbody.innerHTML = filtered
      .map((e) => {
        const adp = e.adpFile != null && String(e.adpFile).trim() !== "" ? escapeHtml(String(e.adpFile)) : "—";
        return `<tr data-id="${escapeHtml(e.id)}">
          <td><strong>${escapeHtml(e.name)}</strong></td>
          <td>${escapeHtml(e.store || DEFAULT_STORE_NAME)}</td>
          <td>${escapeHtml(e.role || "—")}</td>
          <td>${tipTypeLabel(e.tipType)}</td>
          <td style="text-align:right">${fmtNum(e.baseTip)}</td>
          <td style="text-align:right">${fmtPct(e.tipRate)}</td>
          <td>${escapeHtml(e.department || "—")}</td>
          <td style="font-family:ui-monospace,Menlo,monospace">${adp}</td>
          <td style="text-align:right">${fmtMoney(e.rate)}</td>
          <td style="text-align:right">${fmtMoney(e.otRate)}</td>
          <td style="text-align:right">${fmtMoney(e.ot2Rate)}</td>
          <td class="action-links" style="text-align:right;white-space:nowrap">
            <a href="javascript:void(0)" data-act="del">删除</a>
          </td>
        </tr>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtNum(n) {
    const x = Number(n);
    if (Number.isNaN(x)) return "—";
    return String(x);
  }

  function fmtPct(n) {
    const x = Number(n);
    if (Number.isNaN(x)) return "—";
    return (x * 100).toFixed(0) + "%";
  }

  function fmtMoney(n) {
    const x = Number(n);
    if (Number.isNaN(x)) return "—";
    return x.toFixed(2);
  }

  function openAddModal() {
    const f = $("#form-add-employee");
    if (f) f.reset();
    const storeSel = $("#field-store");
    if (storeSel) {
      const stores = getTipOutStores();
      storeSel.innerHTML = stores.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
      storeSel.value = storeFilter && stores.includes(storeFilter) ? storeFilter : stores[0] || DEFAULT_STORE_NAME;
    }
    if (typeof openModal === "function") openModal("addEmployeeModal");
  }

  function submitAdd() {
    const name = ($("#field-name") && $("#field-name").value.trim()) || "";
    if (!name) {
      if (typeof showNotification === "function") showNotification("请填写姓名", "error");
      else alert("请填写姓名");
      return;
    }
    const role = ($("#field-role") && $("#field-role").value) || "Server";
    const tipType = ($("#field-tip-type") && $("#field-tip-type").value) || "deduct";
    const baseTip = Number($("#field-base-tip") && $("#field-base-tip").value) || 0;
    const tipRate = Number($("#field-tip-rate") && $("#field-tip-rate").value);
    const tipRateNorm = Number.isFinite(tipRate) ? (tipRate > 1 ? tipRate / 100 : tipRate) : 0.15;
    const store = ($("#field-store") && $("#field-store").value.trim()) || DEFAULT_STORE_NAME;
    const department = ($("#field-dept") && $("#field-dept").value.trim()) || "";
    const adpFile = ($("#field-adp") && $("#field-adp").value.trim()) || "";
    const rate = Number($("#field-rate") && $("#field-rate").value) || 0;
    const otRate = Number($("#field-ot-rate") && $("#field-ot-rate").value) || 0;
    const ot2Rate = Number($("#field-ot2-rate") && $("#field-ot2-rate").value) || 0;

    const list = loadRoster();
    const id = `roster-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    list.push({
      id,
      name,
      store,
      role,
      tipType,
      baseTip,
      tipRate: tipRateNorm,
      department,
      adpFile,
      rate,
      otRate,
      ot2Rate,
    });
    saveRoster(list);
    renderTable();
    if (typeof closeModal === "function") closeModal("addEmployeeModal");
    if (typeof showNotification === "function") showNotification("已添加员工");
    else alert("已添加员工");
  }

  function deleteByRow(tr) {
    const id = tr.getAttribute("data-id");
    if (!id) return;
    const list = loadRoster().filter((e) => e.id !== id);
    saveRoster(list);
    renderTable();
    if (typeof showNotification === "function") showNotification("已删除");
  }

  document.body.addEventListener("click", (e) => {
    const del = e.target.closest("[data-act=del]");
    if (del) {
      e.preventDefault();
      const tr = del.closest("tr");
      if (tr && typeof confirmAction === "function") {
        confirmAction("确定删除该员工？", () => deleteByRow(tr));
      } else if (tr && confirm("确定删除该员工？")) deleteByRow(tr);
    }
  });

  $("#btn-add-employee")?.addEventListener("click", openAddModal);
  $("#btn-submit-employee")?.addEventListener("click", submitAdd);
  $("#employee-store-filter")?.addEventListener("change", (e) => {
    storeFilter = e.target.value || "";
    renderTable();
  });

  renderTable();
})();
