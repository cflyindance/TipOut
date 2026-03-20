# TipOut 小费分配系统 - PRD 修改说明

本文档记录基于 PRD 产品需求文档的各类修改与实现说明。

---

## 一、规则相关（rules.html / ruleData.js）

### 1.1 默认无规则

**需求**：rules.html 页面默认没有规则，只有新增规则后才会展示。

**改动说明**：
- **ruleData.js**：`getRules()` 在 localStorage 为空或解析失败时返回 `[]`，不再使用默认规则
- **rules.html**：无规则时在表格中显示「暂无规则，请点击「新增规则」创建」
- 门店筛选改为根据当前规则动态生成（与 index、detail 一致）

---











## 二、门店与默认数据

### 2.1 默认门店（解决「没有数据」无法分配问题）

**需求**：无规则时，小费分配页面门店下拉为空，无法进行分配操作。

**改动说明**：
- **index.html**：增加 `defaultStores`，无规则时门店下拉仍显示 3 个默认门店
- **detail.html**：同样增加 `defaultStores`，保证明细页门店选择可用
- **rules.html**：门店筛选下拉无规则时使用默认门店

**默认门店列表**：
1. Golden Dragon Chinese Kitchen - Dallas, TX 75231
2. Sakura Sushi & Ramen House - Dallas, TX 75247
3. El Fuego Tex-Mex Grill - Plano, TX 75074

**说明**：无规则时点击「分配小费」会提示「请先创建小费分配规则」并跳转到规则页，用户需先创建规则后再分配。

---







## 三、规则新增/编辑（rule-add.html）

### 小费池规则补充：订单需包含商品（按类/菜筛选）

**场景**：仅当订单包含指定**商品**（按菜单的类、菜结构筛选）时，该订单的小费才进入小费池。

**示例**（Server 角色）：若设置「订单需包含商品」为 类=酒水：
- 1 号单：小费 50，订单中不包含任何酒水类商品 → **不计入小费池**
- 2 号单：小费 100，订单中包含至少一个酒水类商品 → **计入小费池**
- 小费池 = 100；若 5% 给 Bartender，则 Bartender = 5

**实现说明**：
- 在 **小费** 取值条件中，条件类型为「**订单需包含商品**」；按菜单**类 + 菜**结构展示筛选。
- **类**：多选（酒水、前菜、主菜、甜品、饮料等）。
- **菜**：多选，选项随已选「类」联动（先选类，再选该类下的菜）。
- 规则保存后，小费池计算时仅统计「订单中包含所选类/菜中至少一项」的订单上的小费。
- **rule-add.html**：小费条件菜单为「订单需包含商品」；收集、回填、展示、校验均支持 `containsProduct: { category: [], item: [] }`。
- **detail.html**：公式/取值条件展示「订单需包含商品: 类: xxx；菜: xxx」。
- 数据：`tipsConditions.containsProduct` 为 `{ category: string[], item: string[] }`；旧版 `containsAlcohol` 已废弃，加载时忽略。

---

已按你的需求在 **rule-add.html** 里为「销售额 / 小费 / 加收服务费」取值条件中的**角色条件**下的员工多选增加了**全选**能力，修改总结如下。

### 1. 新增 `syncRoleEmployeeSelectAllState(employeeMs)`
- 根据当前员工勾选情况更新「全选」复选框状态：
  - 全部勾选 → 全选为勾选
  - 部分勾选 → 全选为半选（`indeterminate`）
  - 未勾选 → 全选为未勾选

### 2. 修改 `updateRoleConditionEmployeeOptions`
- 在有员工列表时，在列表**最上方**增加一行「全选」：
  - HTML：`<label class="multi-select-option role-employee-select-all"><input type="checkbox" class="role-employee-select-all-cb"> 全选</label>`
- 构建完下拉后调用 `syncRoleEmployeeSelectAllState(employeeMs)`，保证回填或初次打开时全选状态正确。

### 3. 在 document 的 `change` 里处理全选与联动
- **勾选/取消「全选」**：  
  若事件来自 `.role-employee-select-all-cb`，则把该角色条件下**所有员工**复选框与「全选」一致，并调用 `refreshMultiTags(employeeMs.id)` 更新标签显示。
- **勾选/取消单个员工**：  
  若事件来自 `.role-employee-select` 内的员工复选框（且不是「全选」），则调用 `syncRoleEmployeeSelectAllState(employeeMs)`，使「全选」的勾选/半选状态与当前员工选择一致。

