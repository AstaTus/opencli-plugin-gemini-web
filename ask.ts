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

// UI Mode values (what appears in the mode button)
const UI_MODE_VALUES = ['快速', '思考', 'Pro'] as const;
type UIMode = typeof UI_MODE_VALUES[number];

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
// UI State Detection
// ============================================================================

interface UIState {
  mode: UIMode | null;
  deepResearchEnabled: boolean;
}

/**
 * Get current UI state (mode and Deep Research status)
 */
async function getUIState(page: any): Promise<UIState> {
  const result = await page.evaluate(`
    (() => {
      // Find mode button - it shows the current mode name
      let currentMode = null;
      const buttons = document.querySelectorAll('button');

      for (const btn of buttons) {
        const text = btn.innerText?.trim();
        // Mode button is near the input area
        if ((text === '快速' || text === '思考' || text === 'Pro') && text.length < 10) {
          const rect = btn.getBoundingClientRect();
          if (rect.bottom > window.innerHeight * 0.5) {
            currentMode = text;
            break;
          }
        }
      }

      // Check if Deep Research is enabled
      // Look for "Deep Research" badge/indicator in the UI
      const bodyText = document.body.innerText || '';
      const deepResearchEnabled = bodyText.includes('Deep Research') &&
                                   bodyText.includes('来源') &&
                                   bodyText.includes('文件');

      return {
        mode: currentMode,
        deepResearchEnabled
      };
    })()
  `);

  return {
    mode: result?.mode as UIMode | null,
    deepResearchEnabled: result?.deepResearchEnabled || false
  };
}

/**
 * Reset UI to default state (quick mode, no Deep Research)
 */
