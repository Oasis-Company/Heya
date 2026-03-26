# 预制聊天室规划：爱情修罗场 (Love Battlefield) - 高度自定义版

## 1. 场景设定
这是一个跨越文化差异的情感冲突场景：**“前任”与“现任”在同一个群聊中对峙，而“当事人”处于风暴中心。**
我们将为用户提供两个基础模板：**东方篇 (Asian Melodrama)** 和 **西方篇 (Western Drama)**，并在此基础上提供丰富的自定义选项。

---

## 2. 用户自定义选项 (Customization Options)
在生成场景前，用户可以调整以下参数：

### A. 角色信息 (Character Info)
*   **姓名修改**：用户可以自定义“前任”、“现任”和“当事人”的姓名。
*   **角色性别**：支持自定义三方的性别组合（如：男-女-男，女-女-女等）。

### B. 冲突强度 (Drama Intensity)
*   **温和 (Mild)**：理智沟通，试图解决问题。
*   **激烈 (Heated)**：言语犀利，充满火药味。
*   **毒性 (Toxic)**：极度偏执，互相揭短，修罗场全开。

### C. 核心矛盾 (Core Conflict)
用户可以选择本次对峙的导火索：
*   **旧情复燃**：前任试图挽回，现任极力阻止。
*   **秘密曝光**：当事人隐藏的过去被意外揭开。
*   **金钱纠纷**：分手时的财务问题未清，现任介入。
*   **孩子/宠物**：因为共同抚养的对象产生的交集。

### D. 场景地点 (Setting)
*   **临时群聊**：最直接的线上对峙。
*   **线下聚会**：在朋友婚礼或聚餐上的意外相遇。
*   **深夜电话**：三方连线的尴尬时刻。

---

## 3. 角色配置逻辑 (Dynamic Agent Generation)

### 基础指令模板 (Base Prompt)
AI 的指令将根据用户选择动态生成：
`You are {Name}, the {Role}. The current intensity is {Intensity}. The core conflict is {Conflict}. Your goal is to {Goal}.`

---

## 4. 技术实现方案

### 步骤 A：UI 交互设计
1.  在 `ChatList` 侧边栏增加 **“Explore Scenarios”** 按钮。
2.  点击后弹出 **“Scenario Customizer”** 模态框。
3.  模态框包含：模板选择、姓名输入、强度滑块、矛盾下拉框。

### 步骤 B：动态生成函数
实现 `generateCustomScenario(config)` 函数：
1.  根据 `config` 拼接 3 个 Agent 的 `systemInstruction`。
2.  在 Firestore 中创建 3 个临时 Agent。
3.  创建一个 Session，关联这些 Agent。
4.  根据 `config.conflict` 生成第一条符合语境的开场白。

### 步骤 C：清理机制
预制场景生成的 Agent 可以标记为 `isTemplate: true`，方便用户后续批量清理或隐藏。

---
**请确认这个高度自定义版本，确认后我将开始编写代码实现。**