### 4. 在三个 set*ConditionValue 中同步全选状态
- 在 `setSalesConditionValue`、`setTipsConditionValue`、`setSurchargeConditionValue` 中，对 type `'role'` 在设置完员工勾选后调用 `syncRoleEmployeeSelectAllState(employeeMs)`，这样在编辑已有规则回填员工时，「全选」会正确显示为勾选或半选。

效果是：在销售额、小费、加收服务费的角色条件里，员工列表顶部有「全选」；勾选全选即选中当前角色下全部员工，取消全选即清空；单独勾选/取消员工时，全选会随之变为全选/半选/未选。




已在 **rule-add.html** 的接收方规则中，在每条“角色条件”下方展示该行设置的员工小费权重，并完成保存与回填，修改总结如下。

### 1. 行内展示区域
- 在 **addReceiverRow** 里，每个接收方行的第一列（角色列）中，在角色多选下方增加：
  - `<div class="receiver-row-weights" style="..."></div>`
- 该区域用于显示当前行已设置的“员工小费权重”文案。

### 2. 展示逻辑 `renderReceiverRowWeights(tr)`
- 从当前行的 `tr.dataset.employeeWeights`（JSON）读取权重数据。
- 格式为：`{ "角色名": { "员工名": 权重数值 }, ... }`。
- 渲染为：**员工小费权重: 角色A: 员工1 1.0, 员工2 2.0；角色B: …**
- 无权重时该区域为空（不显示）。

### 3. 保存与回填
- **saveWeight()**：从权重弹窗表格中按行读取“角色、员工、权重”，组装成上述对象，写入对应接收方行的 `tr.dataset.employeeWeights`，并调用 `renderReceiverRowWeights(tr)` 更新该行下方的展示。
- **openWeightModalForRow**：打开弹窗时若该行已有 `employeeWeights`，则用其预填弹窗中的权重输入框；否则默认 1.0。
- **collectFormData**：收集接收方时，每条接收方除 `roles`、`pct` 外增加 `employeeWeights`（从该行 `tr.dataset.employeeWeights` 解析）。
- **loadRule**：加载规则时，对每条接收方设置完角色和占比后，把 `rec.employeeWeights` 写回该行的 `dataset` 并调用 `renderReceiverRowWeights(rows[idx])`，实现编辑时权重回填并在行下展示。

### 4. 数据结构
- 每条接收方：`{ roles: [], pct: number, employeeWeights?: { [角色名]: { [员工名]: number } } }`
- 未设置过权重的行不写 `employeeWeights` 或传空对象，行下不显示权重文案。

效果：在接收方规则表格中，每个“角色条件”行下方会显示该行已设置的员工小费权重（按“角色: 员工 权重”汇总）；保存规则会带上权重，再次编辑时会回填并在行下正确展示。





已按“接收方规则里，已被其他行选中的角色不再展示”的需求改好了，修改如下。

### 1. 接收方角色多选增加标识
- 在 **addReceiverRow** 里，给角色多选容器加上 class **receiver-role-select**，便于统一处理“接收方角色”下拉。

### 2. 获取“其他行已选角色”
- **getReceiverRolesSelectedInOtherRows(excludeRow)**  
  - 遍历 `#receiverTableBody` 下除 `excludeRow` 外的每一行；  
  - 在每个 `.receiver-role-select` 里取当前勾选的角色（checkbox:checked）；  
  - 汇总成数组返回（即“已被其他规则选中的角色”）。

### 3. 按“已选角色”更新所有行的下拉
- **updateAllReceiverRoleOptions()**  
  - 对每一行：用 **getReceiverRolesSelectedInOtherRows(当前行)** 得到“其他行已选角色”；  
  - 在该行的角色下拉里，对每个选项：若角色在“其他行已选”中，则 **label.style.display = 'none'**（不展示）；否则恢复显示。  
  - 当前行自己已选的角色不会算在“其他行”里，所以本行已选角色仍会显示且保持勾选。

