// background.js

// Listener for messages from content scripts (specifically sheets_content_script.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check if the message is from our Sheets content script
  // IMPORTANT: Validate the sender if necessary, e.g., sender.url.startsWith('https://docs.google.com')
   if (sender.url && sender.url.startsWith('https://docs.google.com') && message.type === 'SAVE_AND_OPEN_CHATGPT') {
    console.log("Background: Received SAVE_AND_OPEN_CHATGPT message.");
    const promptText = message.payload;

    if (!promptText) {
      console.error("Background: Received empty prompt payload.");
      sendResponse({ success: false, error: "Empty prompt received" });
      return;
    }

    // 1. Save the prompt to storage
    chrome.storage.local.set({ gpt_prompt: promptText }, () => {
      if (chrome.runtime.lastError) {
        console.error("Background: Error saving prompt to storage:", chrome.runtime.lastError);
        sendResponse({ success: false, error: "Failed to save prompt" });
        return; // Stop execution if saving failed
      }

      console.log("Background: Prompt saved successfully.");

      // 2. Open ChatGPT in a new tab
      chrome.tabs.create({ url: 'https://chat.openai.com', active: true }, (newTab) => {
        if (chrome.runtime.lastError) {
          console.error("Background: Error opening new tab:", chrome.runtime.lastError);
          sendResponse({ success: false, error: "Failed to open ChatGPT tab" });
        } else {
          console.log("Background: ChatGPT tab opened:", newTab.id);
          // The onUpdated listener below will handle injection
          sendResponse({ success: true, tabId: newTab.id });
        }
      });
    });

    // Indicate that we will send a response asynchronously
    return true;
  } else if (message.type === 'PING') { // Handle optional PING message
     console.log("Background: Received PING from content script.");
     sendResponse({ success: true, message: "pong" });
     return false; // Synchronous response
   }

   // Handle other message types if necessary
   console.log("Background: Received unhandled message type:", message.type);
   sendResponse({ success: false, error: "Unknown message type" });
   return false; // No async response needed
});


// Listener for tab updates (to inject content script into ChatGPT) - Keep as is
chrome.tabs.onUpdated.addListener(function listener(tabId, info, tab) {
  if (info.status === "complete" && tab.url && (tab.url.startsWith("https://chat.openai.com") || tab.url.startsWith("https://chatgpt.com"))) {
    // Check if we actually have a prompt waiting to be injected
    chrome.storage.local.get("gpt_prompt", ({ gpt_prompt }) => {
        if (gpt_prompt) {
            console.log(`Background: ChatGPT tab ${tabId} loaded and prompt exists, injecting content.js.`);
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["content.js"]
            })
            .then(() => {
                console.log(`Background: Injected content.js into tab ${tabId}`);
                // Consider clearing the prompt AFTER successful injection confirmation?
                // Needs message back from content.js, adding complexity.
                // For now, content.js clears it after clicking send.
            })
            .catch(err => console.error(`Background: Failed to inject script into tab ${tabId}:`, err));
        } else {
            console.log(`Background: ChatGPT tab ${tabId} loaded, but no prompt found in storage. Skipping injection.`);
        }
    });

    // Debatable: Remove listener immediately or after checking storage?
    // Removing immediately prevents multiple injections if the page updates rapidly without full reload.
    // Keeping it until after check ensures injection if storage write was slow, but risks multiple injects.
    // Let's remove it here for simplicity, assuming storage is fast enough.
    try {
        chrome.tabs.onUpdated.removeListener(listener);
    } catch (e) {
        console.warn("Background: Could not remove onUpdated listener, possibly already removed:", e);
    }
  }
});

// Keep background script alive for message listening (especially important if not using persistent background)
// This might not be strictly necessary with event-based listeners in MV3,
// but can help ensure the listener is active. Use alarms for longer gaps.
/*
chrome.alarms.create('keep_alive', { periodInMinutes: 4.9 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keep_alive') {
    console.log('Keep alive alarm.');
  }
});
*/

console.log("Background script loaded and ready.");