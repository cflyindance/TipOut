# KOI Palace Payroll 报表需求分析

基于《KOI palace payroll报表需求》及样例 CSV（EmployeesPayroll Detail、ADP PAYROLL REPORT、Manage Payroll）整理。**本文为需求与场景分析，非实现说明。**

---

## 1. 业务背景与目标

- **主体**：KOI Palace（餐饮场景可从 tip、service charge、加州休息/用餐声明等推断）。
- **报税节奏**：**每两周一次**，一年约 **26 期 payroll**；报表主要服务于 **ADP 报税**。
- **成功标准（文档隐含）**：能在系统里按「期 → 员工」查看并调整考勤与薪酬相关字段，再导出/同步成 **员工签字版明细** 和 **ADP 格式报表**，且关键字段可手工覆盖系统计算结果。

---

## 2. 三模块数据流（文档定义的主线）

| 模块 | 作用 |
|------|------|
| **Manage Payroll** | 每期、每员工的考勤与薪酬输入层：多周时间段、In/Out、Regular/OT/OT2、汇总工时/金额；下方还有 Rate、SVCW、Tips、扣款等 **约 13 列可手工改** |
| **EmployeesPayroll Detail** | 给员工看的「考勤+金额」明细 + **结尾必须有的签字声明**（含 service charge、tips 等表述） |
| **ADP PAYROLL REPORT** | 与 **客户 ADP 报税文件格式一致** 的导出；`paycheck date` = **batch ID 的日期** |

**样例文件对应**：`Manage Payroll - Sheet1.csv`、`EmployeesPayroll Detail - Sheet1.csv`、`ADP PAYROLL REPORT - Sheet1.csv`；文档中还引用 `EPIX0L0126.csv` 作为 ADP 数据示例。

文档中的顺序是：**Manage Payroll 确认 → 同步到 EmployeesPayroll Detail → 再同步到 ADP PAYROLL REPORT**。

---

## 3. 典型使用场景

### 场景 A — 薪酬/报税专员（每期例行）

1. 打开某一 **payroll 期**（26 期之一），按 **员工筛选**。
2. 查看 **两周内考勤**（含加班段），必要时 **改 In/Out** 以修正考勤。
3. 确认或修改 **薪资、service charge、tips**（文档明确：可与实际不一致时 **手工改**；Manage Payroll 样例要求 **service charge / tips 可手动输入修正**）。
4. 将本期数据 **确认**，为下游报表做准备。

### 场景 B — 面向员工的纸质/签字流程

1. 在 **EmployeesPayroll Detail** 中按员工筛选。
2. **打印**单人考勤明细；使用文档要求的 **签字声明**（加州休息/用餐等表述为 **必要**）。
3. 薪资行以 **系统自动算出的考勤薪资**，或 **手工改过的数据** 为准。

### 场景 C — ADP 报税导出

1. 前两步完成后，数据进入 **ADP PAYROLL REPORT**。
2. 字段需与客户 **ADP 模板一致**（样例中有 CO CODE、BATCH ID、FILE#、Rate、Reg Hours、加班代码与金额、信用卡小费 CCT、service charge SVC 等）。
3. **员工 ID**：需与 ADP 一致；文档提到是否可在 **员工管理备注里存 ID** 以便匹配（产品待决）。

---

## 4. 样例 CSV 与字段意图（对照实现）

- **Manage Payroll**：按 **自然周区间** 拆行（多段 Date / In/Out），列含 Meal、Regular/OT/OT2 合计，以及 Pay Period 层面的 Hours/Amount；底部宽表含 **SVCW、Tips** 等，并注明 **13 列需可编辑**。
- **EmployeesPayroll Detail**：用 **regular / OT / OT2** 的 hours 与 amount 两套行结构，底部 **认证语句** 中写明：service charge 来自 **manage payroll**，tips 来自 **manage payroll**。
- **ADP**：固定 **CO CODE = X0L**，**BATCH ID** 对应发薪日，**FILE#** 为员工编号；**OHR** 与加班相关；**CCT** 与信用卡小费；**SVC** 与 service charge（来源 Manage Payroll）。

---

## 5. 文档明确列出的限制与待补齐能力

### 当前本地报表无法支持

1. 业务顺序是 **先做 tipout，再做 payroll**；本地 **拿不到 tipout 分配后的 service charge & tips**，只能接受这一缺口或改流程/接系统。
2. **没有加班计算逻辑**（若要做 OT/OT2，需在系统里补规则或与人工填报分工清楚）。

### 当前没有但需要支持

- 在 **Manage Payroll** 里通过 **In/Out 直接改考勤**。
- **service charge、tips** 等支持 **手工录入与修正**。

---

## 6. 产品/技术后续建议（简要）

- **目的**：双周 ADP 合规报税 + 店内考勤薪酬一致 + 员工签字凭证。
- **约束**：tipout 数据链断裂、加班规则缺失，会直接影响「自动算薪」的可信度，更依赖 **手工覆盖** 与 **流程顺序** 说明。
- **成功标准**：三期报表字段对齐、日期/批次一致、签字页必备、ADP 列与客户模板一致。

若进入方案阶段，可对比多种做法（例如：仅人工维护 OT vs 规则引擎、tipout 接口 vs 手工表导入），再定设计与实现范围。

**待澄清优先级（可选）**：先解决 **加班逻辑** 还是 **tipout 与 SVC/Tips 的数据对接**，将影响迭代顺序。

---

## 参考文件

- `c:\Users\27273\Downloads\KOI palace payroll报表需求.docx`
- `c:\Users\27273\Downloads\EmployeesPayroll Detail - Sheet1.csv`
- `c:\Users\27273\Downloads\ADP PAYROLL REPORT - Sheet1.csv`
- `c:\Users\27273\Downloads\Manage Payroll - Sheet1.csv`