### 4. 触发时机
- **选择变化**：在 document 的 `change` 里，若事件来自 `.receiver-role-select`，在 **updateReceiverRowWeightBtn** 之后调用 **updateAllReceiverRoleOptions()**。  
- **删除行**：删除按钮的 onclick 在 `remove(); calcTotal();` 之后增加 **updateAllReceiverRoleOptions();**。  
- **加载规则**：在 **loadRule** 里，对接收方表格填充完毕并执行完 `updateReceiverRowWeightBtn` 后，再调用 **updateAllReceiverRoleOptions()**。  
- **新增行**：**addReceiverRow** 在 append 行之后调用 **updateAllReceiverRoleOptions()**。

效果：某个角色只要被某一接收方行选中，在其他行的角色下拉里该角色会被隐藏；取消选择或删除该行后，其他行会重新显示该角色。





### 1. 默认展示「营业额类型」
- 在 **loadSalesConditionsForRule(ruleId)** 中，在按 `poolRuleConditions[ruleId]` 加载完各条件后，增加：
  - 若当前还没有「营业额类型」条件（`!existingSalesConditions['revenueType']`），则调用 **addSalesCondition('revenueType', true)** 自动加上该条件；
  - 若已有保存值（`cond.revenueType`），则再调用 **setSalesConditionValue('revenueType', cond.revenueType)** 回填。
- 这样只要打开销售额的取值条件（新建规则或编辑已有规则），都会默认出现「营业额类型」一条。

### 2. 「营业额类型」不可删除
- **addSalesCondition**：当 `type === 'revenueType'` 时，不再渲染卡片头部的删除按钮（`deleteBtn` 设为 `''`），只保留标题「营业额类型」。
- **removeSalesCondition**：在函数开头增加 `if (type === 'revenueType') return;`，即使被调用也不会执行删除逻辑。

效果：小费池计算规则里，销售额的取值条件会默认带一条「营业额类型」，且该条不显示删除按钮、也无法被删除。




### 修改说明

在 **rule-add.html** 中，把销售额、小费、加收服务费三个「新增条件」下拉的更新逻辑，从「已添加的选项加 `disabled`」改为「已添加的选项直接不展示」：

- **updateSalesConditionMenu()**：已添加的销售额条件类型改为 `item.style.display = existingSalesConditions[t] ? 'none' : ''`，不再用 `classList.toggle('disabled', ...)`。
- **updateTipsConditionMenu()**：小费条件同理，已添加的类型 `display: none`。
- **updateSurchargeConditionMenu()**：加收服务费条件同理，已添加的类型 `display: none`。

效果：在取值条件里每新增一条条件后，该条件类型会从「新增条件」下拉里消失；删除该条件卡片后，对应类型会重新出现在下拉里。



### 3.1 扣除方规则 - 默认不展示

**需求**：默认扣除方规则不展示，只有当小费池计算规则中新增选项是「销售额」时，才展示扣除方。

**改动说明**：
- 为扣除方规则区块增加 `id="deductRulesSection"`，默认 `display:none`
- 新增 `updateDeductRulesVisibility()`：
  - 当 `existingRules.sales === true`（已添加销售额）时显示扣除方规则
  - 否则隐藏
- 触发时机：添加池规则（销售额）时显示；删除销售额时隐藏；编辑规则时若含销售额则显示

### 3.2 扣除方角色 - 非必选

**需求**：扣除方规则中，扣除方角色处理为非必选。

**改动说明**：已移除提交时对「扣除方角色」必选的校验，可以不选择任何扣除方角色也能保存规则。

### 3.3 销售额取值条件 - 菜单条件

**需求**：菜单条件支持多选。

**改动说明**：
- 产品线（POS、eMenu、Kiosklite、OO、SDI、POSGo）为多选
- 类名为多选
- 数据结构：`{ productLine: [], category: [] }`（均为数组）

### 3.4 销售额取值条件 - 角色条件

**改动说明**：解决 drawer 内多选下拉被遮挡问题（condition-card、drawer-body 设置 overflow: visible 等）。

### 3.5 自定义小费 - 金额与占比

**需求**：自定义小费支持同时输入金额和占比。

**改动说明**：
- **rule-add.html - 自定义小费卡片**
  - 金额：数字输入框，单位 $（美元）
  - 占比：数字输入框，默认 100%
  - 计算公式：小费池贡献 = 金额 × 占比%
- **数据结构**：`{ type: 'custom', amount: 金额, pct: 占比 }`
- **detail.html 计算逻辑**：贡献 = `pr.amount × pr.pct / 100`
- 例：金额 200、占比 100% → 200；金额 500、占比 50% → 250

### 3.7 取值条件 - 必填与展示

