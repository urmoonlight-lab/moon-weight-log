"use strict";

const STORAGE_KEY = "moonWeightLog:v0.1.0";
const APP_VERSION = "0.1.0";
const TODAY = new Date().toISOString().slice(0, 10);
const SCORE_FIELDS = ["sleepQuality", "appetite", "bloating", "stress", "edema"];
const WEIGHT_SEARCH_FIELDS = ["cycleNotes", "dietNotes", "exerciseNotes", "dailyNote", "abnormalEvents"];
const MEASUREMENT_FIELDS = [
  ["waistCm", "腰围"],
  ["hipCm", "臀围"],
  ["chestCm", "胸围"],
  ["thighCm", "大腿围"],
  ["calfCm", "小腿围"],
  ["upperArmCm", "上臂围"]
];
const MOVING_AVERAGE_MIN_RECORDS = { 7: 3, 14: 5, 30: 8 };

let appData = loadData();
let selectedSummaryDays = 7;

function createDefaultData() {
  const now = new Date().toISOString();
  return {
    version: APP_VERSION,
    appName: "Moon Weight Log",
    updatedAt: "",
    profile: {
      displayName: "",
      goalType: "稳定记录",
      targetWeight: "",
      targetRange: "",
      goalNotes: "",
      weighingFrequency: "3-7次/周",
      notes: ""
    },
    weightLogs: [],
    measurements: [],
    settings: {
      theme: "soft-moon",
      language: "zh-CN",
      createdAt: now
    }
  };
}

function loadData() {
  const fallback = createDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return normalizeData(parsed);
  } catch (error) {
    console.warn("Unable to load Moon Weight Log data:", error);
    return fallback;
  }
}

function normalizeData(input) {
  const defaults = createDefaultData();
  const normalized = {
    ...defaults,
    ...input,
    profile: { ...defaults.profile, ...(input && input.profile ? input.profile : {}) },
    settings: { ...defaults.settings, ...(input && input.settings ? input.settings : {}) },
    weightLogs: Array.isArray(input && input.weightLogs) ? input.weightLogs : [],
    measurements: Array.isArray(input && input.measurements) ? input.measurements : []
  };
  normalized.version = input && input.version ? input.version : APP_VERSION;
  normalized.appName = "Moon Weight Log";
  return normalized;
}

function saveData() {
  appData.updatedAt = new Date().toISOString();
  appData.version = APP_VERSION;
  appData.appName = "Moon Weight Log";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  renderAll();
}

