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

async function selectMode(page: any, mode: string): Promise<void> {
  if (mode === 'quick') return;

  const targetMode = MODE_LABELS[mode];
  if (!targetMode) return;

  await page.evaluate(`
    (async () => {
      const modeBtn = document.querySelector('button[aria-label*="模式"]');
      if (!modeBtn) return;

      modeBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const items = document.querySelectorAll('[role="menuitem"], button');
      for (const item of items) {
        const text = (item.innerText || '').trim();
        if (text.includes('${targetMode}') && text.length < 50) {
          item.click();
          break;
        }
      }
    })()
  `);

  await page.wait(0.8);
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

async function waitForResponse(page: any, timeoutMs: number): Promise<string> {
  const startTime = Date.now();
  let lastText = '';
  let stableCount = 0;

  while (Date.now() - startTime < timeoutMs) {
    await page.wait(2);

    const result = await page.evaluate(`
      (() => {
        // Check if still generating
        const stopBtn = document.querySelector('button[aria-label="停止生成"]');
        const isGenerating = !!stopBtn;

        // Get chat content
        const chatWindow = document.querySelector('chat-window');
        if (!chatWindow) return { text: '', generating: isGenerating };

        const fullText = chatWindow.innerText || '';
        const idx = fullText.indexOf('Gemini 说');

        if (idx < 0) return { text: '', generating: isGenerating };

        let response = fullText.substring(idx + 8);

        // Remove UI noise
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
        if (stableCount >= 3 && !isGenerating) {
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
      help: 'Response mode: quick (快速), think (思考), pro (Pro)'
    },
    {
      name: 'timeout',
      type: 'int',
      default: 300,
      help: 'Max seconds to wait for response (default: 300)'
    }
  ],
  columns: ['text'],
  func: async (page, kwargs) => {
    const prompt = kwargs.prompt as string;
    const mode = (kwargs.mode as string) || 'quick';
    const timeoutSec = (kwargs.timeout as number) || 300;
    const timeoutMs = timeoutSec * 1000;

    // Navigate to Gemini
    await page.goto(GEMINI_URL);
    await page.wait(3);

    // Select mode
    await selectMode(page, mode);

    // Send prompt
    const sent = await sendPrompt(page, prompt);
    if (!sent) {
      return [{ text: 'Error: Failed to send prompt' }];
    }

    await page.wait(3);

    // Wait for response
    const response = await waitForResponse(page, timeoutMs);

    return [{ text: response.substring(0, 10000) }];
  }
});
