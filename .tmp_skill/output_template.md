# PRD拆解输出模板

下游开发Skill依赖该结构解析。务必保持各Section标题、Task字段Key与顺序一致。

---

## 一、全局上下文摘要

- **核心业务价值**：<一句话描述>
- **系统边界**：覆盖<...>；不覆盖<...>
- **用户角色**：<角色A>、<角色B>
- **核心主流程**：
  1. <步骤1>
  2. <步骤2>
  3. <步骤3>

## 二、领域拆解

```
Epic: <业务大主题>
├── Feature: <功能模块A>
│   ├── Story-1: 作为<角色>，我希望<目标>，以便<价值>
│   └── Story-2: ...
└── Feature: <功能模块B>
    └── Story-3: ...
```

## 三、开发任务清单

### Task_ID: DB-01
- **Target_Skill**: 数据库设计
- **Story**: Story-1, Story-2
- **Context**: <1-2句业务上下文与目标>
- **Technical_Spec**:
  - 表名：`<table_name>`
  - 字段：`<field>` (<TYPE>, <constraints>), ...
  - 索引：<索引说明>
  - 约束：<约束说明>
- **Dependencies**: 无
- **Acceptance_Criteria**:
  - Given <前置条件> When <动作> Then <可验证结果>
  - Given <...> When <...> Then <...>

### Task_ID: BE-01
- **Target_Skill**: 后端开发
- **Story**: Story-1
- **Context**: <...>
- **Technical_Spec**:
  - 端点：`<METHOD> /api/v1/...`
  - Request Body: `{ ... }`
  - Response 2xx: `{ ... }`
  - Response 4xx: <错误码与场景>
  - 关键约束：<密码哈希算法 / 限流策略 / 幂等等>
- **Dependencies**: DB-01
- **Acceptance_Criteria**:
  - Given <...> When <...> Then <...>

### Task_ID: FE-01
- **Target_Skill**: 前端开发
- **Story**: Story-1
- **Context**: <...>
- **Technical_Spec**:
  - 路由：`/<path>`
  - 组件：<UI库 + 关键组件清单>
  - 表单字段：<字段清单 + 校验规则>
  - 交互：<关键交互逻辑>
  - 状态管理：<方案>
- **Dependencies**: BE-01
- **Acceptance_Criteria**:
  - Given <...> When <...> Then <...>

### Task_ID: OPS-01 (可选)
- **Target_Skill**: 运维部署
- **Story**: <关联Story>
- **Context**: <部署/监控/性能上下文>
- **Technical_Spec**:
  - <CI/CD步骤、监控指标、告警阈值、压测目标等>
- **Dependencies**: <...>
- **Acceptance_Criteria**:
  - Given <...> When <...> Then <...>

---

## 四、待澄清问题（可选）

若PRD存在歧义或缺失，列在此处供用户回答后补全Task：

1. <问题1：例如"是否支持第三方OAuth登录？"。影响Task：BE-01>
2. <问题2>