function generateId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `mwl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function addWeightLog(log) {
  const now = new Date().toISOString();
  const record = {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    date: TODAY,
    weightKg: "",
    morningWeight: "不确定",
    sleepQuality: "",
    appetite: "",
    bloating: "",
    stress: "",
    hydration: "",
    bowelMovement: "",
    cycleNotes: "",
    edema: "",
    dietNotes: "",
    exerciseNotes: "",
    dailyNote: "",
    abnormalEvents: "",
    ...log
  };
  appData.weightLogs.push(record);
  saveData();
  return record;
}

function updateWeightLog(id, updates) {
  const record = appData.weightLogs.find((item) => item.id === id);
  if (!record) return null;
  Object.assign(record, updates, { updatedAt: new Date().toISOString() });
  saveData();
  return record;
}

function deleteWeightLog(id) {
  const before = appData.weightLogs.length;
  appData.weightLogs = appData.weightLogs.filter((item) => item.id !== id);
  if (appData.weightLogs.length !== before) saveData();
}

function addMeasurement(measurement) {
  const now = new Date().toISOString();
  const record = {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    date: TODAY,
    waistCm: "",
    hipCm: "",
    chestCm: "",
    thighCm: "",
    calfCm: "",
    upperArmCm: "",
    notes: "",
    ...measurement
  };
  appData.measurements.push(record);
  saveData();
  return record;
}

function updateMeasurement(id, updates) {
  const record = appData.measurements.find((item) => item.id === id);
  if (!record) return null;
  Object.assign(record, updates, { updatedAt: new Date().toISOString() });
  saveData();
  return record;
}

function deleteMeasurement(id) {
  const before = appData.measurements.length;
  appData.measurements = appData.measurements.filter((item) => item.id !== id);
  if (appData.measurements.length !== before) saveData();
}

function updateProfile(updates) {
  appData.profile = { ...appData.profile, ...updates };
  saveData();
  return appData.profile;
}

function exportJSON() {
  downloadFile(
    `moon-weight-log-backup-${dateStamp()}.json`,
    JSON.stringify(appData, null, 2),
    "application/json"
  );
}

function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = normalizeData(parsed);
        if (!Array.isArray(imported.weightLogs) || !Array.isArray(imported.measurements)) {
          throw new Error("JSON 结构不完整");
        }
        appData = imported;
        saveData();
        resolve(appData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function exportCSV(type) {
  if (type === "measurements") {
    const rows = appData.measurements
      .slice()
      .sort(byDateAsc)
      .map((item) => ({
        date: item.date,
        waistCm: item.waistCm,
        hipCm: item.hipCm,
        chestCm: item.chestCm,
        thighCm: item.thighCm,
        calfCm: item.calfCm,
        upperArmCm: item.upperArmCm,
        notes: item.notes
      }));
    downloadFile(`moon-measurements-${dateStamp()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
    return;
  }

  const rows = appData.weightLogs
    .slice()
    .sort(byDateAsc)
    .map((item) => ({
      date: item.date,
      weightKg: item.weightKg,
      morningWeight: item.morningWeight,
      sleepQuality: item.sleepQuality,
      appetite: item.appetite,
      bloating: item.bloating,
      stress: item.stress,
      hydration: item.hydration,
      bowelMovement: item.bowelMovement,
      cycleNotes: item.cycleNotes,
      edema: item.edema,
      dietNotes: item.dietNotes,
      exerciseNotes: item.exerciseNotes,
      dailyNote: item.dailyNote,
      abnormalEvents: item.abnormalEvents
    }));
  downloadFile(`moon-weight-logs-${dateStamp()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

function generateSummary(days) {
  const logs = getWeightLogsInRange(days);
  const numericLogs = logs.filter((item) => hasNumber(item.weightKg));
  const weights = numericLogs.map((item) => Number(item.weightKg));
  const first = numericLogs[0];
  const latest = numericLogs[numericLogs.length - 1];
  const average = weights.length ? averageOf(weights) : null;
  const change = first && latest ? Number(latest.weightKg) - Number(first.weightKg) : null;

  return {
    days,
    recordDays: logs.length,
    startWeight: first ? Number(first.weightKg) : null,
    latestWeight: latest ? Number(latest.weightKg) : null,
    weightChange: change,
    averageWeight: average,
    highestWeight: weights.length ? Math.max(...weights) : null,
    lowestWeight: weights.length ? Math.min(...weights) : null,
    sevenDayAverage: calculateMovingAverage(7),
    thirtyDayAverage: calculateMovingAverage(30),
    sleepAverage: averageScore(logs, "sleepQuality"),
    appetiteAverage: averageScore(logs, "appetite"),
    edemaAverage: averageScore(logs, "edema"),
    bloatingAverage: averageScore(logs, "bloating"),
    exerciseKeywords: extractKeywords(logs.map((item) => item.exerciseNotes).join(" ")),
    dietKeywords: extractKeywords(logs.map((item) => item.dietNotes).join(" "))
  };
}

function calculateMovingAverage(days) {
  const logs = getWeightLogsInRange(days).filter((item) => hasNumber(item.weightKg));
  const minRecords = MOVING_AVERAGE_MIN_RECORDS[days] || Math.max(2, Math.ceil(days / 4));
  if (logs.length < minRecords) return null;
  return averageOf(logs.map((item) => Number(item.weightKg)));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.info("Service worker registration skipped:", error);
    });
  });
}

function setupNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll(".view").forEach((section) => section.classList.toggle("is-active", section.id === `view-${view}`));
      if (view === "weights") drawWeightChart();
      if (view === "measurements") drawMeasurementChart();
    });
  });
}

function setupForms() {
  setDefaultDates();
  setupDateInputs();
  setupRangeOutputs();

  document.getElementById("weight-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = valueOf("weight-id");
    const payload = readWeightForm();
    if (id) {
      updateWeightLog(id, payload);
      setStatus("weight-status", "已更新并保存到本机。");
    } else {
      addWeightLog(payload);
      setStatus("weight-status", "已保存到本机。");
    }
    resetWeightForm();
  });

  document.getElementById("weight-reset").addEventListener("click", resetWeightForm);
  document.getElementById("weight-search").addEventListener("input", renderWeightList);
  document.getElementById("weight-sort").addEventListener("change", renderWeightList);

  document.getElementById("measurement-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = valueOf("measurement-id");
    const payload = readMeasurementForm();
    if (id) {
      updateMeasurement(id, payload);
      setStatus("measurement-status", "围度记录已更新并保存到本机。");
    } else {
      addMeasurement(payload);
      setStatus("measurement-status", "围度记录已保存到本机。");
    }
    resetMeasurementForm();
  });

  document.getElementById("measurement-reset").addEventListener("click", resetMeasurementForm);

  document.getElementById("profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    updateProfile(readProfileForm());
    setStatus("profile-status", "目标设置已保存到本机。");
  });

  document.querySelectorAll("[data-summary-days]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSummaryDays = Number(button.dataset.summaryDays);
      document.querySelectorAll("[data-summary-days]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderSummary();
    });
  });
  document.getElementById("summary-generate").addEventListener("click", renderSummary);

  document.getElementById("export-json").addEventListener("click", exportJSON);
  document.getElementById("export-weight-csv").addEventListener("click", () => exportCSV("weights"));
  document.getElementById("export-measurement-csv").addEventListener("click", () => exportCSV("measurements"));
  document.getElementById("export-profile-json").addEventListener("click", exportProfileJSON);
  document.getElementById("import-json").addEventListener("change", handleImport);
  document.getElementById("clear-data").addEventListener("click", clearLocalData);
}

function setupRangeOutputs() {
  [
    ["sleep-quality", "sleep-output"],
    ["appetite", "appetite-output"],
    ["bloating", "bloating-output"],
    ["stress", "stress-output"],
    ["edema", "edema-output"]
  ].forEach(([inputId, outputId]) => {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    const sync = () => {
      output.value = input.value;
      output.textContent = input.value;
    };
    input.addEventListener("input", sync);
    sync();
  });
}

function setDefaultDates() {
  setDateValue("weight-date", TODAY);
  setDateValue("measurement-date", TODAY);
}

function setupDateInputs() {
  ["weight-date", "measurement-date"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const sync = () => updateDateDisplay(id);
    input.addEventListener("change", sync);
    input.addEventListener("input", sync);
    updateDateDisplay(id);
  });
}

function readWeightForm() {
  return {
    date: valueOf("weight-date"),
    weightKg: valueOf("weight-kg"),
    morningWeight: checkedValue("morningWeight") || "不确定",
    sleepQuality: valueOf("sleep-quality"),
    appetite: valueOf("appetite"),
    bloating: valueOf("bloating"),
    stress: valueOf("stress"),
    hydration: checkedValue("hydration"),
    bowelMovement: checkedValue("bowelMovement"),
    cycleNotes: valueOf("cycle-notes"),
    edema: valueOf("edema"),
    dietNotes: valueOf("diet-notes"),
    exerciseNotes: valueOf("exercise-notes"),
    dailyNote: valueOf("daily-note"),
    abnormalEvents: valueOf("abnormal-events")
  };
}

function fillWeightForm(record) {
  setValue("weight-id", record.id);
  setDateValue("weight-date", record.date || TODAY);
  setValue("weight-kg", record.weightKg);
  setRadioValue("morningWeight", record.morningWeight || "不确定");
  setValue("sleep-quality", record.sleepQuality || 5);
  setValue("appetite", record.appetite || 5);
  setValue("bloating", record.bloating || 5);
  setValue("stress", record.stress || 5);
  setRadioValue("hydration", record.hydration || "");
  setRadioValue("bowelMovement", record.bowelMovement || "");
  setValue("cycle-notes", record.cycleNotes);
  setValue("edema", record.edema || 5);
  setValue("diet-notes", record.dietNotes);
  setValue("exercise-notes", record.exerciseNotes);
  setValue("daily-note", record.dailyNote);
  setValue("abnormal-events", record.abnormalEvents);
  setupRangeOutputs();
  document.getElementById("weight-submit").textContent = "保存修改";
  switchView("today");
  setStatus("weight-status", "正在编辑这条记录。");
}

function resetWeightForm() {
  document.getElementById("weight-form").reset();
  setValue("weight-id", "");
  setDefaultDates();
  setRadioValue("morningWeight", "不确定");
  setRadioValue("hydration", "");
  setRadioValue("bowelMovement", "");
  ["sleep-quality", "appetite", "bloating", "stress", "edema"].forEach((id) => setValue(id, "5"));
  setupRangeOutputs();
  document.getElementById("weight-submit").textContent = "保存今日记录";
}

function readMeasurementForm() {
  return {
    date: valueOf("measurement-date"),
    waistCm: valueOf("waist-cm"),
    hipCm: valueOf("hip-cm"),
    chestCm: valueOf("chest-cm"),
    thighCm: valueOf("thigh-cm"),
    calfCm: valueOf("calf-cm"),
    upperArmCm: valueOf("upper-arm-cm"),
    notes: valueOf("measurement-notes")
  };
}

function fillMeasurementForm(record) {
  setValue("measurement-id", record.id);
  setDateValue("measurement-date", record.date || TODAY);
  setValue("waist-cm", record.waistCm);
  setValue("hip-cm", record.hipCm);
  setValue("chest-cm", record.chestCm);
  setValue("thigh-cm", record.thighCm);
  setValue("calf-cm", record.calfCm);
  setValue("upper-arm-cm", record.upperArmCm);
  setValue("measurement-notes", record.notes);
  document.getElementById("measurement-submit").textContent = "保存修改";
  setStatus("measurement-status", "正在编辑这条围度记录。");
}

function resetMeasurementForm() {
  document.getElementById("measurement-form").reset();
  setValue("measurement-id", "");
  setDefaultDates();
  document.getElementById("measurement-submit").textContent = "保存围度记录";
}

function readProfileForm() {
  return {
    displayName: valueOf("display-name"),
    goalType: valueOf("goal-type"),
    targetWeight: valueOf("target-weight"),
    targetRange: valueOf("target-range"),
    goalNotes: valueOf("goal-notes"),
    weighingFrequency: valueOf("weighing-frequency") || "3-7次/周",
    notes: valueOf("profile-notes")
  };
}

function fillProfileForm() {
  const profile = appData.profile;
  setValue("display-name", profile.displayName);
  setValue("goal-type", profile.goalType || "稳定记录");
  setValue("target-weight", profile.targetWeight);
  setValue("target-range", profile.targetRange);
  setValue("goal-notes", profile.goalNotes);
  setValue("weighing-frequency", profile.weighingFrequency || "3-7次/周");
  setValue("profile-notes", profile.notes);
}

function renderAll() {
  renderWeightStats();
  renderWeightList();
  renderMeasurementStats();
  renderMeasurementList();
  fillProfileForm();
  renderSummary();
  renderUpdatedAt();
  drawWeightChart();
  drawMeasurementChart();
}

function renderWeightStats() {
  const stats = document.getElementById("weight-stats");
  const logs = sortedWeightLogs("desc").filter((item) => hasNumber(item.weightKg));
  const latest = logs[0];
  const seven = calculateMovingAverage(7);
  const thirty = calculateMovingAverage(30);
  stats.innerHTML = [
    statItem("最近一次", latest ? `${formatNumber(latest.weightKg)} kg` : "数据不足"),
    statItem("7日均值", seven === null ? "数据不足" : `${formatNumber(seven)} kg`),
    statItem("30日均值", thirty === null ? "数据不足" : `${formatNumber(thirty)} kg`),
    statItem("记录数量", `${appData.weightLogs.length} 条`)
  ].join("");
}

function renderWeightList() {
  const list = document.getElementById("weight-list");
  const query = valueOf("weight-search").trim().toLowerCase();
  const logs = sortedWeightLogs(valueOf("weight-sort") || "desc").filter((item) => {
    if (!query) return true;
    return WEIGHT_SEARCH_FIELDS.some((field) => String(item[field] || "").toLowerCase().includes(query));
  });

  if (!logs.length) {
    list.innerHTML = emptyState();
    return;
  }

  list.innerHTML = logs.map((item) => {
    const notes = [
      noteLine("饮食", item.dietNotes),
      noteLine("运动", item.exerciseNotes),
      noteLine("一句话", item.dailyNote),
      noteLine("异常事件", item.abnormalEvents),
      noteLine("周期备注", item.cycleNotes)
    ].filter(Boolean).join("");
    return `
      <article class="record-card">
        <div class="record-top">
          <div class="record-title">
            <strong>${escapeHTML(item.weightKg || "未填")} kg</strong>
            <span>${escapeHTML(item.date || "")} · 晨起体重：${escapeHTML(item.morningWeight || "不确定")}</span>
          </div>
          <div class="record-actions" aria-label="记录操作">
            <button class="icon-btn" type="button" title="编辑" aria-label="编辑 ${escapeHTML(item.date || "")}" data-edit-weight="${item.id}">✎</button>
            <button class="icon-btn" type="button" title="删除" aria-label="删除 ${escapeHTML(item.date || "")}" data-delete-weight="${item.id}">×</button>
          </div>
        </div>
        <div class="record-meta">
          ${metaItem("睡眠", item.sleepQuality)}
          ${metaItem("食欲", item.appetite)}
          ${metaItem("饱胀", item.bloating)}
          ${metaItem("压力", item.stress)}
          ${metaItem("水肿", item.edema)}
          ${metaItem("饮水", item.hydration)}
          ${metaItem("排便", item.bowelMovement)}
        </div>
        ${notes ? `<div class="record-notes">${notes}</div>` : ""}
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-edit-weight]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = appData.weightLogs.find((item) => item.id === button.dataset.editWeight);
      if (record) fillWeightForm(record);
    });
  });
  list.querySelectorAll("[data-delete-weight]").forEach((button) => {
    button.addEventListener("click", () => {
      if (confirm("确认删除这条体重记录吗？删除后仅可通过备份恢复。")) {
        deleteWeightLog(button.dataset.deleteWeight);
        setStatus("weight-status", "记录已从本机删除。");
      }
    });
  });
}

