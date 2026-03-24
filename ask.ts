/**
 * Gemini Web ask command — send message and wait for response
 */
import { cli, Strategy } from '@jackwener/opencli/registry';

const GEMINI_URL = 'https://gemini.google.com/app';

const MODE_LABELS: Record<string, string> = {
  'quick': '快速',
  'think': '思考',
  'pro': 'Pro'
};

async function enableDeepResearch(page: any): Promise<void> {
  // Click 工具 button
  await page.evaluate(`
    (() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.innerText?.trim();
        if (text === '工具') {
          btn.click();
          return;
        }
      }
    })()
  `);

  // Wait for menu to open
  await page.wait(1.5);

  // Click Deep Research
  await page.evaluate(`
    (() => {
      const items = document.querySelectorAll('button, [role="menuitem"], div[role="button"]');
      for (const item of items) {
        const text = (item.innerText || '').trim();
        if (text.includes('Deep Research') && text.length < 30) {
          item.click();
          return;
        }
      }
    })()
  `);

  // Wait for Deep Research UI to load
  await page.wait(2);
}

async function selectMode(page: any, mode: string): Promise<void> {
  if (mode === 'quick') return;

  const targetMode = MODE_LABELS[mode];
  if (!targetMode) return;

  // Click mode selector
  await page.evaluate(`
    (() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.innerText?.trim();
        const aria = btn.getAttribute('aria-label') || '';
        // Mode button shows current mode name
        if ((text === '快速' || text === '思考' || text === 'Pro') &&
            (aria.includes('模式') || aria.includes('mode') || btn.className.includes('mode'))) {
          btn.click();
          return;
        }
      }
    })()
  `);

  await page.wait(1);

  // Click target mode
  const modeScript = `
    (() => {
      const items = document.querySelectorAll('[role="menuitem"], button');
      for (const item of items) {
        const text = (item.innerText || '').trim();
        if (text.includes('${targetMode}') && text.length < 30) {
          item.click();
          return;
        }
      }
    })()
  `;

  await page.evaluate(modeScript);
  await page.wait(1);
}

async function confirmResearchStart(page: any, maxWaitSec: number): Promise<boolean> {
  const maxMs = maxWaitSec * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxMs) {
    await page.wait(1);

    const clicked = await page.evaluate(`
      (() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          const text = btn.innerText?.trim();
          const aria = btn.getAttribute('aria-label') || '';

          if (text === 'Start research' || aria === 'Start research' ||
              text === '开始研究' || text === '开始') {
            btn.click();
            return true;
          }
        }
        return false;
      })()
    `);

    if (clicked) {
      return true;
    }
  }

  return false;
}

async function sendPrompt(page: any, prompt: string): Promise<boolean> {
  return page.evaluate(`
    (async () => {
      const editor = document.querySelector('rich-textarea div.ql-editor');
      if (!editor) return false;

      editor.focus();
      await new Promise(r => setTimeout(r, 200));

      // Clear and insert
      const range = document.createRange();
      range.selectNodeContents(editor);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('delete', false, null);

      await new Promise(r => setTimeout(r, 200));
      document.execCommand('insertText', false, ${JSON.stringify(prompt)});
      await new Promise(r => setTimeout(r, 600));

      // Click send
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label');
        if (label === '发送' && !btn.disabled) {
          btn.click();
          return true;
        }
      }

      // Fallback: Enter
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return true;
    })()
  `) as Promise<boolean>;
}

async function waitForResponse(page: any, timeoutMs: number, isDeepResearch: boolean): Promise<string> {
  const startTime = Date.now();
  let lastText = '';
  let stableCount = 0;
  const requiredStable = isDeepResearch ? 5 : 3;

  while (Date.now() - startTime < timeoutMs) {
    await page.wait(2);

    const result = await page.evaluate(`
      (() => {
        const stopBtn = document.querySelector('button[aria-label="停止生成"]');
        const isGenerating = !!stopBtn;

        const chatWindow = document.querySelector('chat-window');
        if (!chatWindow) return { text: '', generating: isGenerating };

        const fullText = chatWindow.innerText || '';
        const idx = fullText.indexOf('Gemini 说');

        if (idx < 0) return { text: '', generating: isGenerating };

        let response = fullText.substring(idx + 8);
        response = response
          .replace(/\\n工具[\\s\\S]*$/, '')
          .replace(/\\nGemini 是一款[\\s\\S]*$/, '')
          .replace(/\\n快速[\\s\\S]*$/, '')
          .replace(/\\n升级到[\\s\\S]*$/, '')
          .trim();

        return { text: response, generating: isGenerating };
      })()
    `);

    const text = (result?.text || '').trim();
    const isGenerating = result?.generating || false;

    if (text && text.length > 5) {
      if (text === lastText) {
        stableCount++;
        if (stableCount >= requiredStable && !isGenerating) {
          return text;
        }
      } else {
        lastText = text;
        stableCount = 0;
      }
    }
  }

  return lastText || 'Timeout: No response received.';
}

cli({
  site: 'gemini-web',
  name: 'ask',
  description: 'Ask Gemini a question and wait for response',
  domain: 'gemini.google.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    {
      name: 'prompt',
      type: 'string',
      required: true,
      positional: true,
      help: 'Question to ask Gemini'
    },
    {
      name: 'mode',
      type: 'string',
      default: 'quick',
      help: 'Response mode: quick (default), think, pro'
    },
    {
      name: 'deep-research',
      type: 'boolean',
      default: false,
      help: 'Enable Deep Research mode (can combine with --mode)'
    },
    {
      name: 'timeout',
      type: 'int',
      default: 300,
      help: 'Max seconds to wait (default: 300, deep-research: 600)'
    }
  ],
  columns: ['text'],
  func: async (page, kwargs) => {
    const prompt = kwargs.prompt as string;
    const mode = (kwargs.mode as string) || 'quick';
    const useDeepResearch = kwargs['deep-research'] as boolean;
    const defaultTimeout = useDeepResearch ? 600 : 300;
    const timeoutSec = (kwargs.timeout as number) || defaultTimeout;
    const timeoutMs = timeoutSec * 1000;

    // Navigate to Gemini
    await page.goto(GEMINI_URL);
    await page.wait(4);

    // Enable Deep Research first (if requested)
    if (useDeepResearch) {
      await enableDeepResearch(page);
    }

    // Select response mode
    if (mode !== 'quick') {
      await selectMode(page, mode);
    }

    // Send prompt
    const sent = await sendPrompt(page, prompt);
    if (!sent) {
      return [{ text: 'Error: Failed to send prompt' }];
    }

    // Deep Research: wait for and click confirmation
    if (useDeepResearch) {
      await page.wait(5);
      const confirmed = await confirmResearchStart(page, 60);
      if (!confirmed) {
        return [{ text: 'Error: Failed to find Start research button within 60s' }];
      }
    }

    await page.wait(3);

    // Wait for response
    const response = await waitForResponse(page, timeoutMs, useDeepResearch);

    return [{ text: response.substring(0, 15000) }];
  }
});
