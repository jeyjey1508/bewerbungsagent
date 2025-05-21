// main.js Hauptskript für den Bewerbungsgenerator
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Ergebnis-Container erstellen und anhängen
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';
    resultContainer.id = 'resultContainer'; // Explizite ID hinzufügen
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
        <div id="applicationPreview" class="application-preview"></div>
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
    
    // Generiere vollständige Adresse aus den Feldern
    function formatAddress(street, houseNumber, zipCode, city) {
        return `${street} ${houseNumber}\n${zipCode} ${city}`;
    }
    
    // Bewerbung senden und generieren
    async function generateApplication() {
        // Debug-Ausgabe
        console.log("Generiere Bewerbung...");
        
        if (!validateForm()) {
            console.log("Formular nicht valide");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Zeige Ladeanzeige
        loadingSpinner.style.display = 'flex';
        errorMessage.style.display = 'none';

        // Sammle Formulardaten
        const formData = new FormData(applicationForm);
        const formDataObj = {};

        formData.forEach((value, key) => {
            formDataObj[key] = value;
        });

        formDataObj.privacyConsent = privacyConsent.checked ? 'on' : 'off';

        formDataObj.fullAddress = formatAddress(
            formDataObj.street,
            formDataObj.houseNumber,
            formDataObj.zipCode,
            formDataObj.city
        );

        formDataObj.companyFullAddress = formatAddress(
            formDataObj.companyStreet,
            formDataObj.companyHouseNumber,
            formDataObj.companyZipCode,
            formDataObj.companyCity
        );

        try {
            console.log("Sende Anfrage an Server...");
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
            console.log("Antwort erhalten:", data);

            // Überprüfe ob das Vorschau-Element existiert
            if (!applicationPreview) {
                console.error('Fehler: #applicationPreview Element nicht gefunden');
                throw new Error('Interner Fehler: Vorschau-Element fehlt');
            }

            console.log("HTML-Inhalt gesetzt:", data.application.substring(0, 50) + "...");

            // Alles anzeigen/verstecken
            loadingSpinner.style.display = 'none';
            applicationForm.parentElement.style.display = 'none';
            
            // Stellen sicher, dass resultContainer sichtbar ist und im DOM existiert
            const resultContainerElement = document.getElementById('resultContainer');
            if (resultContainerElement) {
                resultContainerElement.style.display = 'block';
                console.log("Ergebnis-Container sichtbar gemacht");
                
                // Scrolle zum Ergebnis
                resultContainerElement.scrollIntoView({ behavior: 'smooth' });
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
            // Lade jsPDF und html2canvas dynamisch, falls noch nicht geladen
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
            
            const element = document.getElementById('applicationPreview');
            if (!element) {
                throw new Error('Vorschau-Element nicht gefunden');
            }
            
            const firstName = document.getElementById('firstName').value || 'Bewerbung';
            const lastName = document.getElementById('lastName').value || '';
            const fileName = `Bewerbung_${firstName}_${lastName}.pdf`;
            
            console.log("Erstelle PDF...");
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Bewerbung in PDF umwandeln
            const canvas = await html2canvas(element, {
                scale: 2, // Höhere Qualität
                useCORS: true,
                logging: false
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210 - 40; // A4 Breite in mm (minus Ränder)
            const pageHeight = 297;  // A4 Höhe in mm
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 20; // Starte bei y = 20 mm für oberen Rand
            
            doc.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= pageHeight - 40; // 40 mm für oberen und unteren Rand
            
            // Füge weitere Seiten hinzu, falls nötig
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
        const applicationText = document.getElementById('applicationPreview');
        if (!applicationText) {
            console.error('Vorschau-Element nicht gefunden');
            return;
        }
        
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = applicationText.innerText;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        
        // Feedback anzeigen
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
        const resultContainerElement = document.getElementById('resultContainer');
        if (resultContainerElement) {
            resultContainerElement.style.display = 'none';
        }
        applicationForm.parentElement.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Event-Listener
    applicationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Formular abgesendet");
        generateApplication();
        saveFormData();
    });
    
    // Event-Listener speziell für die DSGVO-Checkbox
    privacyConsent.addEventListener('change', function() {
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
        downloadPdfButton.addEventListener('click', downloadPDF);
    }
    
    const copyTextButton = document.getElementById('copyTextButton');
    if (copyTextButton) {
        copyTextButton.addEventListener('click', copyApplicationText);
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
    
    // Debug-Ausgabe
    console.log("Bewerbungsgenerator initialisiert. DOM geladen.");
    console.log("Container vorhanden:", container ? true : false);
    console.log("Ergebnis-Container angehängt:", document.getElementById('resultContainer') ? true : false);
    console.log("Vorschau-Element vorhanden:", document.getElementById('applicationPreview') ? true : false);
});
