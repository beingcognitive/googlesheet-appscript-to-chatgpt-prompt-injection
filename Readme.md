# Google Sheets to ChatGPT Automation Tool

## Overview

This project provides a Google Apps Script and a companion Chrome Extension to automate sending data selected in a Google Sheet to ChatGPT for analysis.

With one click from a custom menu in Google Sheets, this tool will:
1.  Extract the data you selected.
2.  Format it with a predefined analysis prompt.
3.  Automatically open ChatGPT in a new browser tab.
4.  Inject the data and prompt into the ChatGPT input field.
5.  Attempt to click the "Send" button.

**Disclaimer:** This tool interacts with the ChatGPT web interface, which can change without notice. Significant changes by OpenAI might break the extension's injection functionality, requiring updates to the code (specifically the selectors in `content.js`).

## Prerequisites

* Google Account
* Google Chrome Browser

## Setup Instructions

This tool requires setting up **two** components: the Google Apps Script (in your Sheet) and the Chrome Extension (in your browser).

### Part 1: Install Chrome Extension (Manual Setup)

Since this extension is not on the Chrome Web Store, you need to load it manually:

1.  **Download the Extension Files:**
    * Click the green "<> Code" button on this GitHub repository page.
    * Select "Download ZIP".
    * Unzip the downloaded file. You should now have a folder containing files like `manifest.json`, `background.js`, etc. Remember where this folder is.

2.  **Enable Chrome Developer Mode:**
    * Open Google Chrome.
    * Type `chrome://extensions` in the address bar and press Enter.
    * Find the "Developer mode" toggle switch (usually in the top-right corner) and turn it **ON**.

3.  **Load the Extension:**
    * Click the "Load unpacked" button that appears (usually top-left).
    * Navigate to the folder you unzipped in Step 1 (the one containing `manifest.json`).
    * Select that folder.
    * The "GPT Prompt Injector - Auto" extension should now appear in your list of extensions. You should also see its icon in your Chrome toolbar.

### Part 2: Install Google Apps Script

1.  **Open Your Google Sheet:** Go to the Google Sheet where you want to use this automation.
2.  **Open Script Editor:** Click on "Extensions" in the menu bar, then select "Apps Script". A new browser tab will open with the script editor.
3.  **Paste the Code:**
    * If there's any existing code in the `Code.gs` file (or similar default file), delete it completely.
    * Copy the entire script code provided below:

    ```javascript
    // <--- COPY AND PASTE THE ENTIRE Code.gs SCRIPT BELOW THIS LINE --->

    /**
     * Gets data, adds a predefined analysis prompt, and triggers the extension
     * via HtmlService message passing.
     */
    function sendDataToChatGPTForAnalysis() {
      const ui = SpreadsheetApp.getUi();
      const sheet = SpreadsheetApp.getActiveSheet();
      const range = sheet.getActiveRange();

      if (!range) {
         ui.alert("⚠️ Please select the cell(s) containing the data first.");
         return;
      }

      const values = range.getDisplayValues();
      // Basic check for empty selection
      if (values.length === 0 || (values.length === 1 && values[0].length === 0) || values.flat().every(cell => cell === '')) {
          ui.alert("⚠️ 선택된 셀에 값이 없습니다. (Selected cells are empty).");
          return;
      }

      // Convert selected data to a suitable format (e.g., CSV or Markdown table)
      // Simple CSV example:
      const dataAsCSV = values.map(row =>
          row.map(cell => {
              // Handle quotes and commas within cells
              let escapedCell = cell.replace(/"/g, '""');
              if (escapedCell.includes(',') || escapedCell.includes('\n')) {
                  escapedCell = `"${escapedCell}"`;
              }
              return escapedCell;
          }).join(',')
      ).join('\n');

      // --- Define your Standard Analysis Prompt ---
      const analysisPrompt = `Please analyze the following data and provide insights:
\`\`\`csv
${dataAsCSV}
\`\`\`
Focus on trends, anomalies, and key takeaways.`;
      // --- End of Standard Analysis Prompt ---


      // Check if the combined text is too large (postMessage might have limits, though usually generous)
      if (analysisPrompt.length > 1024 * 100) { // Example limit: 100KB
          ui.alert("⚠️ 데이터가 너무 큽니다. 더 작은 범위를 선택해주세요. (Data is too large. Please select a smaller range).");
          return;
      }


      // Create minimal HTML to send the message to the Sheets content script
      const html = HtmlService.createHtmlOutput(
        `<script>
          const promptPayload = ${JSON.stringify(analysisPrompt)};
          // Use window.top to message the main Sheets window where the content script runs
          const targetOrigin = '[https://docs.google.com](https://docs.google.com)'; // Be specific

          try {
            console.log('Sending message to parent window:', targetOrigin);
            window.top.postMessage(
              { type: 'GPT_PROMPT_DATA_FROM_SHEET', payload: promptPayload },
              targetOrigin
            );
            // Close the dialog immediately after posting
            google.script.host.close();
          } catch (e) {
            console.error('Error sending postMessage:', e);
            // Inform user if message sending fails (e.g., blocked by browser settings?)
            alert('Error sending data to the extension. Details: ' + e.message);
            google.script.host.close(); // Still close the dialog
          }
        </script>`
      )
      .setWidth(100) // Make it very small, it's just for running the script
      .setHeight(50);

      // Show the dialog briefly to execute the script
      // Using showModalDialog ensures script execution before Apps Script finishes
      ui.showModalDialog(html, "Sending to ChatGPT..."); // User sees this briefly
    }

    /**
     * Adds the custom menu item.
     */
    function onOpen() {
      SpreadsheetApp.getUi()
        .createMenu("✨ GPT 자동화 (GPT Automation)")
        // Make sure the function name here matches the one above
        .addItem("선택 데이터 분석 요청 (Analyze Selected Data)", "sendDataToChatGPTForAnalysis")
        .addToUi();
    }

    // <--- END OF Code.gs SCRIPT --->
    ```

    * Paste the copied code into the script editor, replacing anything that was there.

4.  **Save the Script:**
    * Click the floppy disk icon (Save project) near the top.
    * You might be asked to name the project. Call it something like "ChatGPT Automation" and click "Rename".

5.  **Reload Your Sheet:** Close the script editor tab and reload your Google Sheet browser tab.

## How to Use

1.  Open the Google Sheet where you installed the Apps Script.
2.  Select the range of cells containing the data you want to analyze.
3.  Click the custom menu item: "✨ GPT 자동화 (GPT Automation)" > "선택 데이터 분석 요청 (Analyze Selected Data)".
4.  **First Time Only:** Google will ask for authorization. Review the permissions (it needs access to the current sheet to get data and external services to trigger the extension) and click "Allow". You might get a "Google hasn't verified this app" warning – you may need to click "Advanced" and "Go to [Your Script Name] (unsafe)" to proceed. This is normal for personal scripts.
5.  A small "Sending to ChatGPT..." dialog will appear briefly.
6.  A new browser tab should open to `https://chat.openai.com/`.
7.  The Chrome Extension will then attempt to automatically paste your data and analysis prompt into the chat input and click the send button.

## Troubleshooting

* **Prompt Not Injecting / Sending:** The most common issue is that OpenAI changed the ChatGPT website structure.
    * You may need to update the CSS selectors used to find the input field and send button.
    * Open the `content.js` file (in the extension folder you downloaded).
    * Find the lines defining `editorSelector` and `sendButtonSelector`.
    * Follow the debugging steps outlined in browser developer tools (right-click -> Inspect on the elements in ChatGPT) to find the correct current selectors and update them in `content.js`.
    * After editing `content.js`, go back to `chrome://extensions` and click the "Reload" icon for the extension.
* **Authorization Errors:** If the script fails with authorization errors, try running it again. Sometimes removing and re-pasting the script code can help reset permissions. Make sure you grant the necessary permissions when prompted.
* **Extension Not Working:** Check `chrome://extensions` for any errors listed under the "GPT Prompt Injector - Auto" extension card. You can also inspect the "Service worker" console and the console on the ChatGPT page itself (Right-click -> Inspect -> Console) for more detailed error messages from the extension scripts (`background.js`, `content.js`).

## License

*(Optional: Choose a license)*
Example: This project is licensed under the MIT License - see the LICENSE file for details.

*(You would then create a file named `LICENSE` in your repository and paste the text of the MIT license - you can easily find templates online)*

---