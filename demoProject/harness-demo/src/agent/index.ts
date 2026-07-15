import { Agent } from '../harness/types';

export class SimpleMathAgent implements Agent {
  name = 'SimpleMathAgent (Mock)';

  async run(input: string, context?: any): Promise<string> {
    // 模拟网络请求或 LLM 生成的延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    // 这里实现一个简单的逻辑：如果输入包含某些关键字，返回特定结果
    // 在真实场景中，这里会调用大语言模型 (如 OpenAI) 的接口
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('1+1') || lowerInput.includes('1 + 1')) {
      return '1+1等于2';
    }
    
    if (lowerInput.includes('前端框架')) {
      return '常见的前端框架包括 React, Vue 和 Angular。';
    }
    
    if (lowerInput.includes('harness')) {
      return 'Harness 是一种用于自动化测试和评估程序的工具集。';
    }

    return '抱歉，我不知道怎么回答这个问题。';
  }
}
