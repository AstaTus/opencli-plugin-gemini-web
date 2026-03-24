/**
 * Gemini Web ask command — send message and wait for response
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Constants
// ============================================================================

const GEMINI_URL = 'https://gemini.google.com/app';

// Timeouts (in milliseconds)
const PAGE_LOAD_TIMEOUT_MS = 10_000;        // Max wait for page to load
const ELEMENT_FIND_TIMEOUT_MS = 8_000;      // Max wait to find UI elements
const MENU_OPEN_DELAY_MS = 300;             // Delay after opening menu
const INPUT_SETTLE_DELAY_MS = 200;          // Delay after input operations
const SEND_CONFIRM_DELAY_MS = 600;          // Delay after clicking send

// Response polling (in milliseconds)
const RESPONSE_POLL_INTERVAL_MS = 500;      // How often to check for response
const RESPONSE_STABLE_COUNT = 2;            // Number of consecutive same reads

// Deep Research specific
const DEEP_RESEARCH_CONFIRM_TIMEOUT_SEC = 60;  // Max seconds to wait for "Start research" button

// Mode labels (Chinese UI)
const MODE_LABELS: Record<string, string> = {
  'quick': '快速',
  'think': '思考',
  'pro': 'Pro'
};

// ============================================================================
// Browser Window Management
// ============================================================================

async function activateChrome(): Promise<void> {
  try {
    await execAsync(`osascript -e 'tell application "Google Chrome" to activate'`);
  } catch {
    // Chrome might not be installed or named differently
  }
}

// ============================================================================
// Page Utilities
// ============================================================================

/**
 * Wait for an element to appear and return it
 */
async function waitForElement(
  page: any,
  selector: string,
  timeoutMs: number = ELEMENT_FIND_TIMEOUT_MS
): Promise<boolean> {
  const result = await page.evaluate(`
    (async () => {
      const startTime = Date.now();
      while (Date.now() - startTime < ${timeoutMs}) {
        const el = document.querySelector('${selector}');
        if (el) return true;
        await new Promise(r => setTimeout(r, 200));
      }
      return false;
    })()
  `);
  return result === true;
}

/**
 * Click a button by its text content
 */
async function clickButtonByText(
  page: any,
  buttonText: string,
  timeoutMs: number = ELEMENT_FIND_TIMEOUT_MS
): Promise<boolean> {
  const result = await page.evaluate(`
    (async () => {
      const startTime = Date.now();
      while (Date.now() - startTime < ${timeoutMs}) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.innerText?.trim() === '${buttonText}') {
            btn.click();
            return true;
          }
        }
        await new Promise(r => setTimeout(r, 200));
      }
      return false;
    })()
  `);
  return result === true;
}

// ============================================================================
// Deep Research
// ============================================================================

async function enableDeepResearch(page: any): Promise<boolean> {
  const result = await page.evaluate(`
    (async () => {
      const timeout = ${ELEMENT_FIND_TIMEOUT_MS};
      const startTime = Date.now();

      // Step 1: Click 工具 button
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

      // Step 2: Wait for menu and click Deep Research
      await new Promise(r => setTimeout(r, ${MENU_OPEN_DELAY_MS}));

      let drItem = null;
      const menuStart = Date.now();
      while (Date.now() - menuStart < ${ELEMENT_FIND_TIMEOUT_MS}) {
        const items = document.querySelectorAll('button, [role="menuitem"], div[role="button"]');
        for (const item of items) {
          const text = (item.innerText || '').trim();
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

      return { success: true };
    })()
  `);

  return result?.success === true;
}

