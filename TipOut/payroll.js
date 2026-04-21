/**
 * TipOut Payroll — 报税报表演示逻辑（本地静态数据，源自 taxreport 项目）
 */
(function () {
  "use strict";

  const STORAGE_KEY = "tipout-payroll-state-v4";
  const DEFAULT_STORE_NAME = "Golden Dragon Chinese Kitchen - Dallas, TX 75231";
  const EXTRA_PAYROLL_STORES = [
    "Lone Star BBQ House - Austin, TX 78701",
    "Pacific Bowl & Grill - San Diego, CA 92101",
  ];

  function addDays(base, days) {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatMdyDot(d) {
    return `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}.${String(d.getFullYear()).slice(-2)}`;
  }

  function formatRangeDate(d) {
    const w = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()} (${w})`;
  }

  /** Payroll年度预设 26 期（每期14天） */
  function buildPresetPeriods() {
    const start = new Date(2025, 11, 21); // 对齐现有 p2026-08 / p2026-09 / p2026-10
    const statusMap = { 8: "draft", 9: "confirmed", 10: "draft" };
    const periods = [];
    for (let i = 1; i <= 26; i++) {
      const s = addDays(start, (i - 1) * 14);
      const e = addDays(s, 13);
      periods.push({
        id: `p2026-${pad2(i)}`,
        periodNumber: i,
        rangeLabel: `${formatRangeDate(s)} – ${formatRangeDate(e)}`,
        paycheckDate: formatMdyDot(e),
        status: statusMap[i] || "draft",
      });
    }
    return periods;
  }

  const DEFAULT_DATA = {
    coCode: "X0L",
    periods: buildPresetPeriods(),
    employees: {
      "p2026-08": [
        {
          id: "emp-a29",
          name: "小飞鸽",
          store: "Golden Dragon Chinese Kitchen - Dallas, TX 75231",
          adpFile: "924",
          department: "Floor",
          confirmed: false,
          rate: 48.07,
          otRate: 72.11,
          ot2Rate: 96.14,
          segments: [
            {
              date: "04/01/2026",
              slots: [
                { in: "09:00", out: "14:00" },
                { in: "15:00", out: "21:00" },
                { in: "", out: "" },
              ],
              meal: "1:00",
              reg: 8,
              ot: 2,
              ot2: 0,
            },
            {
              date: "04/03/2026",
              slots: [
                { in: "10:00", out: "18:30" },
                { in: "", out: "" },
                { in: "", out: "" },
              ],
              meal: "0:30",
              reg: 8,
              ot: 0,
              ot2: 0,
            },
            {
              date: "04/09/2026",
              slots: [
                { in: "11:00", out: "15:00" },
                { in: "16:00", out: "21:00" },
                { in: "", out: "" },
              ],
              meal: "0:45",
              reg: 8.25,
              ot: 1,
              ot2: 0,
            },
          ],
          adjustments: {
            exempt: "",
            incentive: 0,
            breakfast: 0,
            lunch: 1,
            dinner: 0,
            sickHours: 0,
            svcw: 120.5,
            tips: 85.0,
            childSup: 0,
            medDed: 0,
            eee40: 0,
            eer60: 0,
          },
        },
        {
          id: "emp-b12",
          name: "B12",
          store: "Sakura Sushi & Ramen House - Dallas, TX 75247",
          adpFile: "",
          department: "Kitchen",
          confirmed: false,
          rate: 22.5,
          otRate: 33.75,
          ot2Rate: 45,
          segments: [
            {
              date: "04/02/2026",
              slots: [
                { in: "08:00", out: "16:00" },
                { in: "", out: "" },
                { in: "", out: "" },
              ],
              meal: "0:30",
              reg: 7.5,
              ot: 0,
              ot2: 0,
            },
          ],
          adjustments: {
            exempt: "",
            incentive: 0,
            breakfast: 0,
            lunch: 0,
            dinner: 1,
            sickHours: 0,
            svcw: 0,
            tips: 42.0,
            childSup: 0,
            medDed: 0,
            eee40: 0,
            eer60: 0,
          },
        },
      ],
    },
  };

  function cloneEmployeesTemplate(list) {
    if (typeof structuredClone === "function") return structuredClone(list);
    return JSON.parse(JSON.stringify(list));
  }

  /** 按用户要求：将第2-5期按第8期模板补全 */
  function fillPeriods2To5FromPeriod8(employeesMap) {
    if (!employeesMap || typeof employeesMap !== "object") return;
    const template = Array.isArray(employeesMap["p2026-08"]) ? employeesMap["p2026-08"] : [];
    const targets = ["p2026-02", "p2026-03", "p2026-04", "p2026-05"];
    targets.forEach((pid) => {
      if (!Array.isArray(employeesMap[pid]) || employeesMap[pid].length === 0) {
        employeesMap[pid] = cloneEmployeesTemplate(template);
      }
    });
  }

  fillPeriods2To5FromPeriod8(DEFAULT_DATA.employees);

  let state = {
    data: structuredClone(DEFAULT_DATA),
    view: "periods",
    periodId: null,
    employeeId: null,
    periodYearFilter: String(new Date().getFullYear()),
    periodNumberFilter: "",
    employeeStoreFilter: "",
    activeTab: "manage",
  };

  function emptySlots() {
    return [{ in: "", out: "" }, { in: "", out: "" }, { in: "", out: "" }];
  }

  /** 每日一条：3 行 In/Out + 当日 Meal / Reg / OT / OT2 */
  function normalizeDay(d) {
    const o = {
      date: d && d.date != null ? d.date : "",
      meal: d && d.meal != null ? d.meal : "",
      reg: Number(d && d.reg) || 0,
      ot: Number(d && d.ot) || 0,
      ot2: Number(d && d.ot2) || 0,
      slots: emptySlots(),
    };
    if (d && Array.isArray(d.slots)) {
      for (let i = 0; i < 3; i++) {
        const sl = d.slots[i];
        if (sl && typeof sl === "object") {
          o.slots[i] = {
            in: sl.in != null ? sl.in : "",
            out: sl.out != null ? sl.out : "",
          };
        }
      }
    }
    return o;
  }

  /** 旧版扁平 in1–out4 → 每日 3 条 slot */
  function migrateLegacySegmentToDay(s) {
    if (!s || typeof s !== "object") return normalizeDay({});
    if (Array.isArray(s.slots) && s.slots.length >= 1) {
      return normalizeDay(s);
    }
    const slots = emptySlots();
    slots[0] = { in: s.in1 || "", out: s.out1 || "" };
    slots[1] = { in: s.in2 || "", out: s.out2 || "" };
    slots[2] = {
      in: s.in3 || s.in4 || "",
      out: s.out3 || s.out4 || "",
    };
    return normalizeDay({
      date: s.date || "",
      slots,
      meal: s.meal ?? "",
      reg: s.reg ?? 0,
      ot: s.ot ?? 0,
      ot2: s.ot2 ?? 0,
    });
  }

  /** HH:MM 24h → 当日分钟数，无效返回 null */
  function clockToMinutes(str) {
    if (str == null || String(str).trim() === "") return null;
    const m = String(str)
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  /** 一对 In/Out 的间隔分钟数；支持跨午夜（Out < In） */
  function pairNetMinutes(inStr, outStr) {
    const a = clockToMinutes(inStr);
    const b = clockToMinutes(outStr);
    if (a === null || b === null) return 0;
    let d = b - a;
    if (d < 0) d += 24 * 60;
    return d;
  }

  /** Meal：支持 "1:00"、"0:30"；纯数字按「分钟」计（如 30） */
  function mealMinutes(str) {
    if (str == null || String(str).trim() === "") return 0;
    const s = String(str).trim();
    if (s.includes(":")) {
      const parts = s.split(":");
      const hh = parseFloat(parts[0]) || 0;
      const mm = parseFloat((parts[1] || "").replace(/\D/g, "")) || 0;
      return Math.round(hh * 60 + mm);
    }
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : Math.round(n);
  }

  /** 根据当日 3 组 In/Out 与 Meal 计算 Regular（小时，两位小数） */
  function computeRegularHoursFromDay(day) {
    let work = 0;
    day.slots.forEach((sl) => {
      work += pairNetMinutes(sl.in, sl.out);
    });
    const meal = mealMinutes(day.meal);
    const net = Math.max(0, work - meal);
    return Math.round((net / 60) * 100) / 100;
  }

  function applyAutoRegularHours(emp) {
    if (!emp || !Array.isArray(emp.segments)) return;
    emp.segments.forEach((day) => {
      day.reg = computeRegularHoursFromDay(day);
    });
  }

  function writeSegmentRegInputs(emp) {
    if (!emp || !Array.isArray(emp.segments)) return;
    $all('#segment-rows tr[data-slot="0"]').forEach((row) => {
      const d = parseInt(row.getAttribute("data-day-index"), 10);
      const inp = row.querySelector('.field-seg[data-field="reg"]');
      if (inp && emp.segments[d] != null) {
        inp.value = emp.segments[d].reg;
      }
    });
  }

  const CLOCK_MEAL_FIELDS = new Set(["in", "out", "meal"]);

  const DEFAULT_ADJUSTMENTS = {
    exempt: "",
    incentive: 0,
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    sickHours: 0,
    svcw: 0,
    tips: 0,
    childSup: 0,
    medDed: 0,
    eee40: 0,
    eer60: 0,
  };

  function mergeAdjustments(adj) {
    const a = adj && typeof adj === "object" ? adj : {};
    return { ...DEFAULT_ADJUSTMENTS, ...a };
  }

  function migratePeriods(data) {
    const preset = buildPresetPeriods();
    const old = Array.isArray(data && data.periods) ? data.periods : [];
    const map = new Map(old.map((p) => [p && p.id, p]));
    data.periods = preset.map((p) => {
      const ex = map.get(p.id);
      if (!ex || typeof ex !== "object") return p;
      return {
        ...p,
        ...ex,
        periodNumber: p.periodNumber,
      };
    });
  }

  function migratePayrollData(data) {
    if (!data || !data.employees) return;
    fillPeriods2To5FromPeriod8(data.employees);
    migratePeriods(data);
    const tipOutStores = getTipOutStores();
    const defaultStore = tipOutStores[0] || DEFAULT_STORE_NAME;
    Object.keys(data.employees).forEach((pid) => {
      data.employees[pid].forEach((emp) => {
        if (Array.isArray(emp.segments)) {
          emp.segments = emp.segments.map((seg) => migrateLegacySegmentToDay(seg));
        }
        emp.adjustments = mergeAdjustments(emp.adjustments);
        if (!emp.store || String(emp.store).trim() === "") emp.store = defaultStore;
        if (emp.adjustments.incentive === "" || emp.adjustments.incentive === null) emp.adjustments.incentive = 0;
      });
    });

    // 兼容旧版 localStorage：为示例员工补齐第2周演示数据
    const p = data.employees["p2026-08"];
    if (Array.isArray(p)) {
      const a29 = p.find((e) => e && e.id === "emp-a29");
      if (a29 && a29.name === "A29") a29.name = "小飞鸽";
      if (a29 && Array.isArray(a29.segments)) {
        const hasWeek2 = a29.segments.some((seg) => seg && seg.date === "04/09/2026");
        if (!hasWeek2) {
          a29.segments.push(
            migrateLegacySegmentToDay({
              date: "04/09/2026",
              slots: [
                { in: "11:00", out: "15:00" },
                { in: "16:00", out: "21:00" },
                { in: "", out: "" },
              ],
              meal: "0:45",
              reg: 8.25,
              ot: 1,
              ot2: 0,
            })
          );
        }
      }
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) {
          state.data = parsed.data;
          migratePayrollData(state.data);
        }
        if (parsed && parsed.view) state.view = parsed.view;
        if (parsed && parsed.periodId) state.periodId = parsed.periodId;
        if (parsed && parsed.employeeId) state.employeeId = parsed.employeeId;
        if (parsed && typeof parsed.periodYearFilter === "string") state.periodYearFilter = parsed.periodYearFilter;
        if (parsed && typeof parsed.periodNumberFilter === "string") state.periodNumberFilter = parsed.periodNumberFilter;
        if (parsed && typeof parsed.employeeStoreFilter === "string") state.employeeStoreFilter = parsed.employeeStoreFilter;
        if (parsed && parsed.activeTab) state.activeTab = parsed.activeTab;
      }
    } catch (_) {
      /* ignore */
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data: state.data,
          view: state.view,
          periodId: state.periodId,
          employeeId: state.employeeId,
          periodYearFilter: state.periodYearFilter,
          periodNumberFilter: state.periodNumberFilter,
          employeeStoreFilter: state.employeeStoreFilter,
          activeTab: state.activeTab,
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function getPeriod(id) {
    return state.data.periods.find((p) => p.id === id);
  }

  function getEmployee(periodId, empId) {
    const list = state.data.employees[periodId] || [];
    return list.find((e) => e.id === empId);
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
    EXTRA_PAYROLL_STORES.forEach((s) => {
      if (s && !seen[s]) {
        seen[s] = 1;
        stores.push(s);
      }
    });
    if (!seen[DEFAULT_STORE_NAME]) stores.unshift(DEFAULT_STORE_NAME);
    return stores;
  }

  function sumSegments(emp) {
    return emp.segments.reduce(
      (acc, s) => {
        acc.reg += Number(s.reg) || 0;
        acc.ot += Number(s.ot) || 0;
        acc.ot2 += Number(s.ot2) || 0;
        return acc;
      },
      { reg: 0, ot: 0, ot2: 0 }
    );
  }

  function fmtMoney(n) {
    const x = Number(n);
    if (Number.isNaN(x)) return "—";
    return x.toFixed(2);
  }

  function getPeriodYear(period) {
    if (!period || !period.rangeLabel) return "";
    const m = String(period.rangeLabel).match(/^\s*\d{1,2}\/\d{1,2}\/(\d{4})/);
    if (m && m[1]) return m[1];
    const all = String(period.rangeLabel).match(/\d{4}/g);
    return all && all.length ? all[0] : "";
  }

  function getRecentYears() {
    const current = new Date().getFullYear();
    return [String(current), String(current - 1), String(current - 2)];
  }

  function renderPeriods() {
    const tbody = $("#period-rows");
    const yearSelect = $("#period-year-filter");
    const numberSelect = $("#period-number-filter");
    if (!tbody) return;
    const periods = Array.isArray(state.data.periods) ? state.data.periods : [];
    const years = getRecentYears();
    if (yearSelect) {
      const opts = years.map((y) => `<option value="${escapeHtml(y)}">${escapeHtml(y)}年</option>`).join("");
      yearSelect.innerHTML = opts;
      if (years.includes(state.periodYearFilter)) {
        yearSelect.value = state.periodYearFilter;
      } else {
        state.periodYearFilter = years[0];
        yearSelect.value = years[0];
      }
    }
    const activeYear = state.periodYearFilter;
    const yearFiltered = periods.filter((p) => getPeriodYear(p) === activeYear);
    const periodNumbers = [...new Set(yearFiltered.map((p) => String(p.periodNumber || "")).filter(Boolean))].sort(
      (a, b) => Number(a) - Number(b)
    );
    if (numberSelect) {
      const opts = ['<option value="">全部期数</option>']
        .concat(periodNumbers.map((n) => `<option value="${escapeHtml(n)}">第 ${escapeHtml(n)} 期</option>`))
        .join("");
      numberSelect.innerHTML = opts;
      if (state.periodNumberFilter && periodNumbers.includes(state.periodNumberFilter)) {
        numberSelect.value = state.periodNumberFilter;
      } else {
        state.periodNumberFilter = "";
        numberSelect.value = "";
      }
    }
    const activePeriodNo = state.periodNumberFilter;
    const filtered = activePeriodNo
      ? yearFiltered.filter((p) => String(p.periodNumber || "") === activePeriodNo)
      : yearFiltered;
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:48px;text-align:center;color:var(--text-tertiary)">当前筛选条件下暂无 Payroll 期数据。</td></tr>`;
      saveState();
      return;
    }
    tbody.innerHTML = filtered
      .map((p) => {
        const st =
          p.status === "confirmed"
            ? '<span class="tag tag-blue">已确认</span>'
            : '<span class="tag tag-orange">草稿</span>';
        return `
        <tr>
          <td style="font-family:ui-monospace,Menlo,monospace">${escapeHtml(String(p.periodNumber || "—"))}</td>
          <td>${escapeHtml(p.rangeLabel)}</td>
          <td style="font-family:ui-monospace,Menlo,monospace">${escapeHtml(p.paycheckDate)}</td>
          <td>${st}</td>
          <td style="text-align:right">
            <button type="button" class="btn btn-primary btn-sm" data-action="open-period" data-period-id="${escapeHtml(p.id)}">进入</button>
          </td>
        </tr>`;
      })
      .join("");
    saveState();
  }

  function renderEmployees() {
    const period = getPeriod(state.periodId);
    const tbody = $("#employee-rows");
    const title = $("#employee-period-title");
    const storeSelect = $("#employee-store-filter");
    if (!period || !tbody) return;
    if (title) title.textContent = period.rangeLabel + " · Paycheck " + period.paycheckDate;
    const list = state.data.employees[state.periodId] || [];
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:48px;text-align:center;color:var(--text-tertiary)">本期暂无员工，可在演示数据中于 payroll.js 添加。</td></tr>`;
      return;
    }
    const storesFromTipOut = getTipOutStores();
    const stores = storesFromTipOut.length
      ? storesFromTipOut
      : [...new Set(list.map((e) => (e && e.store ? String(e.store).trim() : "")).filter(Boolean))];
    if (storeSelect) {
      const opts = ['<option value="">全部门店</option>']
        .concat(stores.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`))
        .join("");
      storeSelect.innerHTML = opts;
      if (stores.includes(state.employeeStoreFilter)) {
        storeSelect.value = state.employeeStoreFilter;
      } else {
        state.employeeStoreFilter = "";
        storeSelect.value = "";
      }
    }
    const activeStore = state.employeeStoreFilter;
    const filtered = activeStore ? list.filter((e) => String(e.store || "").trim() === activeStore) : list;
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:48px;text-align:center;color:var(--text-tertiary)">该门店暂无员工数据。</td></tr>`;
      saveState();
      return;
    }
    tbody.innerHTML = filtered
      .map((e) => {
        const sums = sumSegments(e);
        const conf = e.confirmed
          ? '<span style="color:var(--primary);font-size:12px;font-weight:500">已确认</span>'
          : '<span style="color:var(--text-tertiary);font-size:12px">未确认</span>';
        const adpWarn = !e.adpFile
          ? '<span class="text-danger" style="margin-left:4px" title="缺少 ADP File#">⚠</span>'
          : "";
        return `
        <tr>
          <td><strong>${escapeHtml(e.name)}</strong>${adpWarn}</td>
          <td>${escapeHtml(e.store || DEFAULT_STORE_NAME)}</td>
          <td style="color:var(--text-secondary)">${escapeHtml(e.department)}</td>
          <td style="font-family:ui-monospace,Menlo,monospace">${escapeHtml(e.adpFile || "—")}</td>
          <td>${fmtMoney(sums.reg + sums.ot + sums.ot2)} h</td>
          <td>${conf}</td>
          <td style="text-align:right">
            <button type="button" class="btn btn-sm" data-action="open-employee" data-employee-id="${escapeHtml(e.id)}">编辑 Payroll</button>
          </td>
        </tr>`;
      })
      .join("");
    saveState();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slotInOutParts(sl) {
    if (!sl) return ["—", "—"];
    const a = String(sl.in != null ? sl.in : "").trim();
    const b = String(sl.out != null ? sl.out : "").trim();
    return [a || "—", b || "—"];
  }

  function parseMdyDate(dateStr) {
    if (!dateStr) return null;
    const m = String(dateStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const month = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    const d = new Date(year, month, day);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  function createWeekTotals() {
    return { reg: 0, ot: 0, ot1: 0, hours: 0, amount: 0 };
  }

  function getPeriodStartDate(rangeLabel) {
    if (!rangeLabel) return null;
    const m = String(rangeLabel).match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    return m ? parseMdyDate(m[1]) : null;
  }

  function getPeriodDateRange(rangeLabel) {
    if (!rangeLabel) return { start: null, end: null };
    const matches = String(rangeLabel).match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [];
    const start = matches[0] ? parseMdyDate(matches[0]) : null;
    const end = matches[1] ? parseMdyDate(matches[1]) : null;
    return { start, end };
  }

  function addDays(date, days) {
    if (!date) return null;
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatMdyDate(date) {
    if (!date) return "";
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }

  /** 周标题按周期自然周段展示：第1周(start~start+6) 第2周(start+7~end) */
  function getWeekRangeTextFromPeriod(rangeLabel, weekIndex) {
    const { start, end } = getPeriodDateRange(rangeLabel);
    if (!start) return "";
    const weekStart = addDays(start, weekIndex * 7);
    if (!weekStart) return "";
    const rawWeekEnd = addDays(weekStart, 6);
    const weekEnd = end && rawWeekEnd && rawWeekEnd.getTime() > end.getTime() ? end : rawWeekEnd;
    if (!weekEnd) return "";
    return `${formatMdyDate(weekStart)} - ${formatMdyDate(weekEnd)}`;
  }

  function resolveWeekIndex(dayDateStr, periodStartDate, fallbackDayIdx) {
    const d = parseMdyDate(dayDateStr);
    if (d && periodStartDate) {
      const diff = Math.floor((d.getTime() - periodStartDate.getTime()) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff <= 6) return 0;
      return 1;
    }
    return fallbackDayIdx <= 6 ? 0 : 1;
  }

  function buildDayRowsHtml(day) {
    const s = day.slots && day.slots.length ? day.slots : emptySlots();
    const regNum = Number(day.reg) || 0;
    const otNum = Number(day.ot) || 0;
    const ot1Num = Number(day.ot2) || 0;
    const hoursNum = regNum + otNum + ot1Num;
    const meal = escapeHtml(String(day.meal || "").trim() || "—");
    const visibleSlots = s.filter((slot) => {
      if (!slot) return false;
      const cin = String(slot.in != null ? slot.in : "").trim();
      const cout = String(slot.out != null ? slot.out : "").trim();
      return !!(cin || cout);
    });
    const rowsForDay = visibleSlots.length || 1;
    const dateCell = `<td class="payroll-detail-daily-date" rowspan="${rowsForDay}">${escapeHtml(day.date || "—")}</td>`;
    const mealCell = `<td rowspan="${rowsForDay}">${meal}</td>`;
    const regCell = `<td class="payroll-detail-num" rowspan="${rowsForDay}">${fmtMoney(regNum)}</td>`;
    const otCell = `<td class="payroll-detail-num" rowspan="${rowsForDay}">${fmtMoney(otNum)}</td>`;
    const ot1Cell = `<td class="payroll-detail-num" rowspan="${rowsForDay}">${fmtMoney(ot1Num)}</td>`;
    const hoursCell = `<td class="payroll-detail-num" rowspan="${rowsForDay}" style="font-weight:600">${fmtMoney(hoursNum)}</td>`;
    const rows = [];
    for (let i = 0; i < rowsForDay; i++) {
      const [cin, cout] = slotInOutParts(visibleSlots[i]);
      if (i === 0) {
        rows.push(`<tr>
      ${dateCell}
      <td class="payroll-detail-clock">${escapeHtml(cin)}</td>
      <td class="payroll-detail-clock">${escapeHtml(cout)}</td>
      ${mealCell}
      ${regCell}
      ${otCell}
      ${ot1Cell}
      ${hoursCell}
    </tr>`);
      } else {
        rows.push(`<tr>
      <td class="payroll-detail-clock">${escapeHtml(cin)}</td>
      <td class="payroll-detail-clock">${escapeHtml(cout)}</td>
    </tr>`);
      }
    }
    return rows.join("");
  }

  /** Employees Detail：按周分组展示每天数据，并补充每周考勤汇总 */
  function buildEmployeesDetailDailyHtml(emp, period) {
    const segments = Array.isArray(emp.segments) ? emp.segments : [];
    if (segments.length === 0) {
      return `<section class="payroll-detail-daily">
        <h4 class="payroll-detail-daily-title">本期按日考勤明细</h4>
        <p class="payroll-detail-daily-empty">本期暂无按日打卡记录。</p>
      </section>`;
    }

    const periodStartDate = getPeriodStartDate(period && period.rangeLabel);
    const weeks = [
      { index: 0, totals: createWeekTotals(), items: [] },
      { index: 1, totals: createWeekTotals(), items: [] },
    ];

    segments.forEach((raw, dayIdx) => {
      const day = normalizeDay(raw);
      const regNum = Number(day.reg) || 0;
      const otNum = Number(day.ot) || 0;
      const ot1Num = Number(day.ot2) || 0;
      const hoursNum = regNum + otNum + ot1Num;
      const amountNum = regNum * (Number(emp.rate) || 0) + otNum * (Number(emp.otRate) || 0) + ot1Num * (Number(emp.ot2Rate) || 0);
      const weekIdx = resolveWeekIndex(day.date, periodStartDate, dayIdx);
      const wk = weeks[weekIdx];
      wk.items.push({ day, dayIdx });
      wk.totals.reg += regNum;
      wk.totals.ot += otNum;
      wk.totals.ot1 += ot1Num;
      wk.totals.hours += hoursNum;
      wk.totals.amount += amountNum;
    });

    const rateText = `R ${fmtMoney(emp.rate)} / OT ${fmtMoney(emp.otRate)} / OT1 ${fmtMoney(emp.ot2Rate)}`;
    const weekBlocks = weeks
      .filter((wk) => wk.items.length > 0)
      .map((wk) => {
        const body = wk.items.map((it) => buildDayRowsHtml(it.day)).join("");
        const rangeText = getWeekRangeTextFromPeriod(period && period.rangeLabel, wk.index);
        const weekTitle = rangeText ? `第${wk.index + 1}周（${rangeText}）` : `第${wk.index + 1}周`;
        return `<section class="payroll-detail-week-block">
          <h5 class="payroll-detail-week-title">${escapeHtml(weekTitle)}</h5>
          <div class="payroll-detail-daily-wrap">
            <table class="data-table payroll-detail-daily-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Meal</th>
                  <th style="text-align:right">Regular (h)</th>
                  <th style="text-align:right">OT (h)</th>
                  <th style="text-align:right">OT1 (h)</th>
                  <th style="text-align:right">Hours (h)</th>
                </tr>
              </thead>
              <tbody>${body}</tbody>
            </table>
          </div>
          <div class="payroll-detail-week-summary">
            <span>总Hours：<strong>${fmtMoney(wk.totals.hours)}</strong></span>
            <span>总Regular：<strong>${fmtMoney(wk.totals.reg)}</strong></span>
            <span>总OT：<strong>${fmtMoney(wk.totals.ot)}</strong></span>
            <span>总OT1：<strong>${fmtMoney(wk.totals.ot1)}</strong></span>
            <span>Rate：<strong>${escapeHtml(rateText)}</strong></span>
            <span>Amount：<strong>${fmtMoney(wk.totals.amount)}</strong></span>
          </div>
        </section>`;
      })
      .join("");

    return `<section class="payroll-detail-daily">
      <h4 class="payroll-detail-daily-title">本期按日考勤明细（按周）</h4>
      <p class="payroll-detail-daily-hint">按第1周 / 第2周分组展示每日 In/Out 与当日汇总，并在每周末展示该周考勤汇总。</p>
      ${weekBlocks}
    </section>`;
  }

  function renderManageForm() {
    const emp = getEmployee(state.periodId, state.employeeId);
    const period = getPeriod(state.periodId);
    if (!emp || !period) return;

    $("#ws-employee-title").textContent = emp.name;
    $("#ws-breadcrumb-period").textContent =
      period.rangeLabel + " · Paycheck " + period.paycheckDate;
    $("#field-adp-file").value = emp.adpFile;
    $("#field-ot-rate").value = emp.otRate;
    $("#field-ot2-rate").value = emp.ot2Rate;

    emp.segments = emp.segments.map((seg) => migrateLegacySegmentToDay(seg));

    const segBody = $("#segment-rows");
    const rowHtml = [];
    emp.segments.forEach((rawDay, dayIdx) => {
      const day = normalizeDay(rawDay);
      for (let slot = 0; slot < 3; slot++) {
        const sl = day.slots[slot];
        if (slot === 0) {
          rowHtml.push(`<tr data-day-index="${dayIdx}" data-slot="${slot}">
        <td rowspan="3" style="vertical-align:top"><input type="text" class="field-seg form-control" data-field="date" value="${escapeHtml(day.date)}" aria-label="Date" style="font-family:ui-monospace,Menlo,monospace" /></td>
        <td><input type="text" class="field-seg form-control" data-field="in" value="${escapeHtml(sl.in)}" placeholder="In" style="font-family:ui-monospace,Menlo,monospace" /></td>
        <td><input type="text" class="field-seg form-control" data-field="out" value="${escapeHtml(sl.out)}" placeholder="Out" style="font-family:ui-monospace,Menlo,monospace" /></td>
        <td rowspan="3" style="vertical-align:top"><input type="text" class="field-seg form-control" data-field="meal" value="${escapeHtml(day.meal)}" aria-label="Meal" /></td>
        <td rowspan="3" style="vertical-align:top"><input type="number" step="0.01" class="field-seg form-control" data-field="reg" value="${day.reg}" aria-label="Regular" /></td>
        <td rowspan="3" style="vertical-align:top"><input type="number" step="0.01" class="field-seg form-control" data-field="ot" value="${day.ot}" aria-label="OT" /></td>
        <td rowspan="3" style="vertical-align:top"><input type="number" step="0.01" class="field-seg form-control" data-field="ot2" value="${day.ot2}" aria-label="OT2" /></td>
      </tr>`);
        } else {
          rowHtml.push(`<tr data-day-index="${dayIdx}" data-slot="${slot}">
        <td><input type="text" class="field-seg form-control" data-field="in" value="${escapeHtml(sl.in)}" placeholder="In" style="font-family:ui-monospace,Menlo,monospace" /></td>
        <td><input type="text" class="field-seg form-control" data-field="out" value="${escapeHtml(sl.out)}" placeholder="Out" style="font-family:ui-monospace,Menlo,monospace" /></td>
      </tr>`);
        }
      }
    });
    segBody.innerHTML = rowHtml.join("");

    emp.segments = emp.segments.map((d) => normalizeDay(d));
    applyAutoRegularHours(emp);
    writeSegmentRegInputs(emp);

    const adj = mergeAdjustments(emp.adjustments);
    emp.adjustments = adj;
    const ex = $("#adj-exempt");
    if (ex) ex.value = adj.exempt ?? "";
    $("#field-rate").value = emp.rate;
    $("#adj-incentive").value = adj.incentive ?? 0;
    $("#adj-svcw").value = adj.svcw;
    $("#adj-tips").value = adj.tips;
    $("#adj-breakfast").value = adj.breakfast;
    $("#adj-lunch").value = adj.lunch;
    $("#adj-dinner").value = adj.dinner;
    $("#adj-sick").value = adj.sickHours;
    $("#adj-child-sup").value = adj.childSup;
    $("#adj-med-ded").value = adj.medDed;
    $("#adj-eee40").value = adj.eee40;
    $("#adj-eer60").value = adj.eer60;

    syncDerived();
  }

  function readFormIntoState() {
    const emp = getEmployee(state.periodId, state.employeeId);
    if (!emp) return;
    emp.adpFile = $("#field-adp-file").value.trim();
    emp.rate = parseFloat($("#field-rate").value) || 0;
    emp.otRate = parseFloat($("#field-ot-rate").value) || 0;
    emp.ot2Rate = parseFloat($("#field-ot2-rate").value) || 0;

    const dayIdxList = [
      ...new Set(
        $all("#segment-rows tr[data-day-index]").map((r) => parseInt(r.getAttribute("data-day-index"), 10))
      ),
    ]
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    const nextSegments = [];
    dayIdxList.forEach((dIdx) => {
      const dayRows = $all(`#segment-rows tr[data-day-index="${dIdx}"]`).sort(
        (a, b) => parseInt(a.getAttribute("data-slot"), 10) - parseInt(b.getAttribute("data-slot"), 10)
      );
      const day = normalizeDay({});
      day.slots = emptySlots();
      dayRows.forEach((row) => {
        const slot = parseInt(row.getAttribute("data-slot"), 10);
        if (Number.isNaN(slot) || slot < 0 || slot > 2) return;
        const inEl = row.querySelector('.field-seg[data-field="in"]');
        const outEl = row.querySelector('.field-seg[data-field="out"]');
        if (inEl) day.slots[slot].in = inEl.value;
        if (outEl) day.slots[slot].out = outEl.value;
        if (slot === 0) {
          const dateEl = row.querySelector('.field-seg[data-field="date"]');
          const mealEl = row.querySelector('.field-seg[data-field="meal"]');
          const regEl = row.querySelector('.field-seg[data-field="reg"]');
          const otEl = row.querySelector('.field-seg[data-field="ot"]');
          const ot2El = row.querySelector('.field-seg[data-field="ot2"]');
          if (dateEl) day.date = dateEl.value;
          if (mealEl) day.meal = mealEl.value;
          if (regEl) day.reg = parseFloat(regEl.value) || 0;
          if (otEl) day.ot = parseFloat(otEl.value) || 0;
          if (ot2El) day.ot2 = parseFloat(ot2El.value) || 0;
        }
      });
      nextSegments.push(day);
    });
    if (nextSegments.length > 0) emp.segments = nextSegments;

    emp.adjustments = mergeAdjustments(emp.adjustments);
    emp.adjustments.exempt = ($("#adj-exempt") && $("#adj-exempt").value.trim()) || "";
    emp.adjustments.incentive = parseFloat($("#adj-incentive").value) || 0;
    emp.adjustments.svcw = parseFloat($("#adj-svcw").value) || 0;
    emp.adjustments.tips = parseFloat($("#adj-tips").value) || 0;
    emp.adjustments.breakfast = parseFloat($("#adj-breakfast").value) || 0;
    emp.adjustments.lunch = parseFloat($("#adj-lunch").value) || 0;
    emp.adjustments.dinner = parseFloat($("#adj-dinner").value) || 0;
    emp.adjustments.sickHours = parseFloat($("#adj-sick").value) || 0;
    emp.adjustments.childSup = parseFloat($("#adj-child-sup").value) || 0;
    emp.adjustments.medDed = parseFloat($("#adj-med-ded").value) || 0;
    emp.adjustments.eee40 = parseFloat($("#adj-eee40").value) || 0;
    emp.adjustments.eer60 = parseFloat($("#adj-eer60").value) || 0;
  }

  function syncDerived() {
    readFormIntoState();
    const emp = getEmployee(state.periodId, state.employeeId);
    const period = getPeriod(state.periodId);
    if (!emp || !period) return;

    const sums = sumSegments(emp);
    const regAmt = sums.reg * emp.rate;
    const otAmt = sums.ot * emp.otRate;
    const ot2Amt = sums.ot2 * emp.ot2Rate;
    const totalHours = sums.reg + sums.ot + sums.ot2;
    const totalAmt = regAmt + otAmt + ot2Amt;

    $("#sum-reg-h").textContent = fmtMoney(sums.reg);
    $("#sum-ot-h").textContent = fmtMoney(sums.ot);
    $("#sum-ot2-h").textContent = fmtMoney(sums.ot2);
    $("#sum-total-h").textContent = fmtMoney(totalHours);

    $("#sum-reg-amt").textContent = fmtMoney(regAmt);
    $("#sum-ot-amt").textContent = fmtMoney(otAmt);
    $("#sum-ot2-amt").textContent = fmtMoney(ot2Amt);
    $("#sum-total-amt").textContent = fmtMoney(totalAmt);

    $("#detail-range").textContent = period.rangeLabel;
    $("#detail-name").textContent = emp.name;
    $("#detail-svc").textContent = fmtMoney(emp.adjustments.svcw);
    $("#detail-tips").textContent = fmtMoney(emp.adjustments.tips);

    $("#detail-hours-grid").innerHTML = `
      <div class="payroll-detail-period-summary">
        <h4 class="payroll-detail-daily-title">本周期工时汇总</h4>
        <div class="payroll-detail-grid">
        <div class="head">Regular</div>
        <div class="head">OT</div>
        <div class="head">OT2</div>
        <div class="head highlight">合计工时</div>
        <div class="cell">${fmtMoney(sums.reg)}</div>
        <div class="cell">${fmtMoney(sums.ot)}</div>
        <div class="cell">${fmtMoney(sums.ot2)}</div>
        <div class="cell" style="font-weight:600">${fmtMoney(totalHours)}</div>
      </div>
      <div class="payroll-detail-grid" style="margin-top:12px">
        <div style="color:var(--text-tertiary);font-size:12px">金额</div>
        <div style="color:var(--text-tertiary);font-size:12px">金额</div>
        <div style="color:var(--text-tertiary);font-size:12px">金额</div>
        <div style="color:var(--text-tertiary);font-size:12px">合计金额</div>
        <div class="cell">${fmtMoney(regAmt)}</div>
        <div class="cell">${fmtMoney(otAmt)}</div>
        <div class="cell">${fmtMoney(ot2Amt)}</div>
        <div class="cell" style="font-weight:600">${fmtMoney(totalAmt)}</div>
      </div>
      </div>
      ${buildEmployeesDetailDailyHtml(emp, period)}`;

    const draftBadge = $("#detail-draft-badge");
    if (draftBadge) {
      draftBadge.classList.toggle("hidden", emp.confirmed);
    }

    const missingAdpFile = !emp.adpFile;
    const adpRow = $("#adp-preview-row");
    if (adpRow) {
      adpRow.innerHTML = `<tr>
        <td style="font-family:ui-monospace,Menlo,monospace">${escapeHtml(state.data.coCode)}</td>
        <td style="font-family:ui-monospace,Menlo,monospace">${escapeHtml(period.paycheckDate)}</td>
        <td style="font-family:ui-monospace,Menlo,monospace" class="${missingAdpFile ? "text-danger" : ""}">${escapeHtml(emp.adpFile || "—")}</td>
        <td>${escapeHtml(emp.name)}</td>
        <td style="text-align:right;font-family:ui-monospace,Menlo,monospace">${fmtMoney(emp.rate)}</td>
        <td style="text-align:right;font-family:ui-monospace,Menlo,monospace">${fmtMoney(sums.reg)}</td>
        <td style="font-family:ui-monospace,Menlo,monospace;font-size:12px">OHR</td>
        <td style="text-align:right;font-family:ui-monospace,Menlo,monospace">${fmtMoney(sums.ot)}</td>
        <td style="font-family:ui-monospace,Menlo,monospace;font-size:12px">CCT</td>
        <td style="text-align:right;font-family:ui-monospace,Menlo,monospace">${fmtMoney(emp.adjustments.tips)}</td>
        <td style="font-family:ui-monospace,Menlo,monospace;font-size:12px">SVC</td>
        <td style="text-align:right;font-family:ui-monospace,Menlo,monospace">${fmtMoney(emp.adjustments.svcw)}</td>
      </tr>`;
    }

    const exportBtn = $("#btn-export-csv");
    if (exportBtn) exportBtn.disabled = missingAdpFile;
    saveState();
  }

  function showView(name) {
    state.view = name;
    $("#view-periods").hidden = name !== "periods";
    $("#view-employees").hidden = name !== "employees";
    $("#view-workspace").hidden = name !== "workspace";
    const mainTitle = $("#payroll-main-title");
    const workspaceHeading = $("#payroll-workspace-heading");
    const backPeriods = $("#btn-back-periods");
    const backEmployees = $("#btn-back-employees");
    const backWrap = $("#payroll-heading-back");
    if (mainTitle) {
      if (name === "workspace") {
        mainTitle.hidden = true;
      } else {
        mainTitle.hidden = false;
        mainTitle.textContent = name === "periods" ? "Payroll期" : "本期员工";
      }
    }
    if (workspaceHeading) workspaceHeading.hidden = name !== "workspace";
    /* Payroll期：不显示任何返回；本期员工：仅「返回期列表」；员工详情：仅「返回员工列表」 */
    if (backWrap) backWrap.hidden = name === "periods";
    if (backPeriods) backPeriods.hidden = name !== "employees";
    if (backEmployees) backEmployees.hidden = name !== "workspace";
    saveState();
  }

  function setTab(tab) {
    state.activeTab = tab;
    const tabs = { manage: $("#tab-panel-manage"), detail: $("#tab-panel-detail"), adp: $("#tab-panel-adp") };
    Object.keys(tabs).forEach((k) => {
      if (!tabs[k]) return;
      tabs[k].hidden = k !== tab;
    });
    $all("[data-tab]").forEach((btn) => {
      const active = btn.getAttribute("data-tab") === tab;
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.classList.toggle("is-active", active);
    });
    saveState();
  }

  function confirmEmployee() {
    const emp = getEmployee(state.periodId, state.employeeId);
    if (!emp) return;
    readFormIntoState();
    emp.confirmed = true;
    saveState();
    syncDerived();
    if (typeof showNotification === "function") {
      showNotification("已标记为「已确认」。演示版：可继续修改；生产环境可锁定并留痕。", "success");
    } else {
      alert("已标记为「已确认」。演示版：可继续修改；生产环境可锁定并留痕。");
    }
  }

  function exportAdpCsv() {
    readFormIntoState();
    const emp = getEmployee(state.periodId, state.employeeId);
    const period = getPeriod(state.periodId);
    if (!emp || !period || !emp.adpFile) return;

    const sums = sumSegments(emp);
    const header = [
      "CO CODE",
      "BATCH ID",
      "FILE #",
      "Employee Name",
      "Rate",
      "Reg Hours",
      "Hours 3 code",
      "Hours 3 amount",
      "Earnings 3 Code",
      "Earnings 3 Amount",
      "Earnings 3 Code",
      "Earnings 3 Amount",
    ];
    const row = [
      state.data.coCode,
      period.paycheckDate,
      emp.adpFile,
      emp.name,
      String(emp.rate),
      String(sums.reg),
      "OHR",
      String(sums.ot),
      "CCT",
      String(emp.adjustments.tips),
      "SVC",
      String(emp.adjustments.svcw),
    ];
    const esc = (c) => (c.includes(",") || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c);
    const csv = [header.map(esc).join(","), row.map(esc).join(",")].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ADP_PAYROLL_${period.paycheckDate}_${emp.adpFile}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function bind() {
    document.body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const act = btn.getAttribute("data-action");
      if (act === "open-period") {
        state.periodId = btn.getAttribute("data-period-id");
        state.employeeStoreFilter = "";
        renderEmployees();
        showView("employees");
      }
      if (act === "back-periods") {
        showView("periods");
      }
      if (act === "open-employee") {
        state.employeeId = btn.getAttribute("data-employee-id");
        renderManageForm();
        setTab(state.activeTab || "manage");
        showView("workspace");
        syncDerived();
      }
      if (act === "back-employees") {
        renderEmployees();
        showView("employees");
      }
      if (act === "confirm-employee") {
        confirmEmployee();
      }
      if (act === "export-csv") {
        exportAdpCsv();
      }
    });

    document.body.addEventListener("input", (e) => {
      const t = e.target;
      const isSeg = t.classList && t.classList.contains("field-seg");
      const field = t.getAttribute && t.getAttribute("data-field");

      if (isSeg && field && CLOCK_MEAL_FIELDS.has(field)) {
        readFormIntoState();
        const emp = getEmployee(state.periodId, state.employeeId);
        if (emp) {
          applyAutoRegularHours(emp);
          writeSegmentRegInputs(emp);
        }
        syncDerived();
        return;
      }

      if (
        isSeg ||
        t.id === "field-adp-file" ||
        t.id === "field-rate" ||
        t.id === "field-ot-rate" ||
        t.id === "field-ot2-rate" ||
        (t.id && t.id.startsWith("adj-"))
      ) {
        syncDerived();
      }
    });

    $all("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => setTab(btn.getAttribute("data-tab")));
    });

    $("#employee-store-filter")?.addEventListener("change", (e) => {
      state.employeeStoreFilter = e.target.value || "";
      renderEmployees();
    });

    $("#period-year-filter")?.addEventListener("change", (e) => {
      state.periodYearFilter = e.target.value || "";
      state.periodNumberFilter = "";
      renderPeriods();
    });

    $("#period-number-filter")?.addEventListener("change", (e) => {
      state.periodNumberFilter = e.target.value || "";
      renderPeriods();
    });

    $("#btn-print-detail")?.addEventListener("click", () => window.print());
  }

  loadState();
  renderPeriods();
  renderEmployees();
  bind();

  if (state.view === "employees" && state.periodId) {
    showView("employees");
  } else if (state.view === "workspace" && state.periodId && state.employeeId) {
    renderManageForm();
    setTab(state.activeTab || "manage");
    showView("workspace");
    syncDerived();
  } else {
    showView("periods");
  }
})();
