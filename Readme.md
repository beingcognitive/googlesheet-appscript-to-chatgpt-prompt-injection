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

---

# 구글 시트 - ChatGPT 자동화 도구 (Korean Readme)

[English Readme](./README.md)

## 개요

이 프로젝트는 구글 시트에서 선택한 데이터를 ChatGPT에 자동으로 전송하여 분석을 요청하는 구글 앱스 스크립트(Google Apps Script)와 크롬 확장 프로그램(Chrome Extension)을 제공합니다.

구글 시트의 사용자 지정 메뉴에서 한 번의 클릭으로 다음 작업이 수행됩니다:
1.  선택한 셀의 데이터를 추출합니다.
2.  미리 정의된 분석 프롬프트와 함께 데이터를 포맷합니다.
3.  자동으로 새 브라우저 탭에서 ChatGPT를 엽니다.
4.  ChatGPT 입력창에 데이터와 프롬프트를 주입합니다.
5.  "전송(Send)" 버튼 클릭을 시도합니다.

**주의사항:** 이 도구는 ChatGPT 웹 인터페이스와 상호작용하며, 이 인터페이스는 사전 공지 없이 변경될 수 있습니다. OpenAI가 웹사이트를 크게 변경할 경우, 확장 프로그램의 주입 기능이 작동하지 않을 수 있으며 코드 업데이트(특히 `content.js`의 선택자)가 필요할 수 있습니다.

## 사전 요구사항

* Google 계정
* Google Chrome 브라우저

## 설치 안내

이 도구를 사용하려면 **두 가지** 구성 요소를 설정해야 합니다: 구글 앱스 스크립트(시트 내)와 크롬 확장 프로그램(브라우저 내).

### 1단계: 크롬 확장 프로그램 설치 (수동 설정)

이 확장 프로그램은 크롬 웹 스토어에 등록되어 있지 않으므로 수동으로 로드해야 합니다:

1.  **확장 프로그램 파일 다운로드:**
    * 이 GitHub 저장소 페이지에서 녹색 "<> Code" 버튼을 클릭합니다.
    * "Download ZIP"을 선택합니다.
    * 다운로드한 ZIP 파일의 압축을 해제합니다. 압축 해제된 폴더에는 `manifest.json`, `background.js` 등의 파일이 포함되어 있습니다. 이 폴더의 위치를 기억해 두세요.

2.  **Chrome 개발자 모드 활성화:**
    * Google Chrome을 엽니다.
    * 주소창에 `chrome://extensions`를 입력하고 Enter 키를 누릅니다.
    * "개발자 모드" 토글 스위치(보통 오른쪽 상단)를 찾아 **켭니다**.

3.  **확장 프로그램 로드:**
    * 나타나는 "압축 해제된 확장 프로그램을 로드합니다." 버튼(보통 왼쪽 상단)을 클릭합니다.
    * 1단계에서 압축 해제한 폴더(`manifest.json` 파일이 있는 폴더)로 이동합니다.
    * 해당 폴더를 선택합니다.
    * "GPT Prompt Injector - Auto" 확장 프로그램이 확장 프로그램 목록에 나타나야 합니다. Chrome 툴바에도 해당 아이콘이 표시됩니다.

### 2단계: 구글 앱스 스크립트 설치

1.  **구글 시트 열기:** 자동화를 사용하려는 구글 시트를 엽니다.
2.  **스크립트 편집기 열기:** 메뉴 바에서 "확장 프로그램" > "Apps Script"를 클릭합니다. 스크립트 편집기가 새 브라우저 탭에서 열립니다.
3.  **코드 붙여넣기:**
    * `Code.gs` 파일(또는 유사한 기본 파일)에 기존 코드가 있다면 모두 삭제합니다.
    * 아래 제공된 전체 스크립트 코드를 복사합니다:

    // <--- 아래 스크립트 전체를 복사하여 붙여넣으세요 --->

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

      // --- 분석 프롬프트 정의 ---
      const analysisPrompt = `Please analyze the following data and provide insights:
\`\`\`csv
${dataAsCSV}
\`\`\`
Focus on trends, anomalies, and key takeaways.`;
      // --- 분석 프롬프트 끝 ---


      // Check if the combined text is too large (postMessage might have limits, though usually generous)
      if (analysisPrompt.length > 1024 * 100) { // 예시 제한: 100KB
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
      SpreadApp.getUi()
        .createMenu("✨ GPT 자동화 (GPT Automation)")
        // Make sure the function name here matches the one above
        .addItem("선택 데이터 분석 요청 (Analyze Selected Data)", "sendDataToChatGPTForAnalysis")
        .addToUi();
    }

    // <--- Code.gs 스크립트 끝 --->

    * 복사한 코드를 스크립트 편집기에 붙여넣어 기존 내용을 대체합니다.

