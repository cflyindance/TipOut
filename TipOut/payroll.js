/**
 * TipOut Payroll — 报税报表演示逻辑（本地静态数据，源自 taxreport 项目）
 */
(function () {
  "use strict";

  const STORAGE_KEY = "tipout-payroll-state-v4";
  const ROSTER_STORAGE_KEY = "tipout-employees-roster-v1";
  const DEFAULT_STORE_NAME = "Golden Dragon Chinese Kitchen - Dallas, TX 75231";
  const EXTRA_PAYROLL_STORES = [
    "Lone Star BBQ House - Austin, TX 78701",
    "Pacific Bowl & Grill - San Diego, CA 92101",
  ];
  const UNIFIED_ROSTER_SEED = [
    { id: "roster-seed-1", name: "小飞鸽", role: "Floor", store: "Golden Dragon Chinese Kitchen - Dallas, TX 75231", adpFile: "924", department: "Floor", rate: 48.07, otRate: 72.11, ot2Rate: 96.14 },
    { id: "roster-seed-2", name: "Maria Garcia", role: "Server", store: "Golden Dragon Chinese Kitchen - Dallas, TX 75231", adpFile: "101", department: "Floor", rate: 15.5, otRate: 23.25, ot2Rate: 31 },
    { id: "roster-seed-3", name: "Jason Chen", role: "Server", store: "Sakura Sushi & Ramen House - Dallas, TX 75247", adpFile: "102", department: "Floor", rate: 16.2, otRate: 24.3, ot2Rate: 32.4 },
    { id: "roster-seed-4", name: "Emily Watson", role: "Server", store: "Sakura Sushi & Ramen House - Dallas, TX 75247", adpFile: "103", department: "Floor", rate: 15.8, otRate: 23.7, ot2Rate: 31.6 },
    { id: "roster-seed-5", name: "Mike Johnson", role: "Bartender", store: "Golden Dragon Chinese Kitchen - Dallas, TX 75231", adpFile: "104", department: "Bar", rate: 18.5, otRate: 27.75, ot2Rate: 37 },
    { id: "roster-seed-6", name: "Tom Wilson", role: "Kitchen", store: "Sakura Sushi & Ramen House - Dallas, TX 75247", adpFile: "105", department: "Kitchen", rate: 22.5, otRate: 33.75, ot2Rate: 45 },
    { id: "roster-seed-7", name: "Carlos Lopez", role: "Busser", store: "Lone Star BBQ House - Austin, TX 78701", adpFile: "106", department: "Floor", rate: 14.2, otRate: 21.3, ot2Rate: 28.4 },
    { id: "roster-seed-8", name: "Linda Nguyen", role: "Cashier", store: "Lone Star BBQ House - Austin, TX 78701", adpFile: "107", department: "Front", rate: 17.1, otRate: 25.65, ot2Rate: 34.2 },
    { id: "roster-seed-9", name: "Daniel Ortiz", role: "Runner", store: "Pacific Bowl & Grill - San Diego, CA 92101", adpFile: "108", department: "Floor", rate: 15.1, otRate: 22.65, ot2Rate: 30.2 },
    { id: "roster-seed-10", name: "Rachel Scott", role: "Host", store: "Pacific Bowl & Grill - San Diego, CA 92101", adpFile: "109", department: "Front", rate: 16.4, otRate: 24.6, ot2Rate: 32.8 },
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

  function buildSeedSegments(idx) {
    const day1In = `${String(8 + (idx % 3)).padStart(2, "0")}:00`;
    const day1Out = `${String(16 + (idx % 3)).padStart(2, "0")}:00`;
    return [
      {
        date: "04/01/2026",
        slots: [
          { in: day1In, out: day1Out },
          { in: "", out: "" },
          { in: "", out: "" },
        ],
        meal: "0:30",
        reg: 7.5,
        ot: 0,
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
        ot: idx % 2 === 0 ? 0.5 : 0,
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
        ot: idx % 3 === 0 ? 1 : 0.25,
        ot2: 0,
      },
    ];
  }

  function buildSeedEmployees() {
    const baseAdj = {
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
    return UNIFIED_ROSTER_SEED.map((r, idx) => ({
      id: `emp-${String(r.id || idx + 1).replace(/^roster-seed-/, "seed-")}`,
      name: r.name,
      store: r.store || DEFAULT_STORE_NAME,
      adpFile: r.adpFile || "",
      department: r.department || r.role || "Floor",
      confirmed: false,
      rate: Number(r.rate) || 0,
      otRate: Number(r.otRate) || 0,
      ot2Rate: Number(r.ot2Rate) || 0,
      segments: buildSeedSegments(idx),
      adjustments: { ...baseAdj, tips: idx === 0 ? 85 : 0, svcw: idx === 0 ? 120.5 : 0 },
    }));
  }

  const DEFAULT_DATA = {
    coCode: "X0L",
    periods: buildPresetPeriods(),
    employees: {
      "p2026-08": buildSeedEmployees(),
    },
  };

  function cloneEmployeesTemplate(list) {
    if (typeof structuredClone === "function") return structuredClone(list);
    return JSON.parse(JSON.stringify(list));
  }

  function cloneData(obj) {
    if (typeof structuredClone === "function") return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
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

  /** 补全“已确认”周期的数据：仅在该期数据为空时按模板填充 */
  function fillConfirmedPeriodsData(employeesMap, periods) {
    if (!employeesMap || typeof employeesMap !== "object") return;
    const list = Array.isArray(periods) ? periods : [];
    const baseTemplate =
      (Array.isArray(employeesMap["p2026-08"]) && employeesMap["p2026-08"].length > 0 && employeesMap["p2026-08"]) ||
      Object.values(employeesMap).find((arr) => Array.isArray(arr) && arr.length > 0) ||
      [];
    list.forEach((p) => {
      if (!p || p.status !== "confirmed") return;
      const pid = p.id;
      if (!pid) return;
      if (!Array.isArray(employeesMap[pid]) || employeesMap[pid].length === 0) {
        employeesMap[pid] = cloneEmployeesTemplate(baseTemplate);
      }
      employeesMap[pid].forEach((emp) => {
        if (emp) emp.confirmed = true;
      });
    });
  }

  /** 补“部分未确认”演示场景：确保某一期出现部分已确认、部分未确认 */
  function fillPartialConfirmedScenario(employeesMap) {
    if (!employeesMap || typeof employeesMap !== "object") return;
    const targetPid = "p2026-10";
    const template = Array.isArray(employeesMap["p2026-08"]) ? employeesMap["p2026-08"] : [];
    if (!Array.isArray(employeesMap[targetPid]) || employeesMap[targetPid].length === 0) {
      employeesMap[targetPid] = cloneEmployeesTemplate(template);
    }
    const list = employeesMap[targetPid];
    if (!Array.isArray(list) || list.length === 0) return;
    list.forEach((emp, idx) => {
      if (!emp) return;
      emp.confirmed = idx < 4;
    });
  }

  /** 补“未确认”演示场景：确保某一期全部未确认 */
  function fillDraftScenario(employeesMap) {
    if (!employeesMap || typeof employeesMap !== "object") return;
    const targetPid = "p2026-08";
    const list = employeesMap[targetPid];
    if (!Array.isArray(list)) return;
    list.forEach((emp) => {
      if (emp) emp.confirmed = false;
    });
  }

  function getUnifiedRoster() {
    try {
      const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
      if (!raw) return cloneEmployeesTemplate(UNIFIED_ROSTER_SEED);
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed.filter((e) => e && String((e.name || "")).trim()) : [];
      const byId = new Set(list.map((e) => String((e && e.id) || "")));
      UNIFIED_ROSTER_SEED.forEach((s) => {
        if (!byId.has(s.id)) list.push(cloneEmployeesTemplate(s));
      });
      return list;
    } catch (_) {
      return cloneEmployeesTemplate(UNIFIED_ROSTER_SEED);
    }
  }

  /** 报税报表中的员工姓名/角色(部门)来源统一到员工列表 */
  function syncEmployeesFromUnifiedRoster(employeesMap) {
    if (!employeesMap || typeof employeesMap !== "object") return;
    const roster = getUnifiedRoster();
    if (!Array.isArray(roster) || roster.length === 0) return;
    Object.keys(employeesMap).forEach((pid) => {
      const current = Array.isArray(employeesMap[pid]) ? employeesMap[pid] : [];
      const byAdp = new Map();
      const byName = new Map();
      current.forEach((e) => {
        if (!e) return;
        const adp = String((e.adpFile || "")).trim();
        const name = String((e.name || "")).trim().toLowerCase();
        if (adp && !byAdp.has(adp)) byAdp.set(adp, e);
        if (name && !byName.has(name)) byName.set(name, e);
      });
      const next = roster.map((r, idx) => {
        const rosterAdp = String((r.adpFile || "")).trim();
        const rosterName = String((r.name || "")).trim();
        const existing =
          (rosterAdp && byAdp.get(rosterAdp)) || byName.get(rosterName.toLowerCase()) || current[idx] || null;
        return {
          id: (existing && existing.id) || `emp-roster-${idx + 1}`,
          name: rosterName || ((existing && existing.name) || `员工${idx + 1}`),
          store: String((r.store || (existing && existing.store) || DEFAULT_STORE_NAME)).trim() || DEFAULT_STORE_NAME,
          adpFile: rosterAdp || String((existing && existing.adpFile) || "").trim(),
          department: String((r.department || r.role || (existing && existing.department) || "")).trim(),
          confirmed: !!(existing && existing.confirmed),
          rate: Number.isFinite(Number(r.rate)) ? Number(r.rate) : Number((existing && existing.rate) || 0),
          otRate: Number.isFinite(Number(r.otRate)) ? Number(r.otRate) : Number((existing && existing.otRate) || 0),
          ot2Rate: Number.isFinite(Number(r.ot2Rate)) ? Number(r.ot2Rate) : Number((existing && existing.ot2Rate) || 0),
          segments: Array.isArray(existing && existing.segments)
            ? existing.segments.map((s) => migrateLegacySegmentToDay(s))
            : [],
          adjustments: {
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
            ...((existing && existing.adjustments) || {}),
          },
        };
      });
      employeesMap[pid] = next;
    });
  }

  function calcPeriodStatus(periodId, employeesMap) {
    const list = (employeesMap && employeesMap[periodId]) || [];
    if (!Array.isArray(list) || list.length === 0) return "draft";
    let confirmedCount = 0;
    list.forEach((e) => {
      if (e && e.confirmed) confirmedCount += 1;
    });
    if (confirmedCount === 0) return "draft";
    if (confirmedCount === list.length) return "confirmed";
    return "partial";
  }

  function syncPeriodStatuses(periods, employeesMap) {
    if (!Array.isArray(periods)) return;
    periods.forEach((p) => {
      if (!p || !p.id) return;
      p.status = calcPeriodStatus(p.id, employeesMap);
    });
  }

  fillPeriods2To5FromPeriod8(DEFAULT_DATA.employees);
  syncEmployeesFromUnifiedRoster(DEFAULT_DATA.employees);
  fillDraftScenario(DEFAULT_DATA.employees);
  fillConfirmedPeriodsData(DEFAULT_DATA.employees, DEFAULT_DATA.periods);
  fillPartialConfirmedScenario(DEFAULT_DATA.employees);
  syncPeriodStatuses(DEFAULT_DATA.periods, DEFAULT_DATA.employees);

  let state = {
    data: cloneData(DEFAULT_DATA),
    view: "periods",
    periodId: null,
    employeeId: null,
    periodYearFilter: String(new Date().getFullYear()),
    periodNumberFilter: "",
    periodStatusFilter: "",
    employeeStoreFilter: "",
    workspaceEntrySnapshot: "",
    workspaceConfirmedInSession: false,
    activeTab: "manage",
  };

  function emptySlots(count) {
    const n = Math.max(1, Number(count) || 1);
    return Array.from({ length: n }, () => ({ in: "", out: "" }));
  }

  function hasSlotClock(slot) {
    if (!slot) return false;
    const cin = String(slot.in != null ? slot.in : "").trim();
    const cout = String(slot.out != null ? slot.out : "").trim();
    return !!(cin || cout);
  }

  /** 每日一条：3 行 In/Out + 当日 Meal / Reg / OT / OT2 */
  function normalizeDay(d) {
    const slotRows = Number(d && d.slotRows);
    const o = {
      date: d && d.date != null ? d.date : "",
      meal: d && d.meal != null ? d.meal : "",
      reg: Number(d && d.reg) || 0,
      ot: Number(d && d.ot) || 0,
      ot2: Number(d && d.ot2) || 0,
      slots: emptySlots(),
      slotRows: Number.isFinite(slotRows) && slotRows > 0 ? Math.floor(slotRows) : 0,
    };
    if (d && Array.isArray(d.slots)) {
      o.slots = d.slots
        .map((sl) => ({
          in: sl && sl.in != null ? sl.in : "",
          out: sl && sl.out != null ? sl.out : "",
        }))
        .filter((sl) => sl && typeof sl === "object");
      if (o.slots.length === 0) o.slots = emptySlots();
    }
    return o;
  }

  /** 旧版扁平 in1–out4 → 每日 3 条 slot */
  function migrateLegacySegmentToDay(s) {
    if (!s || typeof s !== "object") return normalizeDay({});
    if (Array.isArray(s.slots) && s.slots.length >= 1) {
      return normalizeDay(s);
    }
    const slots = emptySlots(3);
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
    $all('#segment-rows tr[data-primary="1"]').forEach((row) => {
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
    if (!data || typeof data !== "object") return;
    if (!data.employees || typeof data.employees !== "object") data.employees = {};
    if (!Array.isArray(data.periods)) data.periods = [];
    fillPeriods2To5FromPeriod8(data.employees);
    migratePeriods(data);
    syncEmployeesFromUnifiedRoster(data.employees);
    fillDraftScenario(data.employees);
    fillConfirmedPeriodsData(data.employees, data.periods);
    fillPartialConfirmedScenario(data.employees);
    syncPeriodStatuses(data.periods, data.employees);
    const tipOutStores = getTipOutStores();
    const defaultStore = tipOutStores[0] || DEFAULT_STORE_NAME;
    Object.keys(data.employees).forEach((pid) => {
      const list = Array.isArray(data.employees[pid]) ? data.employees[pid] : [];
      if (!Array.isArray(data.employees[pid])) data.employees[pid] = list;
      list.forEach((emp) => {
        if (!emp || typeof emp !== "object") return;
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

    // 最终兜底：任何情况下都保证 periods 可渲染
    if (!Array.isArray(data.periods) || data.periods.length === 0) {
      data.periods = buildPresetPeriods();
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) {
          state.data = parsed.data;
          try {
            migratePayrollData(state.data);
          } catch (_) {
            state.data = cloneData(DEFAULT_DATA);
          }
        }
        if (parsed && parsed.view) state.view = parsed.view;
        if (parsed && parsed.periodId) state.periodId = parsed.periodId;
        if (parsed && parsed.employeeId) state.employeeId = parsed.employeeId;
        if (parsed && typeof parsed.periodYearFilter === "string") state.periodYearFilter = parsed.periodYearFilter;
        if (parsed && typeof parsed.periodNumberFilter === "string") state.periodNumberFilter = parsed.periodNumberFilter;
        if (parsed && typeof parsed.periodStatusFilter === "string") state.periodStatusFilter = parsed.periodStatusFilter;
        if (parsed && typeof parsed.employeeStoreFilter === "string") state.employeeStoreFilter = parsed.employeeStoreFilter;
        if (parsed && parsed.activeTab) state.activeTab = parsed.activeTab;
      }
    } catch (_) {
      /* ignore */
    }
    // 读取失败或旧结构异常时，始终保证核心结构存在
    if (!state.data || typeof state.data !== "object") {
      state.data = cloneData(DEFAULT_DATA);
    }
    if (!Array.isArray(state.data.periods) || state.data.periods.length === 0) {
      state.data.periods = buildPresetPeriods();
    }
    if (!state.data.employees || typeof state.data.employees !== "object") {
      state.data.employees = {};
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
          periodStatusFilter: state.periodStatusFilter,
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

  function buildEmployeeSnapshot(emp) {
    if (!emp) return "";
    const safe = {
      adpFile: emp.adpFile || "",
      confirmed: !!emp.confirmed,
      rate: Number(emp.rate) || 0,
      otRate: Number(emp.otRate) || 0,
      ot2Rate: Number(emp.ot2Rate) || 0,
      segments: Array.isArray(emp.segments)
        ? emp.segments.map((d) => {
            const day = normalizeDay(d);
            return {
              date: day.date || "",
              meal: day.meal || "",
              reg: Number(day.reg) || 0,
              ot: Number(day.ot) || 0,
              ot2: Number(day.ot2) || 0,
              slots: day.slots.map((s) => ({ in: s.in || "", out: s.out || "" })),
            };
          })
        : [],
      adjustments: mergeAdjustments(emp.adjustments),
    };
    return JSON.stringify(safe);
  }

  function markWorkspaceEntrySnapshot() {
    const emp = getEmployee(state.periodId, state.employeeId);
    if (!emp) {
      state.workspaceEntrySnapshot = "";
      state.workspaceConfirmedInSession = false;
      return;
    }
    state.workspaceEntrySnapshot = buildEmployeeSnapshot(emp);
    state.workspaceConfirmedInSession = false;
  }

  function hasUnconfirmedWorkspaceChanges() {
    const emp = getEmployee(state.periodId, state.employeeId);
    if (!emp) return false;
    readFormIntoState();
    const changed = buildEmployeeSnapshot(emp) !== state.workspaceEntrySnapshot;
    return changed && !state.workspaceConfirmedInSession;
  }

  /** 仅在 Manage Payroll 页面离开时拦截（切 tab / 跳导航） */
  function shouldWarnBeforeLeavingManage() {
    return state.view === "workspace" && state.activeTab === "manage" && hasUnconfirmedWorkspaceChanges();
  }

  function showUnsavedConfirmDialog() {
    const modalId = "workspaceUnsavedConfirmModal";
    const modal = $("#" + modalId);
    const btnStay = $("#btn-unsaved-stay");
    const btnLeave = $("#btn-unsaved-leave");
    const btnClose = $("#btn-unsaved-close");
    if (!modal || !btnStay || !btnLeave || !btnClose) return Promise.resolve(false);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (typeof closeModal === "function") closeModal(modalId);
        else modal.classList.remove("show");
        resolve(ok);
      };
      const onStay = () => finish(false);
      const onLeave = () => finish(true);
      const onClose = () => finish(false);
      const onOverlay = (e) => {
        if (e.target === modal) finish(false);
      };
      const cleanup = () => {
        btnStay.removeEventListener("click", onStay);
        btnLeave.removeEventListener("click", onLeave);
        btnClose.removeEventListener("click", onClose);
        modal.removeEventListener("click", onOverlay);
      };
      btnStay.addEventListener("click", onStay);
      btnLeave.addEventListener("click", onLeave);
      btnClose.addEventListener("click", onClose);
      modal.addEventListener("click", onOverlay);
      if (typeof openModal === "function") openModal(modalId);
      else modal.classList.add("show");
    });
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
    const statusSelect = $("#period-status-filter");
    if (!tbody) return;
    if (!state.data || typeof state.data !== "object") state.data = cloneData(DEFAULT_DATA);
    if (!state.data.employees || typeof state.data.employees !== "object") state.data.employees = {};
    let periods = Array.isArray(state.data.periods) ? state.data.periods : [];
    if (periods.length === 0) {
      state.data.periods = buildPresetPeriods();
      periods = state.data.periods;
    }
    syncPeriodStatuses(periods, state.data.employees);
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
    let activeYear = state.periodYearFilter;
    let yearFiltered = periods.filter((p) => getPeriodYear(p) === activeYear);
    if (yearFiltered.length === 0 && periods.length > 0) {
      const allYears = [...new Set(periods.map((p) => getPeriodYear(p)).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
      const fallbackYear = years.find((y) => allYears.includes(y)) || allYears[0] || years[0];
      activeYear = fallbackYear;
      state.periodYearFilter = fallbackYear;
      yearFiltered = periods.filter((p) => getPeriodYear(p) === fallbackYear);
      if (yearSelect) yearSelect.value = fallbackYear;
    }
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
    const validStatuses = ["draft", "partial", "confirmed"];
    if (state.periodStatusFilter && !validStatuses.includes(state.periodStatusFilter)) {
      state.periodStatusFilter = "";
    }
    const activeStatus = state.periodStatusFilter;
    let filtered = activePeriodNo
      ? yearFiltered.filter((p) => String(p.periodNumber || "") === activePeriodNo)
      : yearFiltered;
    if (statusSelect) {
      statusSelect.value = activeStatus || "";
    }
    if (activeStatus) filtered = filtered.filter((p) => (p && p.status) === activeStatus);
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
            : p.status === "partial"
            ? '<span class="tag tag-green">部分未确认</span>'
            : '<span class="tag tag-orange">未确认</span>';
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
      const filledSlotIndexes = day.slots
        .map((sl, idx) => ({ sl, idx }))
        .filter((x) => hasSlotClock(x.sl))
        .map((x) => x.idx);
      const targetRows = Math.max(day.slotRows || 0, filledSlotIndexes.length || 1);
      const visibleSlotIndexes = filledSlotIndexes.slice(0);
      for (let i = 0; visibleSlotIndexes.length < targetRows; i++) {
        if (!visibleSlotIndexes.includes(i)) visibleSlotIndexes.push(i);
      }
      const rowsForDay = visibleSlotIndexes.length;
      visibleSlotIndexes.forEach((slotIdx, renderIdx) => {
        if (!day.slots[slotIdx]) day.slots[slotIdx] = { in: "", out: "" };
        const sl = day.slots[slotIdx];
        const isLastRow = renderIdx === rowsForDay - 1;
        const actionsHtml = `<div style="display:flex;gap:8px;align-items:center">
            ${
              isLastRow
                ? `<button type="button" class="btn btn-sm" data-action="add-slot-row" data-day-index="${dayIdx}">+ 新增 In/Out</button>`
                : ""
            }
            <button type="button" class="btn btn-sm" data-action="remove-slot-row" data-day-index="${dayIdx}" data-row-order="${renderIdx}">删除</button>
          </div>`;
        if (renderIdx === 0) {
          rowHtml.push(`<tr data-day-index="${dayIdx}" data-slot-index="${slotIdx}" data-row-order="${renderIdx}" data-primary="1">
        <td rowspan="${rowsForDay}" style="vertical-align:top">
          <input type="text" class="field-seg form-control" data-field="date" value="${escapeHtml(day.date)}" aria-label="Date" style="font-family:ui-monospace,Menlo,monospace" />
        </td>
        <td><input type="text" class="field-seg form-control" data-field="in" value="${escapeHtml(sl.in)}" placeholder="In" style="font-family:ui-monospace,Menlo,monospace" /></td>
        <td><div style="display:flex;gap:8px;align-items:center"><input type="text" class="field-seg form-control" data-field="out" value="${escapeHtml(sl.out)}" placeholder="Out" style="font-family:ui-monospace,Menlo,monospace" />${actionsHtml}</div></td>
        <td rowspan="${rowsForDay}" style="vertical-align:top"><input type="text" class="field-seg form-control" data-field="meal" value="${escapeHtml(day.meal)}" aria-label="Meal" /></td>
        <td rowspan="${rowsForDay}" style="vertical-align:top"><input type="number" step="0.01" class="field-seg form-control" data-field="reg" value="${day.reg}" aria-label="Regular" /></td>
        <td rowspan="${rowsForDay}" style="vertical-align:top"><input type="number" step="0.01" class="field-seg form-control" data-field="ot" value="${day.ot}" aria-label="OT" /></td>
        <td rowspan="${rowsForDay}" style="vertical-align:top"><input type="number" step="0.01" class="field-seg form-control" data-field="ot2" value="${day.ot2}" aria-label="OT2" /></td>
      </tr>`);
        } else {
          rowHtml.push(`<tr data-day-index="${dayIdx}" data-slot-index="${slotIdx}" data-row-order="${renderIdx}" data-primary="0">
        <td><input type="text" class="field-seg form-control" data-field="in" value="${escapeHtml(sl.in)}" placeholder="In" style="font-family:ui-monospace,Menlo,monospace" /></td>
        <td><div style="display:flex;gap:8px;align-items:center"><input type="text" class="field-seg form-control" data-field="out" value="${escapeHtml(sl.out)}" placeholder="Out" style="font-family:ui-monospace,Menlo,monospace" />${actionsHtml}</div></td>
      </tr>`);
        }
      });
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
      const dayRows = $all(`#segment-rows tr[data-day-index="${dIdx}"]`).sort((a, b) => {
        const ra = parseInt(a.getAttribute("data-row-order"), 10);
        const rb = parseInt(b.getAttribute("data-row-order"), 10);
        if (!Number.isNaN(ra) && !Number.isNaN(rb)) return ra - rb;
        return parseInt(a.getAttribute("data-slot-index"), 10) - parseInt(b.getAttribute("data-slot-index"), 10);
      });
      const day = normalizeDay({});
      day.slots = [];
      dayRows.forEach((row) => {
        const slot = parseInt(row.getAttribute("data-slot-index"), 10);
        if (Number.isNaN(slot) || slot < 0) return;
        const inEl = row.querySelector('.field-seg[data-field="in"]');
        const outEl = row.querySelector('.field-seg[data-field="out"]');
        const slotValue = {
          in: (inEl && inEl.value) || "",
          out: (outEl && outEl.value) || "",
        };
        day.slots.push(slotValue);
        if (row.getAttribute("data-primary") === "1") {
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
      day.slotRows = Math.max(1, dayRows.length);
      if (day.slots.length === 0) day.slots = emptySlots();
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
    const pageRoot = document.querySelector(".payroll-page");
    if (pageRoot) pageRoot.classList.toggle("payroll-entered", name === "employees" || name === "workspace");
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
    state.workspaceConfirmedInSession = true;
    state.workspaceEntrySnapshot = buildEmployeeSnapshot(emp);
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
        markWorkspaceEntrySnapshot();
        setTab("manage");
        showView("workspace");
        syncDerived();
      }
      if (act === "back-employees") {
        if (hasUnconfirmedWorkspaceChanges()) {
          showUnsavedConfirmDialog().then((ok) => {
            if (!ok) return;
            renderEmployees();
            showView("employees");
          });
          return;
        }
        renderEmployees();
        showView("employees");
      }
      if (act === "confirm-employee") {
        confirmEmployee();
      }
      if (act === "export-csv") {
        exportAdpCsv();
      }
      if (act === "add-slot-row") {
        const dayIdx = parseInt(btn.getAttribute("data-day-index"), 10);
        if (Number.isNaN(dayIdx) || dayIdx < 0) return;
        readFormIntoState();
        const emp = getEmployee(state.periodId, state.employeeId);
        if (!emp || !Array.isArray(emp.segments) || !emp.segments[dayIdx]) return;
        const day = normalizeDay(emp.segments[dayIdx]);
        day.slots.push({ in: "", out: "" });
        day.slotRows = Math.max(day.slotRows || 0, day.slots.length);
        emp.segments[dayIdx] = day;
        renderManageForm();
        syncDerived();
      }
      if (act === "remove-slot-row") {
        const dayIdx = parseInt(btn.getAttribute("data-day-index"), 10);
        const rowOrder = parseInt(btn.getAttribute("data-row-order"), 10);
        if (Number.isNaN(dayIdx) || dayIdx < 0) return;
        readFormIntoState();
        const emp = getEmployee(state.periodId, state.employeeId);
        if (!emp || !Array.isArray(emp.segments) || !emp.segments[dayIdx]) return;
        const day = normalizeDay(emp.segments[dayIdx]);
        const removeIndex = !Number.isNaN(rowOrder) && rowOrder >= 0 ? rowOrder : day.slots.length - 1;
        if (day.slots.length <= 1) {
          day.slots = [{ in: "", out: "" }];
          day.slotRows = 1;
        } else {
          if (removeIndex >= 0 && removeIndex < day.slots.length) {
            day.slots.splice(removeIndex, 1);
          } else {
            day.slots.pop();
          }
          if (day.slots.length === 0) day.slots = [{ in: "", out: "" }];
          day.slotRows = Math.min(Math.max(1, (day.slotRows || day.slots.length) - 1), day.slots.length);
        }
        emp.segments[dayIdx] = day;
        renderManageForm();
        syncDerived();
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
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        if (!targetTab || targetTab === state.activeTab) return;
        if (!shouldWarnBeforeLeavingManage()) {
          setTab(targetTab);
          return;
        }
        showUnsavedConfirmDialog().then((ok) => {
          if (!ok) return;
          setTab(targetTab);
        });
      });
    });

    document.body.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) return;
      if (!shouldWarnBeforeLeavingManage()) return;
      e.preventDefault();
      const targetUrl = href;
      showUnsavedConfirmDialog().then((ok) => {
        if (!ok) return;
        window.location.href = targetUrl;
      });
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

    $("#period-status-filter")?.addEventListener("change", (e) => {
      state.periodStatusFilter = e.target.value || "";
      renderPeriods();
    });

    $("#btn-print-detail")?.addEventListener("click", () => window.print());
  }

  loadState();
  renderPeriods();
  renderEmployees();
  bind();

  // 进入报税报表页时，始终默认回到 Payroll期 页面
  state.view = "periods";
  state.periodId = null;
  state.employeeId = null;
  showView("periods");
})();