**需求**：设置取值条件的规则后，对应规则下展示取值条件；取值条件为必选。

**改动说明**：
- 销售额、小费、加收服务费规则卡片下方新增取值条件展示区域
- 保存取值条件后，在该规则下显示已配置的条件摘要（如：角色: Server | 订单区域: Main Dining）
- 未设置时显示「未设置」
- **必填校验**：提交规则时，若存在未设置取值条件的销售额/小费/加收服务费规则，则提示「请为「xxx」设置取值条件（必填）」并阻止提交

### 3.10 接收方规则 - 小费池规则字段移除

**需求**：接收方规则去掉「小费池规则」字段；接收方小费分配来源于小费池计算规则中设置的组合条件。

**改动说明**：
- **rule-add.html**：接收方表移除「小费池规则」列，仅保留角色、占比百分比
- **receivers 数据结构**：`{ roles, pct }`，不再包含 poolRuleId
- **detail.html**：接收方从**小费池总额**（所有 pool 规则组合后的总和）按占比分配，明细表移除「小费池规则」列

### 3.10b 多规则销售额（历史说明）

**说明**：销售额/小费/加收服务费支持多次添加，每规则有独立取值条件；接收方统一从小费池总额分配，不按单条规则区分。

### 3.9 加收服务费 - 小费池计算规则

**需求**：小费池计算规则新增选项中，新增「加收服务费」，取值条件包含现金加收和信用卡加收服务费。

**改动说明**：
- **新增选项**：在「新增选项」下拉中增加「加收服务费」
- **取值条件**：点击「设置取值条件」打开抽屉，可选择：
  - 现金加收
  - 信用卡加收服务费
- **多选**：两种类型可多选，用于确定加收服务费池的数据来源
- **数据结构**：`surchargeConditions: { types: ['现金加收', '信用卡加收服务费'] }`
- **detail.html**：公式展示与计算支持加收服务费类型



已完成修改，小费池计算规则中的每个新增选项现在包含：

## 1. 选项类型标签（选项标签）

每个规则卡片会显示对应类型的彩色标签，例如：
- **销售额**：绿色
- **小费**：蓝色
- **加收服务费**：橙色
- **手动上报小费**：紫色
- **自定义小费**：灰色

## 2. 可编辑的选项标题

- 所有类型的规则都支持自定义标题
- 标题通过规则名称输入框编辑
- 修改标题后，接收方规则中的「小费池规则」下拉会自动更新

## 3. 展示布局

每个规则卡片头部大致为：

`① [销售额] 规则名称输入框 ... 占比 ... 设置取值条件 ×`

其中 `①` 为序号，`[销售额]` 为类型标签，后面是可编辑的规则名称输入框。



### 3.10 接收方规则 - 员工小费权重

**需求**：只有选择了角色，才可以设置员工/小费权重；小费权重中的角色对应的员工取选择的角色中的员工。

**改动说明**：
- 「设置员工小费权重」链接在未选择角色时为禁用（灰色、不可点击）
- 选择至少一个角色后变为可点击
- 权重弹窗只展示该接收方行中**所选角色**对应的员工
- 新增 `roleEmployees`，映射角色到员工（Server、Bartender、Busser、Cashier、Host、Runner、Shift Lead、Assistant Manager 等）
- 角色多选变更时，会刷新权重链接可用/禁用状态

---



## 四、小费分配主页面（index.html）

### 4.1 门店联动

**改动说明**：index 与 detail 使用相同门店来源（规则聚合 + 无规则时 defaultStores）。

### 4.2 点击已分配日期跳转明细

**需求**：小费分配页面，点击已分配状态的日期，进入对应日期的小费分配明细页面。

**改动说明**：
- 在 `selectDay` 中，当日期为已分配（`data-pending="0"`）时，跳转到明细页
- 跳转地址：`detail.html?date=YYYY-MM-DD&store=门店值`
- **detail.html**：新增 `applyUrlParams()`，从 URL 读取 `date` 和 `store`，页面加载时自动设置

**使用说明**：选择门店和日期范围 → 点击「分配小费」→ 点击任一「已分配」日期标签 → 跳转到明细页并自动填入日期和门店。

### 4.3 角色与员工筛选 - 多选与联动

**改动说明**：
- 角色下拉改为多选
- 员工下拉改为多选
- 员工选项随所选角色变化（角色-员工联动）
- 分配结果按所选角色和员工进行筛选




