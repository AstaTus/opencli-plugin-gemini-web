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

// Utility: wait for condition in page context
const waitForInPage = (condition: string, timeoutMs: number = 5000) => `
  (async () => {
    const startTime = Date.now();
    while (Date.now() - startTime < ${timeoutMs}) {
      const result = ${condition};
      if (result) return result;
      await new Promise(r => setTimeout(r, 200));
    }
    return null;
  })()
`;

async function enableDeepResearch(page: any): Promise<boolean> {
  const result = await page.evaluate(`
    (async () => {
      const timeout = 10000;
      const startTime = Date.now();

      // Step 1: Find and click 工具 button
      let toolsBtn = null;
      while (Date.now() - startTime < timeout) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.innerText?.trim() === '工具') {
            toolsBtn = btn;
            break;
          }
        }
        if (toolsBtn) break;
        await new Promise(r => setTimeout(r, 200));
      }

      if (!toolsBtn) return { success: false, error: '工具 button not found' };
      toolsBtn.click();

      // Step 2: Wait for menu and find Deep Research
      await new Promise(r => setTimeout(r, 300));

      let drItem = null;
      const menuStart = Date.now();
      while (Date.now() - menuStart < 5000) {
        const items = document.querySelectorAll('button, [role="menuitem"], div[role="button"]');
        for (const item of items) {
          const text = (item.innerText || '').trim();
          // Deep Research button contains these keywords
          if (text.includes('Deep Research') && text.length < 50 && item.offsetParent !== null) {
            drItem = item;
            break;
          }
        }
        if (drItem) break;
        await new Promise(r => setTimeout(r, 200));
      }

      if (!drItem) return { success: false, error: 'Deep Research item not found' };
      drItem.click();

      // Step 3: Verify Deep Research is enabled
      await new Promise(r => setTimeout(r, 1000));

      // Check for Deep Research indicator in UI
      const body = document.body.innerText;
      const enabled = body.includes('Deep Research') || body.includes('深度研究');

      return { success: enabled, error: enabled ? null : 'Deep Research not enabled after click' };
    })()
  `);

  return result?.success === true;
}

async function selectMode(page: any, mode: string): Promise<boolean> {
  if (mode === 'quick') return true;

  const targetMode = MODE_LABELS[mode];
  if (!targetMode) return false;

  const result = await page.evaluate(`
    (async () => {
      const targetMode = '${targetMode}';
      const timeout = 8000;
      const startTime = Date.now();

      // Find mode selector (shows current mode)
      let modeBtn = null;
      while (Date.now() - startTime < timeout) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.innerText?.trim();
          const aria = btn.getAttribute('aria-label') || '';
          // Mode button shows current mode name
          if ((text === '快速' || text === '思考' || text === 'Pro') && text.length < 10) {
            // Check if it's near the input area
            const rect = btn.getBoundingClientRect();
            if (rect.bottom > window.innerHeight * 0.5) {
              modeBtn = btn;
              break;
            }
          }
        }
        if (modeBtn) break;
        await new Promise(r => setTimeout(r, 200));
      }

      if (!modeBtn) return { success: false, error: 'Mode selector not found' };
      modeBtn.click();

      // Wait for menu and click target mode
      await new Promise(r => setTimeout(r, 300));

      let targetItem = null;
      const menuStart = Date.now();
      while (Date.now() - menuStart < 5000) {
        const items = document.querySelectorAll('[role="menuitem"], button');
        for (const item of items) {
          const text = (item.innerText || '').trim();
          if (text.includes(targetMode) && text.length < 30 && item.offsetParent !== null) {
            targetItem = item;
            break;
          }
        }
        if (targetItem) break;
        await new Promise(r => setTimeout(r, 200));
      }

      if (!targetItem) return { success: false, error: 'Target mode not found in menu' };
      targetItem.click();

      return { success: true };
    })()
  `);

  return result?.success === true;
}

async function confirmResearchStart(page: any, maxWaitSec: number): Promise<boolean> {
  const result = await page.evaluate(`
    (async () => {
      const timeout = ${maxWaitSec * 1000};
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          const text = btn.innerText?.trim();
          const aria = btn.getAttribute('aria-label') || '';

          if (text === 'Start research' || aria === 'Start research' ||
              text === '开始研究' || text === '开始') {
            btn.click();
            return { success: true };
          }
        }
        await new Promise(r => setTimeout(r, 500));
      }

      return { success: false };
    })()
  `);

  return result?.success === true;
}

async function sendPrompt(page: any, prompt: string): Promise<boolean> {
  const result = await page.evaluate(`
    (async () => {
      const timeout = 5000;
      const startTime = Date.now();

      // Find editor with retry
      let editor = null;
      while (Date.now() - startTime < timeout) {
        editor = document.querySelector('rich-textarea div.ql-editor');
        if (editor) break;
        await new Promise(r => setTimeout(r, 200));
      }

      if (!editor) return { success: false, error: 'Editor not found' };

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

      // Find and click send button
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label');
        if (label === '发送' && !btn.disabled) {
          btn.click();
          return { success: true };
        }
      }

      // Fallback: Enter
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return { success: true };
    })()
  `);

  return result?.success === true;
}

async function waitForResponse(page: any, timeoutMs: number, isDeepResearch: boolean): Promise<string> {
  const startTime = Date.now();
  let lastText = '';
  let stableCount = 0;
  const requiredStable = isDeepResearch ? 5 : 3;

  while (Date.now() - startTime < timeoutMs) {
    const result = await page.evaluate(`
      (() => {
        // Check if still generating
        const stopBtn = document.querySelector('button[aria-label="停止生成"]');
        const isGenerating = !!stopBtn;

        // Get response from chat window
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
          .replace(/\\n来源\\n[\\s\\S]*$/, '')
          .replace(/\\n文件\\n[\\s\\S]*$/, '')
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

    // Use inline wait instead of page.wait
    await new Promise(r => setTimeout(r, 2000));
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

    // Wait for page load by checking for editor
    const pageLoaded = await page.evaluate(`
      (async () => {
        const timeout = 10000;
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
          const editor = document.querySelector('rich-textarea div.ql-editor');
          if (editor) return true;
          await new Promise(r => setTimeout(r, 200));
        }
        return false;
      })()
    `);

    if (!pageLoaded) {
      return [{ text: 'Error: Page failed to load' }];
    }

    // Enable Deep Research first (if requested)
    if (useDeepResearch) {
      const drEnabled = await enableDeepResearch(page);
      if (!drEnabled) {
        return [{ text: 'Error: Failed to enable Deep Research' }];
      }
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
      const confirmed = await confirmResearchStart(page, 60);
      if (!confirmed) {
        return [{ text: 'Error: Failed to find Start research button within 60s' }];
      }
    }

    // Wait for response
    const response = await waitForResponse(page, timeoutMs, useDeepResearch);

    return [{ text: response.substring(0, 15000) }];
  }
});
