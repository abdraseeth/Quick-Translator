/**
 * QuickTranslate - AI Language Translation Tool Logic
 * 
 * This script handles all interactive features, including:
 * 1. Populating language selectors from the languages database.
 * 2. Real-time character counting and UI state toggling.
 * 3. Asynchronous translation using the free MyMemory Translation API.
 * 4. Swapping source and target languages (with textarea content swap!).
 * 5. Copy-to-clipboard functionality with custom button animations.
 * 6. Text-to-Speech audio feedback using the browser's Web Speech API.
 * 7. Key bindings (Ctrl + Enter) to quickly translate.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. DOM ELEMENTS SELECTION
    // ==========================================
    const srcLanguage = document.getElementById("srcLanguage");
    const tgtLanguage = document.getElementById("tgtLanguage");
    const inputText = document.getElementById("inputText");
    const outputText = document.getElementById("outputText");
    const swapLanguages = document.getElementById("swapLanguages");
    const srcSpeech = document.getElementById("srcSpeech");
    const tgtSpeech = document.getElementById("tgtSpeech");
    const clearInput = document.getElementById("clearInput");
    const copyBtn = document.getElementById("copyBtn");
    const translateBtn = document.getElementById("translateBtn");
    const charCountCurrent = document.getElementById("charCountCurrent");
    const autoDetect = document.getElementById("autoDetect");

    // ==========================================
    // 2. INITIALIZE SELECT DROPDOWNS
    // ==========================================
    function populateLanguages() {
        // Iterate through the languages dictionary (loaded from languages.js)
        for (const [code, name] of Object.entries(languages)) {
            // Append options to the Source Language dropdown
            const srcOption = document.createElement("option");
            srcOption.value = code;
            srcOption.textContent = name;
            // Default source language to English ('en')
            if (code === "en") srcOption.selected = true;
            srcLanguage.appendChild(srcOption);

            // Append options to the Target Language dropdown
            const tgtOption = document.createElement("option");
            tgtOption.value = code;
            tgtOption.textContent = name;
            // Default target language to Spanish ('es')
            if (code === "es") tgtOption.selected = true;
            tgtLanguage.appendChild(tgtOption);
        }
        
        // Ask Lucide to search the document and render the SVG icons
        lucide.createIcons();
    }

    // ==========================================
    // 3. UI STATE & INTERACTIVITY HANDLING
    // ==========================================

    // Dynamic input changes (Character Count & Action buttons visibility)
    inputText.addEventListener("input", () => {
        const textLength = inputText.value.length;
        charCountCurrent.textContent = textLength;

        // Enable speak option only when text exists
        if (textLength > 0) {
            srcSpeech.disabled = false;
        } else {
            srcSpeech.disabled = true;
            
            // Clean up output state if user clears input completely
            outputText.value = "";
            tgtSpeech.disabled = true;
            copyBtn.disabled = true;
        }
    });

    // Clear Text button logic
    clearInput.addEventListener("click", () => {
        inputText.value = "";
        outputText.value = "";
        charCountCurrent.textContent = "0";
        
        // Disable action buttons
        srcSpeech.disabled = true;
        tgtSpeech.disabled = true;
        copyBtn.disabled = true;
        
        inputText.focus();
    });

    // Key shortcut: Ctrl+Enter (or Cmd+Enter on macOS) to translate
    inputText.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault(); // Avoid creating a new line
            translateText();
        }
    });

    // Enable/Disable source language selection when Auto-Detect is toggled
    autoDetect.addEventListener("change", () => {
        const isActive = autoDetect.checked;
        srcLanguage.disabled = isActive;
        swapLanguages.disabled = isActive;
        if (isActive) {
            srcLanguage.parentElement.classList.add("disabled");
        } else {
            srcLanguage.parentElement.classList.remove("disabled");
        }
    });

    // ==========================================
    // 4. TRANSLATION (API fetch)
    // ==========================================
    async function translateText() {
        const text = inputText.value.trim();
        // Determine the source language code based on auto-detect checkbox state
        const srcLang = autoDetect.checked ? "auto" : srcLanguage.value;
        const tgtLang = tgtLanguage.value;

        // Don't make an API call if there is no text
        if (!text) {
            outputText.value = "";
            return;
        }

        // 1. Enter Loading State: Change translate button text and spin loader icon
        translateBtn.classList.add("loading");
        translateBtn.innerHTML = `
            <span>Translating...</span>
            <i data-lucide="loader-2" class="btn-arrow"></i>
        `;
        lucide.createIcons(); // Re-render Lucide loader icon

        try {
            // 2. Fetch data from reliable Google Translate single-service API
            const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=${tgtLang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // 3. Parse Google Translate response (nested JSON array format)
            if (data && data[0]) {
                // Loop through all segments to support multi-sentence translations
                let translatedText = "";
                data[0].forEach(segment => {
                    // Extract only valid translation segments (where both translated and source segments are strings)
                    // to prevent any additional dictionary metadata, spelling updates, or synonyms from being appended.
                    if (Array.isArray(segment) && typeof segment[0] === "string" && typeof segment[1] === "string") {
                        translatedText += segment[0];
                    }
                });
                
                outputText.value = translatedText;
                
                // 4. Handle auto-detect visual updates in UI
                if (autoDetect.checked && data[2]) {
                    const detectedLang = data[2];
                    
                    // If detected language is in our 10 supported languages, set it in the dropdown
                    if (languages[detectedLang]) {
                        srcLanguage.value = detectedLang;
                    }
                }
                
                // Enable speech and copy buttons for translation
                tgtSpeech.disabled = false;
                copyBtn.disabled = false;
            } else {
                throw new Error("Invalid response format received from translation service");
            }
            
        } catch (error) {
            console.error("Translation Error Details:", error);
            outputText.value = "Translation failed. Check your network connection or try again later.";
            
            // Disable copy and speech features if translation failed
            tgtSpeech.disabled = true;
            copyBtn.disabled = true;
        } finally {
            // 5. Exit Loading State: Reset translate button to default
            translateBtn.classList.remove("loading");
            translateBtn.innerHTML = `
                <span>Translate Text</span>
                <i data-lucide="arrow-right" class="btn-arrow"></i>
            `;
            lucide.createIcons(); // Re-render normal arrow icon
        }
    }

    // Bind translation function to click event
    translateBtn.addEventListener("click", translateText);

    // ==========================================
    // 5. SWAP LANGUAGES
    // ==========================================
    swapLanguages.addEventListener("click", () => {
        const currentSrc = srcLanguage.value;
        const currentTgt = tgtLanguage.value;

        // Standard swap
        srcLanguage.value = currentTgt;
        tgtLanguage.value = currentSrc;

        // Swapping actual textarea contents (Premium UX detail!)
        const currentInputVal = inputText.value;
        const currentOutputVal = outputText.value;
        
        if (currentInputVal && currentOutputVal) {
            inputText.value = currentOutputVal;
            outputText.value = currentInputVal;
            
            // Update current character counter
            charCountCurrent.textContent = inputText.value.length;
            
            // Re-trigger translation immediately with swapped settings
            translateText();
        }
    });

    // ==========================================
    // 6. COPY TO CLIPBOARD
    // ==========================================
    copyBtn.addEventListener("click", async () => {
        const textToCopy = outputText.value;
        if (!textToCopy) return;

        try {
            // Use modern browser Clipboard API
            await navigator.clipboard.writeText(textToCopy);
            
            // 1. Enter success feedback state
            copyBtn.classList.add("success");
            copyBtn.innerHTML = `
                <i data-lucide="check" class="copy-icon"></i>
                <span>Copied!</span>
            `;
            lucide.createIcons();

            // 2. Revert back to original state after 2 seconds
            setTimeout(() => {
                copyBtn.classList.remove("success");
                copyBtn.innerHTML = `
                    <i data-lucide="copy" class="copy-icon"></i>
                    <span>Copy</span>
                `;
                lucide.createIcons();
            }, 2000);

        } catch (error) {
            console.error("Clipboard API failed, using fallback copy", error);
            
            // Fallback for legacy environments
            try {
                outputText.select();
                document.execCommand("copy");
                // Clear selection highlight
                window.getSelection().removeAllRanges();
                
                // Show standard warning alert
                alert("Text copied successfully via legacy browser engine!");
            } catch (fallbackError) {
                alert("Could not copy text automatically. Please select the text and copy manually.");
            }
        }
    });

    // ==========================================
    // 7. TEXT-TO-SPEECH (READ TEXT ALOUD)
    // ==========================================
    function speak(text, languageCode) {
        if (!('speechSynthesis' in window)) {
            console.warn("Speech synthesis is not supported in this browser.");
            return;
        }

        // Stop any text currently speaking
        window.speechSynthesis.cancel();

        // Create the speech utterance instance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure the utterance speaker language
        if (languageCode) {
            utterance.lang = languageCode;
        }
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
    }

    // Bind Speak buttons
    srcSpeech.addEventListener("click", () => {
        speak(inputText.value, srcLanguage.value);
    });

    tgtSpeech.addEventListener("click", () => {
        speak(outputText.value, tgtLanguage.value);
    });

    // ==========================================
    // 8. APP INITIALIZATION
    // ==========================================
    populateLanguages();
});
