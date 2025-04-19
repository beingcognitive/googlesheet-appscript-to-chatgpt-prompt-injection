// content.js - Refined with more logging
(async function () {
  console.log("Content script activated on:", window.location.href);

  // --- 1. Read from Storage ---
  let prompt = "";
  try {
    const data = await chrome.storage.local.get("gpt_prompt");
    prompt = data?.gpt_prompt || "";
    if (!prompt) {
      console.log("No prompt found in storage. Exiting content script.");
      // Attempt to remove potentially stale item just in case
      // chrome.storage.local.remove("gpt_prompt"); // Optional: uncomment to clear stale empty prompts
      return; // Nothing to inject
    }
    console.log("Retrieved prompt from storage."); // Log success
  } catch (error) {
    console.error("Error reading from chrome.storage.local:", error);
    return; // Stop if storage fails
  }

  // --- 2. Wait for Editor and Send Button ---
  const waitForElement = (selector, timeout = 15000) => {
    console.log(`Waiting for element: ${selector}`);
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Element found: ${selector}`);
          clearInterval(interval);
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          console.error(`Timeout waiting for element: ${selector}`);
          clearInterval(interval);
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }
      }, 500); // Check every 500ms
    });
  };

  let editor = null;
  let sendButton = null;

  try {
    // Try common selectors - UPDATE THESE if they are wrong based on inspecting the page
    // const editorSelector = "textarea[id='prompt-textarea']"; // Primary target
    const editorSelector = "#prompt-textarea"; // Use the ID selector


    // Fallback selectors (less reliable, might select wrong elements)
    // const editorFallbackSelector = "div[contenteditable='true'][role='textbox']";
    // const sendButtonFallbackSelector = "button[class*='send']"; // Example, likely needs refinement

    editor = await waitForElement(editorSelector);

    // If primary selectors fail, you could uncomment and try fallbacks:
    // if (!editor) editor = await waitForElement(editorFallbackSelector);
    // if (!sendButton) sendButton = await waitForElement(sendButtonFallbackSelector);

    if (!editor) throw new Error("Chat input editor element not found.");

    console.log("Editor references obtained.");

  } catch (error) {
    console.error("Error finding ChatGPT elements:", error);
    // Clear storage if elements aren't found, as we can't proceed
    chrome.storage.local.remove("gpt_prompt", () => console.log("Cleared prompt from storage due to element finding failure."));
    return; // Stop execution
  }



  // --- 3. Inject Prompt ---
  try {
    console.log("Injecting prompt into editor...");

    // Set the value
    if (editor.tagName === 'TEXTAREA') {
      editor.value = prompt;
    } else { // Handle contenteditable divs if needed
      editor.textContent = prompt;
    }

    // Dispatch events to make the page recognize the input
    editor.focus();
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: prompt, inputType: 'insertText' }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    console.log("Prompt text injected.");

    try {

      // const sendButtonSelector = "button[data-testid='send-button']"; // Primary target
      const sendButtonSelector = "#composer-submit-button"; 
    
      sendButton = await waitForElement(sendButtonSelector);
    
      if (!sendButton) throw new Error("Send button element not found.");
      console.log("Editor and send button references obtained.");
    
    } catch (error) {
      console.error("Error finding ChatGPT elements:", error);
      // Clear storage if elements aren't found, as we can't proceed
      chrome.storage.local.remove("gpt_prompt", () => console.log("Cleared prompt from storage due to element finding failure."));
      return; // Stop execution
    }
    
    // --- 4. Click Send Button ---
    // Allow UI to settle and button to enable (ChatGPT often disables it briefly)
    setTimeout(() => {
      const trySend = (attempt) => {
        if (!sendButton) {
            console.error("Send button reference lost before clicking.");
             chrome.storage.local.remove("gpt_prompt", () => console.log("Cleared prompt from storage due to lost send button reference."));
            return;
        }
        if (!sendButton.disabled) {
          console.log(`Clicking send button (attempt ${attempt}).`);
          sendButton.click();
          // Clear storage AFTER successfully clicking send
          chrome.storage.local.remove("gpt_prompt", () => {
            if (chrome.runtime.lastError) {
              console.error("Error clearing prompt from storage:", chrome.runtime.lastError);
            } else {
              console.log("Cleared prompt from storage after sending.");
            }
          });
        } else if (attempt < 5) { // Increased attempts
          console.warn(`Send button is disabled, waiting... (attempt ${attempt})`);
          setTimeout(() => trySend(attempt + 1), 750); // Wait
        } else {
          console.error("Send button remained disabled after multiple attempts. Could not send prompt automatically.");
          // Don't clear storage if we couldn't send
        }
      };
      trySend(1); // Start trying to send
    }, 500); // Initial delay before first send attempt

  } catch (error) {
    console.error("Error during prompt injection or sending:", error);
    // Consider whether to clear storage on injection error
    // chrome.storage.local.remove("gpt_prompt", () => console.log("Cleared prompt from storage due to injection/send error."));
  }
})();