4.  **스크립트 저장:**
    * 상단 근처의 디스켓 아이콘 (프로젝트 저장)을 클릭합니다.
    * 프로젝트 이름을 지정하라는 메시지가 표시될 수 있습니다. "ChatGPT 자동화" 등으로 이름을 지정하고 "이름 바꾸기"를 클릭합니다.

5.  **시트 새로고침:** 스크립트 편집기 탭을 닫고 구글 시트 브라우저 탭을 새로고침합니다.

## 사용 방법

1.  앱스 스크립트를 설치한 구글 시트를 엽니다.
2.  분석하려는 데이터가 포함된 셀 범위를 선택합니다.
3.  사용자 지정 메뉴 항목을 클릭합니다: "✨ GPT 자동화 (GPT Automation)" > "선택 데이터 분석 요청 (Analyze Selected Data)".
4.  **최초 실행 시:** Google에서 승인을 요청할 것입니다. 필요한 권한(데이터를 가져오기 위한 현재 시트 접근 권한 및 확장 프로그램 실행을 위한 외부 서비스 접근 권한)을 검토하고 "허용"을 클릭합니다. "Google에서 이 앱을 확인하지 않았습니다."라는 경고가 표시될 수 있습니다. 계속하려면 "고급"을 클릭하고 "[스크립트 이름](으)로 이동(안전하지 않음)"을 클릭해야 할 수 있습니다. 이는 개인 스크립트의 경우 정상적인 과정입니다.
5.  작은 "Sending to ChatGPT..." 대화 상자가 잠시 나타납니다.
6.  `https://chat.openai.com/` 주소로 새 브라우저 탭이 열립니다.
7.  크롬 확장 프로그램이 자동으로 데이터와 분석 프롬프트를 채팅 입력창에 붙여넣고 전송 버튼 클릭을 시도합니다.

## 문제 해결

* **프롬프트가 주입/전송되지 않는 경우:** 가장 흔한 원인은 OpenAI가 ChatGPT 웹사이트 구조를 변경한 경우입니다.
    * 입력 필드와 전송 버튼을 찾는 데 사용되는 CSS 선택자를 업데이트해야 할 수 있습니다.
    * 다운로드한 확장 프로그램 폴더 내의 `content.js` 파일을 엽니다.
    * `editorSelector`와 `sendButtonSelector`를 정의하는 줄을 찾습니다.
    * 브라우저 개발자 도구(ChatGPT 페이지의 요소에서 마우스 오른쪽 버튼 클릭 -> 검사)를 사용하여 현재 올바른 선택자를 찾아 `content.js`에서 업데이트합니다.
    * `content.js`를 편집한 후, `chrome://extensions`로 이동하여 확장 프로그램의 "새로고침" 아이콘을 클릭합니다.
* **승인 오류:** 스크립트가 승인 오류와 함께 실패하는 경우, 다시 실행해 보세요. 때때로 스크립트 코드를 삭제하고 다시 붙여넣는 것이 권한 재설정에 도움이 될 수 있습니다. 프롬프트가 표시될 때 필요한 권한을 부여했는지 확인하세요.
* **확장 프로그램이 작동하지 않는 경우:** `chrome://extensions`에서 "GPT Prompt Injector - Auto" 확장 프로그램 카드 아래에 오류가 있는지 확인하세요. 또한 "서비스 워커" 콘솔과 ChatGPT 페이지 자체의 콘솔(마우스 오른쪽 버튼 클릭 -> 검사 -> 콘솔)에서 확장 프로그램 스크립트(`background.js`, `content.js`)의 자세한 오류 메시지를 확인할 수 있습니다.

---