async function confirmResearchStart(page: any, maxWaitSec: number): Promise<boolean> {
  const timeoutMs = maxWaitSec * 1000;

  const result = await page.evaluate(`
    (async () => {
      const timeout = ${timeoutMs};
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

// ============================================================================
// Mode Selection
// ============================================================================

async function selectMode(page: any, mode: string): Promise<boolean> {
  if (mode === 'quick') return true;

  const targetMode = MODE_LABELS[mode];
  if (!targetMode) return false;

  const result = await page.evaluate(`
    (async () => {
      const targetMode = '${targetMode}';
      const timeout = ${ELEMENT_FIND_TIMEOUT_MS};
      const startTime = Date.now();

      // Find mode selector (shows current mode name)
      let modeBtn = null;
      while (Date.now() - startTime < timeout) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.innerText?.trim();
          // Mode button is near the input area and shows mode name
          if ((text === '快速' || text === '思考' || text === 'Pro') && text.length < 10) {
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
      await new Promise(r => setTimeout(r, ${MENU_OPEN_DELAY_MS}));

      let targetItem = null;
      const menuStart = Date.now();
      while (Date.now() - menuStart < ${ELEMENT_FIND_TIMEOUT_MS}) {
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

      if (!targetItem) return { success: false, error: 'Target mode not found' };
      targetItem.click();

      return { success: true };
    })()
  `);

  return result?.success === true;
}

// ============================================================================
// Prompt Sending
// ============================================================================

async function sendPrompt(page: any, prompt: string): Promise<boolean> {
  const result = await page.evaluate(`
    (async () => {
      const timeout = ${ELEMENT_FIND_TIMEOUT_MS};
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
      await new Promise(r => setTimeout(r, ${INPUT_SETTLE_DELAY_MS}));

      // Clear and insert using execCommand
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);

      await new Promise(r => setTimeout(r, ${INPUT_SETTLE_DELAY_MS}));
      document.execCommand('insertText', false, ${JSON.stringify(prompt)});
      await new Promise(r => setTimeout(r, ${SEND_CONFIRM_DELAY_MS}));

      // Find and click send button
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label');
        if (label === '发送' && !btn.disabled) {
          btn.click();
          return { success: true };
        }
      }

      // Fallback: press Enter
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return { success: true };
    })()
  `);

  return result?.success === true;
}

// ============================================================================
// Response Waiting
// ============================================================================

async function waitForResponse(
  page: any,
  timeoutMs: number,
  isDeepResearch: boolean
): Promise<string> {
  const startTime = Date.now();
  let lastText = '';
  let stableCount = 0;

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
      if (!isGenerating) {
        // Not generating - confirm content is stable
        if (text === lastText) {
          stableCount++;
          if (stableCount >= RESPONSE_STABLE_COUNT) {
            return text;
          }
        } else {
          lastText = text;
          stableCount = 1;
        }
      } else {
        // Still generating, update lastText
        lastText = text;
        stableCount = 0;
      }
    }

    await new Promise(r => setTimeout(r, RESPONSE_POLL_INTERVAL_MS));
  }

  return lastText || 'Timeout: No response received.';
}

// ============================================================================
// CLI Definition
// ============================================================================

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
    // Bring Chrome to front
    await activateChrome();

    const prompt = kwargs.prompt as string;
    const mode = (kwargs.mode as string) || 'quick';
    const useDeepResearch = kwargs['deep-research'] as boolean;
    const defaultTimeout = useDeepResearch ? 600 : 300;
    const timeoutSec = (kwargs.timeout as number) || defaultTimeout;
    const timeoutMs = timeoutSec * 1000;

    // Navigate to Gemini
    await page.goto(GEMINI_URL);

    // Wait for page load
    const pageLoaded = await waitForElement(page, 'rich-textarea div.ql-editor', PAGE_LOAD_TIMEOUT_MS);
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
      const confirmed = await confirmResearchStart(page, DEEP_RESEARCH_CONFIRM_TIMEOUT_SEC);
      if (!confirmed) {
        return [{ text: 'Error: Failed to find Start research button within 60s' }];
      }
    }

    // Wait for response
    const response = await waitForResponse(page, timeoutMs, useDeepResearch);

    // Direct output without table
    console.log(response);
    return [];
  }
});
