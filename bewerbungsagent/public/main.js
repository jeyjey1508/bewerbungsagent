// main.js Hauptskript für den Bewerbungsgenerator
document.addEventListener('DOMContentLoaded', function () {
    // Hole DOM-Elemente
    const applicationForm = document.getElementById('applicationForm');
    const privacyConsent = document.getElementById('privacyConsent');
    const privacyError = document.getElementById('privacyError');
    const container = document.querySelector('.container');

    // Status-Elemente für Benutzer-Feedback
    const statusContainer = document.createElement('div');
    statusContainer.className = 'status-container';
    statusContainer.innerHTML = `
        <div id="loadingSpinner" class="loading-spinner">
            <div class="spinner"></div>
            <p>Bewerbung wird erstellt...</p>
        </div>
        <div id="errorMessage" class="error-message"></div>
    `;
    container.appendChild(statusContainer);

    // Ergebnis-Container erstellen und anhängen (Änderung hier: entferne die ID)
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';
    resultContainer.id = 'resultContainer'; // ID beibehalten
    resultContainer.style.display = 'none';
    resultContainer.innerHTML = `
        <div class="result-header">
            <h2>Deine Bewerbung</h2>
            <div class="result-actions">
                <button id="editButton" class="btn-secondary">Bearbeiten</button>
                <button id="downloadPdfButton" class="btn-primary">Als PDF herunterladen</button>
                <button id="copyTextButton" class="btn-secondary">Text kopieren</button>
            </div>
        </div>
        <div class="application-preview"></div> <--- ID entfernt!
    `;
    container.appendChild(resultContainer);

    // Elemente nach dem Anhängen im DOM abrufen
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const applicationPreview = document.getElementById('applicationPreview');

    // Verstecke anfangs die Status-Container
    loadingSpinner.style.display = 'none';
    errorMessage.style.display = 'none';

    // Lokale Speicherung der Formulardaten
    function saveFormData() {
        const formData = new FormData(applicationForm);
        const formDataObj = {};

        formData.forEach((value, key) => {
            formDataObj[key] = value;
        });

        // Speichere zusätzlich den Checkbox-Status separat
        formDataObj.privacyConsent = privacyConsent.checked;

        localStorage.setItem('bewerbungsDaten', JSON.stringify(formDataObj));
    }

    // Lade gespeicherte Daten beim Start
    function loadFormData() {
        const savedData = localStorage.getItem('bewerbungsDaten');
        if (savedData) {
            const formData = JSON.parse(savedData);
            Object.keys(formData).forEach(key => {
                const element = document.getElementById(key);
                if (element && element.type !== 'checkbox') {
                    element.value = formData[key];
                } else if (element && element.type === 'checkbox') {
                    element.checked = formData[key] === true;
                }
            });
        }
    }

    // Lösche gespeicherte Daten
    function clearFormData() {
        localStorage.removeItem('bewerbungsDaten');
        applicationForm.reset();
        // Stelle sicher, dass auch die Fehlermeldungen zurückgesetzt werden
        document.querySelectorAll('.field-error').forEach(el => {
            el.style.display = 'none';
        });
        privacyError.style.display = 'none';
    }

    // Formularvalidierung
    function validateForm() {
        let isValid = true;

        // Prüfe alle required Felder
        applicationForm.querySelectorAll('[required]').forEach(field => {
            if (!field.value.trim() && field.type !== 'checkbox') {
                isValid = false;
                // Zeige die Fehlermeldung für dieses Feld an
                const errorElement = field.nextElementSibling;
                if (errorElement && errorElement.classList.contains('field-error')) {
                    errorElement.style.display = 'block';
                }
            }
        });

        // Prüfe DSGVO Checkbox explizit
        if (!privacyConsent.checked) {
            isValid = false;
            privacyError.style.display = 'block';
        } else {
            privacyError.style.display = 'none';
        }

        return isValid;
    }



















// Bewerbung senden und generieren
async function generateApplication() {
    if (!validateForm()) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    loadingSpinner.style.display = 'flex';
    errorMessage.style.display = 'none';

    const formData = new FormData(applicationForm);
    const formDataObj = {};

    formData.forEach((value, key) => {
        formDataObj[key] = value;
    });

    formDataObj.privacyConsent = privacyConsent.checked ? 'on' : 'off';

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formDataObj)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Fehler bei der Bewerbungserstellung');
        }

        const data = await response.json();

        const applicationPreviewInResult = resultContainer.querySelector('.application-preview');

        if (!applicationPreviewInResult) {
            console.error('Fehler: .application-preview Element im Ergebniscontainer nicht gefunden');
            throw new Error('Interner Fehler: Vorschau-Element fehlt');
        }

        applicationPreviewInResult.innerHTML = data.application;

        loadingSpinner.style.display = 'none';

        const resultContainerElement = document.getElementById('resultContainer');
        if (resultContainerElement) {
            resultContainerElement.style.display = 'block';
            resultContainerElement.scrollIntoView({ behavior: 'smooth' });
            applicationForm.parentElement.style.display = 'none';
        } else {
            console.error("Ergebnis-Container nicht gefunden!");
        }

    } catch (error) {
        console.error('Fehler beim Generieren:', error);
        loadingSpinner.style.display = 'none';
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
        errorMessage.scrollIntoView({ behavior: 'smooth' });
    }
}

