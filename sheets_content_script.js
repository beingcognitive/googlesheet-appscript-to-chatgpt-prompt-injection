// sheets_content_script.js
console.log("GPT Auto Injector: Sheets content script loaded.");

window.addEventListener('message', (event) => {
  // --- Security Checks ---
  // 1. Check origin: Should be from a googleusercontent.com domain
  //    This check is broad but necessary as the exact subdomain can vary.
  //    A more secure check might involve a nonce/secret if possible, but is complex.
  if (!event.origin.endsWith('.googleusercontent.com')) {
      // console.log("Ignoring message from origin:", event.origin); // For debugging
      return;
  }

  // 2. Check message structure/type
  if (typeof event.data !== 'object' || event.data === null || event.data.type !== 'GPT_PROMPT_DATA_FROM_SHEET') {
      // console.log("Ignoring message with unexpected data:", event.data); // For debugging
      return;
  }

  // --- Process Valid Message ---
  const promptText = event.data.payload;
  console.log("GPT Auto Injector: Received prompt data from Apps Script dialog.");

  if (promptText) {
    // Send the received prompt text to the background script
    chrome.runtime.sendMessage({ type: 'SAVE_AND_OPEN_CHATGPT', payload: promptText }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("GPT Auto Injector: Error sending message to background:", chrome.runtime.lastError.message);
        // Maybe alert the user? Could indicate the extension was updated/reloaded.
        alert("Error communicating with the GPT Injector extension. Please ensure it's enabled and try again.");
      } else {
        console.log("GPT Auto Injector: Message sent to background script.", response);
        // Optional: Add a visual confirmation on the sheet?
      }
    });
  } else {
    console.warn("GPT Auto Injector: Received empty prompt data.");
  }

}, false);

console.log("GPT Auto Injector: Listening for messages from Apps Script.");

// Optional: Add a check to see if the extension can communicate with the background
// This helps diagnose if the extension is disabled or broken
/*
chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
  if (chrome.runtime.lastError) {
    console.warn("GPT Auto Injector: Could not ping background script. Extension might be disabled or broken.", chrome.runtime.lastError.message);
  } else {
    console.log("GPT Auto Injector: Successfully pinged background script.");
  }
});
*/