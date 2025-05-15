// main.js Hauptskript für den Bewerbungsgenerator
document.addEventListener('DOMContentLoaded', function() {
    // Hole DOM-Elemente
    const applicationForm = document.getElementById('applicationForm');
    const privacyConsent = document.getElementById('privacyConsent');
    const privacyError = document.getElementById('privacyError');
    
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
    document.querySelector('.container').appendChild(statusContainer);
    
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    
    // Elemente für die Ergebnisanzeige
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';
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
    document.querySelector('.container').appendChild(resultContainer);
    
    // Verstecke anfangs die Ergebnis-Container
    loadingSpinner.style.display = 'none';
    errorMessage.style.display = 'none';
    resultContainer.style.display = 'none';
    
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
        // Validiere das Formular
        if (!validateForm()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        // Zeige Ladeanzeige
        loadingSpinner.style.display = 'flex';
        errorMessage.style.display = 'none';
        
        // Sammle alle Formulardaten
        const formData = new FormData(applicationForm);
        const formDataObj = {};
        
        formData.forEach((value, key) => {
            formDataObj[key] = value;
        });
        
        // Stelle sicher, dass der DSGVO-Status richtig übermittelt wird
        formDataObj.privacyConsent = privacyConsent.checked ? 'on' : 'off';
        
        // Formatiere Adressen für die API
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
            // API-Anfrage senden
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formDataObj)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Fehler bei der Bewerbungserstellung');
            }
            
            const data = await response.json();
            
            // Zeige die generierte Bewerbung an
            document.getElementById('applicationPreview').innerHTML = data.application;
            
            // Verstecke Ladeanimation und zeige Ergebnis
            loadingSpinner.style.display = 'none';
            applicationForm.parentElement.style.display = 'none';
            resultContainer.style.display = 'block';
            
            // Scrolle zum Ergebnis
            resultContainer.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            // Fehler anzeigen
            loadingSpinner.style.display = 'none';
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            
            // Scrolle zu Fehlermeldung
            errorMessage.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // PDF Herunterladen
    async function downloadPDF() {
        // PDF-Erstellung mit jsPDF (muss bereits eingebunden sein)
        try {
            // Lade jsPDF und html2canvas dynamisch, falls noch nicht geladen
            if (typeof jspdf === 'undefined') {
                const jsPDFScript = document.createElement('script');
                jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                document.head.appendChild(jsPDFScript);
                
                await new Promise(resolve => jsPDFScript.onload = resolve);
            }
            
            if (typeof html2canvas === 'undefined') {
                const html2canvasScript = document.createElement('script');
                html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                document.head.appendChild(html2canvasScript);
                
                await new Promise(resolve => html2canvasScript.onload = resolve);
            }
            
            const element = document.getElementById('applicationPreview');
            const fileName = `Bewerbung_${document.getElementById('firstName').value}_${document.getElementById('lastName').value}.pdf`;
            
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
            
        } catch (error) {
            console.error('PDF-Erstellung fehlgeschlagen:', error);
            alert('PDF-Erstellung fehlgeschlagen: ' + error.message);
        }
    }
    
    // Text in die Zwischenablage kopieren
    function copyApplicationText() {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = document.getElementById('applicationPreview').innerText;
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
        resultContainer.style.display = 'none';
        applicationForm.parentElement.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Event-Listener
    applicationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        generateApplication();
        saveFormData();
    });
    
    // Event-Listener speziell für die DSGVO-Checkbox
    privacyConsent.addEventListener('change', function() {
        if (this.checked) {
            privacyError.style.display = 'none';
        }
    });
    
    document.querySelector('button[type="reset"]').addEventListener('click', clearFormData);
    
    document.getElementById('downloadPdfButton').addEventListener('click', downloadPDF);
    document.getElementById('copyTextButton').addEventListener('click', copyApplicationText);
    document.getElementById('editButton').addEventListener('click', backToEdit);
    
    // Auto-Speichern bei Eingaben
    applicationForm.querySelectorAll('input, textarea, select').forEach(field => {
        field.addEventListener('input', saveFormData);
    });
    
    // Lade gespeicherte Daten beim Start
    loadFormData();
    
    // CSS für die neuen Elemente hinzufügen
    const additionalStyles = document.createElement('style');
    additionalStyles.textContent = `
        .status-container {
            margin-bottom: var(--spacing-lg);
        }
        
        .loading-spinner {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-lg);
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(52, 152, 219, 0.2);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: var(--spacing-md);
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error-message {
            display: none;
            padding: var(--spacing-md);
            background-color: #fee;
            color: #c00;
            border-radius: var(--border-radius);
            margin-bottom: var(--spacing-md);
        }
        
        .result-container {
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            padding: var(--spacing-lg);
            margin-bottom: var(--spacing-lg);
        }
        
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-lg);
            flex-wrap: wrap;
            gap: var(--spacing-md);
        }
        
        .result-actions {
            display: flex;
            gap: var(--spacing-sm);
            flex-wrap: wrap;
        }
        
        .application-preview {
            background-color: #fff;
            padding: var(--spacing-lg);
            border: 1px solid var(--light-gray);
            border-radius: var(--border-radius);
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.5;
        }
        
        /* Bewerbungs-Styling */
        .application-letter {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.5;
        }
        
        .sender-address {
            text-align: right;
            margin-bottom: var(--spacing-lg);
        }
        
        .date {
            text-align: right;
            margin-bottom: var(--spacing-lg);
        }
        
        .subject {
            margin-bottom: var(--spacing-lg);
        }
        
        .greeting {
            margin-bottom: var(--spacing-md);
        }
        
        .body p {
            margin-bottom: var(--spacing-md);
        }
        
        .closing {
            margin-top: var(--spacing-lg);
        }
        
        .signature {
            margin-top: var(--spacing-lg);
        }
        
        .spacer {
            height: var(--spacing-md);
        }
        
        @media print {
            body * {
                visibility: hidden;
            }
            
            .application-preview, .application-preview * {
                visibility: visible;
            }
            
            .application-preview {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 40px;
                border: none;
            }
        }
    `;
    document.head.appendChild(additionalStyles);
});
Claude