async function resetUIToDefault(page: any): Promise<void> {
  const state = await getUIState(page);

  // If Deep Research is enabled, disable it by clicking new chat
  if (state.deepResearchEnabled) {
    await clickButtonByText(page, '新对话', ELEMENT_FIND_TIMEOUT_MS);
    await new Promise(r => setTimeout(r, PAGE_LOAD_TIMEOUT_MS));
  }

  // If not in quick mode, switch to quick mode
  if (state.mode && state.mode !== '快速') {
    await selectMode(page, 'quick');
  }
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

      // Verify text was inserted
      const editorText = editor.innerText || '';
      if (!editorText.includes(${JSON.stringify(prompt.substring(0, 20))})) {
        return { success: false, error: 'Text not inserted' };
      }

      // Find and click send button
      const buttons = document.querySelectorAll('button');
      let sendBtnFound = false;
      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label');
        if (label === '发送') {
          sendBtnFound = true;
          if (!btn.disabled) {
            btn.click();
            return { success: true, method: 'click' };
          }
        }
      }

      // Fallback: press Enter
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return { success: true, method: 'enter', sendBtnFound };
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
        const deepResearch = ${isDeepResearch};
        const stopBtn = document.querySelector('button[aria-label="停止生成"]');
        const isGenerating = !!stopBtn;

        const chatWindow = document.querySelector('chat-window');
        if (!chatWindow) return { text: '', generating: isGenerating };

        const fullText = chatWindow.innerText || '';
        if (!fullText) return { text: '', generating: isGenerating };

        // Detect quota/rate-limit messages — no response will be generated
        if (/你已达到.*用量限额/.test(fullText) || /Too many requests/.test(fullText)) {
          return { text: '', generating: false, quotaExceeded: true };
        }

        // Find the LAST "Gemini 说" marker (lastIndexOf for multi-turn conversations)
        let responseStart = -1;
        const idx = fullText.lastIndexOf('Gemini 说');
        if (idx >= 0) {
          responseStart = idx + 'Gemini 说'.length;
        } else {
          // Fallback: handle versioned names like "Gemini 2.5 说"
          const matches = [...fullText.matchAll(/Gemini[^\\n]{0,30}?说/g)];
          if (matches.length > 0) {
            const last = matches[matches.length - 1];
            responseStart = last.index + last[0].length;
          }
        }

        if (responseStart < 0) return { text: '', generating: isGenerating };

        let response = fullText.substring(responseStart);
        // Common footer cleanup (applies to both modes)
        response = response
          .replace(/\\nGemini 是一款.*/, '')
          .replace(/\\n升级.*/, '')
          .replace(/\\n你已达到.*/, '')
          .replace(/\\n用量限额.*/, '')
          .replace(/\\n在此之前.*/, '')
          .trim();

        // Additional cleanup for normal mode only
        // Deep research reports include 来源/文件 as part of the content
        if (!deepResearch) {
          response = response
            .replace(/\\n来源\\n[\\s\\S]*$/, '')
            .replace(/\\n文件\\n[\\s\\S]*$/, '')
            .replace(/\\n工具\\n[\\s\\S]*$/, '')
            .replace(/\\n快速\\n[\\s\\S]*$/, '')
            .trim();
        }

        return { text: response, generating: isGenerating };
      })()
    `);

    const text = (result?.text || '').trim();
    const isGenerating = result?.generating || false;

    // Quota exceeded — return immediately instead of waiting for timeout
    if (result?.quotaExceeded) {
      return 'Error: Gemini 用量限额已耗尽，请稍后再试。';
    }

    if (text && text.length > 5) {
      if (text === lastText) {
        stableCount++;
        // Only return when content is stable AND generation is complete
        if (!isGenerating && stableCount >= RESPONSE_STABLE_COUNT) {
          return text;
        }
        // Safety: if text stable for 5s but stop button lingers, return anyway
        if (isGenerating && stableCount >= 10) {
          return text;
        }
      } else {
        lastText = text;
        stableCount = 1;
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
    }
  ],
  columns: ['text'],
  func: async (page, kwargs) => {
    // Bring Chrome to front
    await activateChrome();

    const prompt = kwargs.prompt as string;
    const mode = (kwargs.mode as string) || 'quick';
    const useDeepResearch = kwargs['deep-research'] as boolean;
    const timeoutMs = (useDeepResearch ? 600 : 300) * 1000;

    // Navigate to Gemini
    await page.goto(GEMINI_URL);

    // Wait for page load
    const pageLoaded = await waitForElement(page, 'rich-textarea div.ql-editor', PAGE_LOAD_TIMEOUT_MS);
    if (!pageLoaded) {
      return [{ text: 'Error: Page failed to load' }];
    }

    // Start a new chat to ensure clean state
    const newChatBtn = await page.evaluate(`
      (() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.innerText?.trim() === '新对话') {
            btn.click();
            return true;
          }
        }
        return false;
      })()
    `);
    if (newChatBtn) {
      await new Promise(r => setTimeout(r, 2500));
    }

    // Get current UI state
    const uiState = await getUIState(page);

    // If no special options specified, ensure UI is in default state
    if (!useDeepResearch && mode === 'quick') {
      // Reset to default if needed
      if (uiState.deepResearchEnabled || (uiState.mode && uiState.mode !== '快速')) {
        await resetUIToDefault(page);
      }
    } else {
      // User specified options - configure accordingly

      // Handle Deep Research
      if (useDeepResearch && !uiState.deepResearchEnabled) {
        const drEnabled = await enableDeepResearch(page);
        if (!drEnabled) {
          return [{ text: 'Error: Failed to enable Deep Research' }];
        }
      } else if (!useDeepResearch && uiState.deepResearchEnabled) {
        // Disable Deep Research by starting new chat
        await resetUIToDefault(page);
      }

      // Handle mode selection
      const targetModeLabel = MODE_LABELS[mode];
      if (targetModeLabel && uiState.mode !== targetModeLabel) {
        await selectMode(page, mode);
      }
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

      // Wait for research to actually start (stop button appears)
      const researchStart = Date.now();
      while (Date.now() - researchStart < 30000) {
        const hasStopBtn = await page.evaluate(`
          (() => !!document.querySelector('button[aria-label="停止生成"]'))()
        `);
        if (hasStopBtn) break;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Wait for response
    const response = await waitForResponse(page, timeoutMs, useDeepResearch);

    // Direct output without table
    console.log(response);
    return [];
  }
});
