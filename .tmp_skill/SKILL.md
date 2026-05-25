---
name: prd-to-tasks
description: 将PRD（产品需求文档）结构化拆解为可直接编码的原子级开发任务清单。Use when the user provides a PRD document (link or text) and needs it converted into actionable development tasks, splits product requirements into frontend/backend/database tasks, or wants standardized task lists for downstream development skills to consume. Make sure to use this skill whenever the user mentions "拆解需求"、"任务规划"、"PRD分析"、"需求拆分"、"需求文档"、"task breakdown"、"PRD decomposition"、"requirement split", or pastes/links a product spec and asks for a dev plan — even if they don't explicitly say "skill".
metadata:
  short-description: PRD结构化拆解为原子级开发任务清单
---

# PRD → 原子化开发任务清单

将PRD（产品需求文档）转化为下游开发技能可以直接消费的、原子级、可验证的开发任务清单。

## 何时触发

- 用户提供PRD链接/文本/截图，希望转化为开发任务
- 用户说"拆解需求"、"任务规划"、"PRD分析"、"需求拆分"、"把需求拆成开发任务"
- 用户希望产出标准化Task清单交给前端开发、后端开发、数据库设计等下游Skill

## 核心原则

1. **原子性**：每个Task应可由单一开发角色在合理时间内独立完成，输出可单独验证。
2. **可执行性**：Technical_Spec必须具体到接口、字段、组件、库选择级别，避免"实现注册功能"这类模糊表述。
3. **可消费性**：输出格式标准化，便于下游Skill（如"前端开发"、"后端开发"）按 Target_Skill 字段直接接入。
4. **可追溯性**：每个Task必须关联到上游 Story / Feature，避免开发与需求脱节。
5. **依赖显式化**：用 Dependencies 字段明确Task之间的执行先后关系，便于排期与并行。

## 工作流

### Step 1：获取并理解PRD

- 若用户提供链接：尝试读取链接内容（若工具受限，请求用户粘贴关键段落）
- 若用户提供文本/截图：完整阅读并标注疑问点
- **不要在信息缺失时硬编**：列出关键缺失项（如"未说明是否支持第三方登录"），先与用户确认或在产出中显式标注为"待澄清"

### Step 2：产出全局上下文摘要

在拆解前，先用4-6行总结：
- 核心业务价值
- 系统边界（覆盖 / 不覆盖）
- 用户角色
- 核心主流程（编号步骤）

这有助于下游Skill建立mental model，也方便用户快速校对你是否理解正确。

### Step 3：领域拆解（Epic → Feature → Story）

用树状结构展示三层拆解：
- **Epic**：业务大主题（如"用户管理"）
- **Feature**：功能模块（如"用户注册"、"邮箱验证"）
- **Story**：用户故事，采用"作为<角色>，我希望<目标>，以便<价值>"句式

### Step 4：生成原子开发任务

每个Task必须包含以下字段（顺序固定）：

| 字段 | 说明 |
|------|------|
| `Task_ID` | 类型前缀+序号，如 `DB-01`、`BE-01`、`FE-01`、`OPS-01` |
| `Target_Skill` | 目标下游技能：数据库设计 / 后端开发 / 前端开发 / 运维部署 / 测试 |
| `Story` | 关联Story编号（可多个） |
| `Context` | 1-2句说明该Task的业务上下文与目标 |
| `Technical_Spec` | 技术细节：端点、字段、组件、约束、库选择等，要具体到可直接编码 |
| `Dependencies` | 依赖的其他Task_ID，无则填"无" |
| `Acceptance_Criteria` | Given-When-Then 格式，每条独立可验证 |

### Step 5：自检

产出前对照检查：
- [ ] 每个Story至少被一个Task覆盖
- [ ] 每个Task的 Target_Skill 明确且单一
- [ ] Technical_Spec 不含"等"、"诸如"、"等等"类模糊词
- [ ] Acceptance_Criteria 用 Given/When/Then 句式且可二元判断
- [ ] Dependencies 无循环引用
- [ ] Task_ID 在文档内唯一

## 输出格式

严格遵循 [references/output_template.md](references/output_template.md) 中的模板结构。Task的字段顺序、命名（英文Key + 中文值）必须保持一致，下游Skill依赖该结构解析。

## Task_ID 命名约定

| 前缀 | 含义 |
|------|------|
| `DB-` | 数据库设计 / 迁移 |
| `BE-` | 后端服务 / API |
| `FE-` | 前端页面 / 组件 |
| `OPS-` | 部署 / CI / 监控 |
| `QA-` | 测试用例 / 自动化 |

## 注意事项

- **粒度控制**：单个Task理想耗时 0.5–2人天。过大需要继续拆分；过小可合并。
- **避免技术越界**：若PRD未指定技术栈，先询问用户或在Technical_Spec中标注"待技术评审"，不要替用户做架构决策。
- **跨端协同**：当一个Story涉及前后端，应拆为独立的BE-xx和FE-xx，通过Dependencies串联，而不是塞进一个Task。
- **非功能需求**：性能、安全、可观测性如出现在PRD，应单独成Task（如`OPS-01: 注册接口QPS 500压测`），不要隐式合并到功能Task里。
- **简化阐释**：如果PRD极简（如一句话需求），先反问澄清而非过度脑补。