// PDF Herunterladen
async function downloadPDF() {
    try {
        if (typeof jspdf === 'undefined') {
            console.log("Lade jsPDF...");
            const jsPDFScript = document.createElement('script');
            jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            document.head.appendChild(jsPDFScript);
            await new Promise(resolve => jsPDFScript.onload = resolve);
        }

        if (typeof html2canvas === 'undefined') {
            console.log("Lade html2canvas...");
            const html2canvasScript = document.createElement('script');
            html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(html2canvasScript);
            await new Promise(resolve => html2canvasScript.onload = resolve);
        }

        const element = resultContainer.querySelector('.application-preview'); // Korrigiert
        if (!element) {
            throw new Error('Vorschau-Element im Ergebniscontainer nicht gefunden');
        }

        const firstName = document.getElementById('firstName').value || 'Bewerbung';
        const lastName = document.getElementById('lastName').value || '';
        const fileName = `Bewerbung_${firstName}_${lastName}.pdf`;

        console.log("Erstelle PDF...");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210 - 40;
        const pageHeight = 297;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 20;

        doc.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 40;

        while (heightLeft > 0) {
            position = 20 - heightLeft;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= pageHeight - 40;
        }

        doc.save(fileName);
        console.log("PDF erstellt und gespeichert");

    } catch (error) {
        console.error('PDF-Erstellung fehlgeschlagen:', error);
        alert('PDF-Erstellung fehlgeschlagen: ' + error.message);
    }
}

// Text in die Zwischenablage kopieren
function copyApplicationText() {
    const applicationText = resultContainer.querySelector('.application-preview'); // Korrigiert
    if (!applicationText) {
        console.error('Vorschau-Element im Ergebniscontainer nicht gefunden');
        return;
    }

    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = applicationText.innerText;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);

    const copyButton = document.getElementById('copyTextButton');
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Kopiert!';
    copyButton.disabled = true;

    setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.disabled = false;
    }, 2000);
}

// Zurück zum Bearbeiten
function backToEdit() {
    applicationForm.parentElement.style.display = 'block';
    if (resultContainer) {
        resultContainer.style.display = 'none';
    }
    const applicationPreviewInResult = resultContainer.querySelector('.application-preview');
    if (applicationPreviewInResult) {
        applicationPreviewInResult.innerHTML = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


    
    
    // Event-Listener
    applicationForm.addEventListener('submit', function (e) {
        e.preventDefault();
        generateApplication();
        saveFormData();
    });

    // Event-Listener speziell für die DSGVO-Checkbox
    privacyConsent.addEventListener('change', function () {
        if (this.checked) {
            privacyError.style.display = 'none';
        }
    });

    // Reset-Button
    const resetButton = document.querySelector('button[type="reset"]');
    if (resetButton) {
        resetButton.addEventListener('click', clearFormData);
    }


    // Ergebnis-Aktionen
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', downloadPDF); // downloadPDF Funktion hier einfügen
    }

    const copyTextButton = document.getElementById('copyTextButton');
    if (copyTextButton) {
        copyTextButton.addEventListener('click', copyApplicationText); // copyApplicationText Funktion hier einfügen
    }

    const editButton = document.getElementById('editButton');
    if (editButton) {
        editButton.addEventListener('click', backToEdit);
    }

    // Auto-Speichern bei Eingaben
    applicationForm.querySelectorAll('input, textarea, select').forEach(field => {
        field.addEventListener('input', saveFormData);
    });

    // Lade gespeicherte Daten beim Start
    loadFormData();


});