已完成修改，角色筛选与员工筛选已联动。

**本次改动：**

1. **角色 / 员工筛选控件**
   - 角色下拉增加 `id="roleFilter"` 和 `onchange="updateEmployeeFilter()"`
   - 员工下拉增加 `id="employeeFilter"`，选项由脚本动态填充

2. **`updateEmployeeFilter()`**
   - 根据当前选中的角色更新员工下拉
   - 未选角色（All Role）或为空：展示全部员工
   - 选中某一角色（如 Server、Bartender）：只展示该角色下的员工
   - 切换角色时清空员工选择并重新渲染分配结果

3. **`getFilteredEmployees()`**
   - 根据角色和员工筛选条件过滤待展示员工
   - 分配结果区域按筛选结果显示

4. **初始化**
   - 页面加载时调用 `updateEmployeeFilter()`，先填充员工选项（默认显示全部）

**示例：** 选择角色「Server」后，员工筛选仅显示 Maria Garcia、Jason Chen、Emily Watson、Diego Ramirez；选择「Bartender」则仅显示 Mike Johnson、Sarah Kim。




修改已完成，角色和员工筛选都已支持多选。

**改动说明：**

1. **多选组件**
   - 角色、员工由普通 `<select>` 改为带复选框的多选下拉，样式与 rule-add 页面一致  
   - 选中项以标签形式展示，可点击标签上的 × 取消选择

2. **角色多选**
   - 可多选：Assistant Manager、Bartender、Busser、Cashier、Driver、Host、Manager、Runner、Server、Shift Lead

3. **员工多选（与角色联动）**
   - 未选角色时：显示全部员工  
   - 选择若干角色时：只显示这些角色下的员工，可多选员工  
   - 切换角色时：保留仍在新列表中的已选员工

4. **筛选结果**
   - 分配结果按所选角色和员工的并集进行筛选  
   - 未选时展示全部；选了角色则按角色过滤；选了员工则按员工过滤；两者都选时取交集

5. **交互**
   - 点击输入框展开下拉，点击外部收起  
   - 勾选或取消勾选会即时刷新标签与分配结果






已完成修改，角色和员工筛选均支持全选。

**改动说明：**

1. **全选选项**
   - 在角色和员工下拉顶部增加「全选」复选框，与具体选项用分隔线区分

2. **全选逻辑**
   - 勾选「全选」：勾选当前下拉中所有角色/员工
   - 取消「全选」：取消所有已选角色/员工

3. **状态同步**
   - 当所有选项都被手动勾选时，「全选」会自动勾选
   - 当任一选项被取消时，「全选」会自动取消

4. **员工全选**
   - 员工全选针对当前可见列表（受角色筛选影响）
   - 未选角色时：全选 = 所有员工
   - 选择部分角色时：全选 = 这些角色下的员工




---

















## 五、小费分配明细（detail.html）

### 5.1 公式与分配明细数据来源

**改动说明**：公式与分配明细数据从规则中动态获取（poolRules、receivers）。

### 5.2 公式可编辑

**改动说明**：销售额、小费、手动上报、自定义小费及占比均可编辑。

### 5.3 公式布局与详情按钮

**改动说明**：
- 公式布局：标题在上、输入框在下
- 公式详情按钮：与公式同一行、靠右

### 5.4 门店选择与 URL 回填

**改动说明**：根据 URL 参数回填门店，支持从 index 页跳转时自动填入。

---

## 六、数据结构要点

| 数据/字段 | 说明 |
|----------|------|
| **规则** | `id`, `ruleName`, `store`, `poolRules`, `deductRoles`, `receivers`, `distribution`, `clockin`, `salesConditions`, `tipsConditions` |
| **poolRules** | 支持 `{ type: 'custom', amount: 金额, pct: 占比 }` |
| **menu 条件** | `{ productLine: [], category: [] }`（均为数组） |

---

## 七、跨页流程说明

1. **首次使用**：规则列表为空 → 点击「新增规则」创建 → 规则保存后出现在列表
2. **小费分配**：选择门店（有规则时从规则聚合，无规则时用默认门店）→ 选择日期范围 → 点击「分配小费」（无规则会跳转规则页）
3. **查看明细**：在小费分配页点击已分配日期 → 跳转 detail.html 并自动填入日期、门店

---

*文档持续更新，记录所有基于 PRD 的实现与调整。*
