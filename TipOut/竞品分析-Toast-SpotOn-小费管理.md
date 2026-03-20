# 竞品分析：Toast vs SpotOn — Tip Management（小费管理）

> 基于公开产品页、帮助文档整理，供产品设计与 PRD 对照。Toast 部分若与最新合同/报价不一致，以厂商为准。

## 参考链接

- [SpotOn Tip Management](https://www.spoton.com/solutions/tip-management/)
- [SpotOn Teamwork 知识库](https://support.dolceclock.com/help)（小费相关条目）
- [Toast — Configuring Shift Review](https://doc.toasttab.com/doc/platformguide/platformConfiguringShiftReview.html)
- [Toast Central — How Toast Handles and Distributes Tips](https://central.toasttab.com/s/article/How-Toast-Handles-and-Distributes-Tips)（若可访问）

---

## 1. 产品边界：系统如何参与小费全流程

| 维度 | Toast | SpotOn（Teamwork + DayCheck） |
|------|--------|-------------------------------|
| **在 POS 内** | 结账记录小费；班次结束可做 **Shift Review**（现金/小费核对，可选展示 **Tip Sharing** 等报告区块） | 强调与 POS **双向同步**：汇总信用卡小费、提示现金 tip-out 义务；员工可在下班流程中完成部分分摊操作 |
| **规则引擎 + 自动分账** | 独立加购 **Toast Tips Manager**；与 **Toast Payroll & Team Management** 联动较完整 | 主要在 **Teamwork** 中通过 **Tip Templates / Tip Calculator / Bundles & Pools** 执行；复杂门店常需 **Teamwork 专员**协助建模 |
| **发放** | 以同步至 Toast Payroll 为主路径 | **一键 tip out** → 对接 **工资单** 或 **DayCheck** 数字发放 |

---

## 2. 规则类型概览

### 2.1 Toast（含 Tips Manager 与生态）

1. **采集与班次展示**
   - 卡单小费随交易进入系统；现金多依赖申报与班次核对。
   - **Shift Review 报告**可配置是否包含与小费/分摊相关的区块（如 Tip Sharing），用于员工可见性。

2. **Toast Tips Manager（加购，自动化池化/分配）**
   - **时间粒度**：按天、班次、订单等维度池化（具体以产品版本为准）。
   - **数据来源**：小费、自动 gratuity、销售品类等可参与规则。
   - **岗位**：可按 job type 配置；常与工时数据结合做加权分配。
   - **Payroll**：计算结果同步进 Toast Payroll，减少手工表。

3. **第三方集成（例：Kickfin）**
   - 宣传能力包括：班次、工时、点数、销售分类等组合为自定义分摊公式，适合极复杂政策。

### 2.2 SpotOn Teamwork（知识库可核对）

1. **模板化执行（Tip Templates）**
   - 跑模板前通常需先 **核准打卡**。
   - 支持 **按 Day-Part（时段）分池**：某时段内收入先形成 **Parent Bundle（来源）**，再流入下游 **Tips Pool** 分配。

2. **池内分配字段**
   - Pool 中展示：**工时 Hours**、**Multiplier（点数/权重 Point weighting）**，以及信用卡小费 / 自动服务费 / 现金等；经理可 **覆盖工时、点数、补现金** 等（**修改 Pool 内工时不改原始打卡**）。

3. **角色与点数**
   - 知识库条目包括：角色加点数、对员工应用 Point Weight、在模板中维护角色等。

4. **员工主导分摊（半自动）**
   - **Employee Directed Tip-Out**：员工下班时按金额/比例让出小费；常见做法为两套模板组：**先跑 Source，再跑 Shared**，Shared 需勾选 **Pull in Employee Directed Tip-Outs**。
   - **Employee Direct Tips Share to a Pool**：规则按「全自动化」建模（如 Server 销售额 1.5% 给 Bar、2% 给助理），但 **仅当员工在下班时确认或修改金额才生效**；**未操作则该员工该项分出为 0**。

5. **其他能力（知识库目录）**
   - **Tips Team Share**：多人合并再分（Team Share Pool）。
   - **Equalized Tip**、**Declared Tips**、**从 tip 中剔除信用卡手续费**、与 **POS 总额对账/平衡** 等。

6. **复杂公式**
   - 官网案例提及：除角色与工时外，**司龄阶梯** 等也可由实施侧建模。

---

## 3. 分配落地流程对比

### Toast（POS + Tips Manager + Payroll 理想路径）

```
POS 采集小费 → Tips Manager 按池/维度/加权规则计算 → 同步 Payroll 发薪
```

若不购买 Tips Manager 或不用 Toast Payroll，则更多依赖 **班次核对 + 手工/表格/第三方**。

### SpotOn Teamwork

```
POS 同步 → 选择并运行 Tip Templates
→ Navigator 中查看 Bundle（来源）→ Pool（分配）
→ 经理审核与必要覆盖 → Save 直至与 POS 总额平衡（通常允许微小误差）
→ 周期末用 Tips Report 审计 → Payroll 或 DayCheck 发放
```

---

## 4. 竞品结论（PRD 对照用）

| 要点 | Toast | SpotOn |
|------|--------|--------|
| **强项** | POS 内班次与小费核对成熟；Tips Manager + 自家 Payroll 闭环 | 模板 + Bundle/Pool + 工时/点数模型清晰；员工确认式 tip-out 流程文档完整 |
| **分配维度共性** | 工时、角色、权重/点数、销售额比例 tip-out、分时段池、自动 gratuity、多支付类型 | 同上，且 Pool 层 overrides 文档明确 |
| **差异** | 深度自动化多与 **Tips Manager 加购 + Payroll** 绑定 | **DayCheck** 强调数字化发小费；复杂规则依赖实施/专员 |

---

## 5. 与自有产品（TipOut）映射建议

可将本方功能按列对齐：**Toast / SpotOn / TipOut**，维度建议包括：

- 池化维度（按日、班次、时段、订单）
- 分配依据（工时、角色、点数、销售额、固定比例）
- 员工自助（申报、确认 tip-out、改金额）
- 经理审核与 overrides
- 与 POS/工资单对账与发放路径

---

*文档生成日期：2026-03-20*