function renderMeasurementStats() {
  const stats = document.getElementById("measurement-stats");
  const measurements = sortedMeasurements("desc");
  const latest = measurements[0];
  const previous = measurements[1];
  if (!latest) {
    stats.innerHTML = [
      statItem("最近一次", "数据不足"),
      statItem("腰围变化", "数据不足"),
      statItem("臀围变化", "数据不足"),
      statItem("记录数量", "0 条")
    ].join("");
    return;
  }
  stats.innerHTML = [
    statItem("最近一次", latest.date || "未填日期"),
    statItem("腰围变化", diffText(latest.waistCm, previous && previous.waistCm)),
    statItem("臀围变化", diffText(latest.hipCm, previous && previous.hipCm)),
    statItem("记录数量", `${appData.measurements.length} 条`)
  ].join("");
}

function renderMeasurementList() {
  const list = document.getElementById("measurement-list");
  const measurements = sortedMeasurements("desc");
  if (!measurements.length) {
    list.innerHTML = emptyState();
    return;
  }
  list.innerHTML = measurements.map((item, index) => {
    const previous = measurements[index + 1];
    const values = MEASUREMENT_FIELDS.map(([field, label]) => {
      if (!item[field]) return "";
      return `<span>${label} ${escapeHTML(item[field])} cm ${previous ? `(${escapeHTML(diffText(item[field], previous[field]))})` : ""}</span>`;
    }).join("");
    return `
      <article class="record-card">
        <div class="record-top">
          <div class="record-title">
            <strong>${escapeHTML(item.date || "未填日期")}</strong>
            <span>围度记录</span>
          </div>
          <div class="record-actions" aria-label="围度记录操作">
            <button class="icon-btn" type="button" title="编辑" aria-label="编辑围度记录" data-edit-measurement="${item.id}">✎</button>
            <button class="icon-btn" type="button" title="删除" aria-label="删除围度记录" data-delete-measurement="${item.id}">×</button>
          </div>
        </div>
        <div class="record-meta">${values || "<span>暂无围度数值</span>"}</div>
        ${item.notes ? `<div class="record-notes">${noteLine("备注", item.notes)}</div>` : ""}
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-edit-measurement]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = appData.measurements.find((item) => item.id === button.dataset.editMeasurement);
      if (record) fillMeasurementForm(record);
    });
  });
  list.querySelectorAll("[data-delete-measurement]").forEach((button) => {
    button.addEventListener("click", () => {
      if (confirm("确认删除这条围度记录吗？删除后仅可通过备份恢复。")) {
        deleteMeasurement(button.dataset.deleteMeasurement);
        setStatus("measurement-status", "围度记录已从本机删除。");
      }
    });
  });
}

function renderSummary() {
  const output = document.getElementById("summary-output");
  const summary = generateSummary(selectedSummaryDays);
  const extra = valueOf("summary-extra").trim();
  output.innerHTML = `
    <h3>近 ${summary.days} 天摘要</h3>
    <div class="summary-grid">
      ${summaryMetric("记录天数", `${summary.recordDays} 天`)}
      ${summaryMetric("起始体重", kgOrInsufficient(summary.startWeight))}
      ${summaryMetric("最近体重", kgOrInsufficient(summary.latestWeight))}
      ${summaryMetric("体重变化", summary.weightChange === null ? "数据不足" : signedKg(summary.weightChange))}
      ${summaryMetric("平均体重", kgOrInsufficient(summary.averageWeight))}
      ${summaryMetric("最高体重", kgOrInsufficient(summary.highestWeight))}
      ${summaryMetric("最低体重", kgOrInsufficient(summary.lowestWeight))}
      ${summaryMetric("7日均值", kgOrInsufficient(summary.sevenDayAverage))}
      ${summaryMetric("30日均值", kgOrInsufficient(summary.thirtyDayAverage))}
      ${summaryMetric("睡眠质量平均", scoreOrInsufficient(summary.sleepAverage))}
      ${summaryMetric("食欲平均", scoreOrInsufficient(summary.appetiteAverage))}
      ${summaryMetric("水肿感平均", scoreOrInsufficient(summary.edemaAverage))}
      ${summaryMetric("饱胀感平均", scoreOrInsufficient(summary.bloatingAverage))}
    </div>
    <div>
      <h3>运动关键词</h3>
      ${keywordList(summary.exerciseKeywords)}
    </div>
    <div>
      <h3>饮食关键词</h3>
      ${keywordList(summary.dietKeywords)}
    </div>
    ${extra ? `<div><h3>手动补充</h3><p>${escapeHTML(extra)}</p></div>` : ""}
    <p>提示：体重短期波动可能受水分、盐分、训练、睡眠、排便、激素周期等影响。这里的摘要只帮助观察趋势，不提供医疗诊断；如果记录到异常事件或持续不适，建议联系专业人士判断。</p>
  `;
}

function renderUpdatedAt() {
  document.getElementById("updated-at").textContent = appData.updatedAt ? formatDateTime(appData.updatedAt) : "尚未保存";
}

function drawWeightChart() {
  const canvas = document.getElementById("weight-chart");
  if (!canvas) return;
  const logs = sortedWeightLogs("asc")
    .filter((item) => hasNumber(item.weightKg))
    .slice(-30)
    .map((item) => ({ label: item.date.slice(5), value: Number(item.weightKg) }));
  drawLineChart(canvas, logs, "体重 kg");
}

function drawMeasurementChart() {
  const canvas = document.getElementById("measurement-chart");
  if (!canvas) return;
  const data = sortedMeasurements("asc")
    .filter((item) => hasNumber(item.waistCm))
    .slice(-30)
    .map((item) => ({ label: item.date.slice(5), value: Number(item.waistCm) }));
  drawLineChart(canvas, data, "腰围 cm");
}

function drawLineChart(canvas, points, label) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffafc";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#eadce2";
  ctx.lineWidth = 1;
  for (let y = 50; y < height - 30; y += 45) {
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#74686f";
  ctx.font = "16px sans-serif";
  ctx.fillText(label, 48, 28);
  if (points.length < 2) {
    ctx.fillText("数据不足，继续记录后会显示趋势线。", 48, height / 2);
    return;
  }
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, 0.5);
  const low = min - padding;
  const high = max + padding;
  const plot = (point, index) => {
    const x = 56 + (index / (points.length - 1)) * (width - 92);
    const y = height - 48 - ((point.value - low) / (high - low)) * (height - 94);
    return { x, y };
  };

  ctx.strokeStyle = "#b85f7c";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    const coord = plot(point, index);
    if (index === 0) ctx.moveTo(coord.x, coord.y);
    else ctx.lineTo(coord.x, coord.y);
  });
  ctx.stroke();

  ctx.fillStyle = "#d989a1";
  points.forEach((point, index) => {
    const coord = plot(point, index);
    ctx.beginPath();
    ctx.arc(coord.x, coord.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#74686f";
  ctx.font = "13px sans-serif";
  const first = points[0];
  const last = points[points.length - 1];
  ctx.fillText(first.label, 48, height - 18);
  ctx.fillText(last.label, width - 78, height - 18);
}

function getWeightLogsInRange(days) {
  const latestDate = latestLogDate(appData.weightLogs) || TODAY;
  const end = parseDate(latestDate);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return appData.weightLogs
    .filter((item) => {
      if (!item.date) return false;
      const current = parseDate(item.date);
      return current >= start && current <= end;
    })
    .sort(byDateAsc);
}

function latestLogDate(logs) {
  const dated = logs.filter((item) => item.date).sort(byDateDesc);
  return dated.length ? dated[0].date : "";
}

function sortedWeightLogs(direction) {
  return appData.weightLogs.slice().sort(direction === "asc" ? byDateAsc : byDateDesc);
}

function sortedMeasurements(direction) {
  return appData.measurements.slice().sort(direction === "asc" ? byDateAsc : byDateDesc);
}

function byDateAsc(a, b) {
  return String(a.date || "").localeCompare(String(b.date || ""));
}

function byDateDesc(a, b) {
  return String(b.date || "").localeCompare(String(a.date || ""));
}

function averageScore(logs, field) {
  const values = logs.map((item) => item[field]).filter(hasNumber).map(Number);
  if (!values.length) return null;
  return averageOf(values);
}

function averageOf(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extractKeywords(text) {
  const cleaned = text
    .replace(/[，。！？、；：,.!?;:()[\]{}"'“”‘’]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
  const counts = new Map();
  cleaned.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));
}

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  });
  return "\ufeff" + lines.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportProfileJSON() {
  downloadFile(
    `moon-profile-${dateStamp()}.json`,
    JSON.stringify({ appName: appData.appName, version: APP_VERSION, updatedAt: appData.updatedAt, profile: appData.profile }, null, 2),
    "application/json"
  );
}

async function handleImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!confirm("导入 JSON 会用备份内容替换当前本机数据。确认继续吗？")) {
    event.target.value = "";
    return;
  }
  try {
    await importJSON(file);
    setStatus("data-status", "JSON 备份已导入并保存到本机。");
  } catch (error) {
    setStatus("data-status", `导入失败：${error.message || "请检查 JSON 文件"}`);
  } finally {
    event.target.value = "";
  }
}

function clearLocalData() {
  const first = confirm("确认清空当前浏览器中的 Moon Weight Log 本地数据吗？");
  if (!first) return;
  const second = confirm("再次确认：清空后页面内数据会归零，除非你已导出 JSON 备份。继续清空吗？");
  if (!second) return;
  localStorage.removeItem(STORAGE_KEY);
  appData = createDefaultData();
  resetWeightForm();
  resetMeasurementForm();
  saveData();
  setStatus("data-status", "本地数据已清空。");
}

function switchView(view) {
  const button = document.querySelector(`[data-view="${view}"]`);
  if (button) button.click();
}

function hasNumber(value) {
  return value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
}

function valueOf(id) {
  const element = document.getElementById(id);
  return element ? String(element.value || "").trim() : "";
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value ?? "";
}

function setDateValue(id, value) {
  setValue(id, value);
  updateDateDisplay(id);
}

function updateDateDisplay(id) {
  const input = document.getElementById(id);
  const display = document.getElementById(`${id}-display`);
  if (!input || !display) return;
  display.textContent = formatChineseDate(input.value) || "请选择日期";
}

function checkedValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function setRadioValue(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = input.value === value;
  });
}

function setStatus(id, message) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  window.setTimeout(() => {
    if (element.textContent === message) element.textContent = "";
  }, 4200);
}

function statItem(label, value) {
  return `<div class="stat-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function summaryMetric(label, value) {
  return `<div class="summary-metric"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function metaItem(label, value) {
  if (value === "" || value === undefined || value === null) return "";
  return `<span>${escapeHTML(label)}：${escapeHTML(value)}</span>`;
}

function noteLine(label, value) {
  if (!value) return "";
  return `<p><strong>${escapeHTML(label)}：</strong>${escapeHTML(value)}</p>`;
}

function emptyState() {
  return document.getElementById("empty-state-template").innerHTML;
}

function keywordList(items) {
  if (!items.length) return "<p>数据不足</p>";
  return `<ul class="keyword-list">${items.map((item) => `<li>${escapeHTML(item.word)} · ${item.count}</li>`).join("")}</ul>`;
}

function kgOrInsufficient(value) {
  return value === null || value === undefined ? "数据不足" : `${formatNumber(value)} kg`;
}

function scoreOrInsufficient(value) {
  return value === null || value === undefined ? "数据不足" : formatNumber(value);
}

function signedKg(value) {
  const prefix = Number(value) > 0 ? "+" : "";
  return `${prefix}${formatNumber(value)} kg`;
}

function diffText(current, previous) {
  if (!hasNumber(current) || !hasNumber(previous)) return "数据不足";
  const diff = Number(current) - Number(previous);
  const prefix = diff > 0 ? "+" : "";
  return `${prefix}${formatNumber(diff)} cm`;
}

function formatNumber(value) {
  if (!hasNumber(value)) return "";
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function formatDateTime(iso) {
  if (!iso) return "尚未保存";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
}

function formatChineseDate(date) {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return `${year}年${month}月${day}日`;
}

function parseDate(date) {
  return new Date(`${date}T00:00:00`);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.loadData = loadData;
window.saveData = saveData;
window.generateId = generateId;
window.addWeightLog = addWeightLog;
window.updateWeightLog = updateWeightLog;
window.deleteWeightLog = deleteWeightLog;
window.addMeasurement = addMeasurement;
window.updateMeasurement = updateMeasurement;
window.deleteMeasurement = deleteMeasurement;
window.updateProfile = updateProfile;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.exportCSV = exportCSV;
window.generateSummary = generateSummary;
window.calculateMovingAverage = calculateMovingAverage;
window.registerServiceWorker = registerServiceWorker;

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupForms();
  renderAll();
  registerServiceWorker();
});
