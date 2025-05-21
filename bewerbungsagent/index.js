//index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Lade Umgebungsvariablen
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API key aus Umgebungsvariablen oder sichere Quelle laden
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('⚠️ WARNUNG: Kein API-Key gefunden. Bitte setze OPENROUTER_API_KEY oder OPENAI_API_KEY in .env Datei');
}

// Startseite
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bewerbung generieren endpoint
app.post('/generate', async (req, res) => {
  try {
    // Extrahiere alle Daten aus dem Formular
    const {
      // Persönliche Daten
      firstName, lastName, age, email, phone,
      street, houseNumber, zipCode, city,
      job, education, experience, strengths, languages, motivation, style,
      
      // Firmendaten
      companyName, contactPerson, 
      companyStreet, companyHouseNumber, companyZipCode, companyCity,
      
      // DSGVO
      privacyConsent
    } = req.body;

    // Überprüfe DSGVO-Zustimmung explizit
    if (!privacyConsent || privacyConsent === 'off') {
      return res.status(400).json({ 
        error: 'Bitte stimme den Datenschutzbestimmungen zu.',
        field: 'privacyConsent' 
      });
    }

    // Überprüfe Pflichtfelder
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone',
      'street', 'houseNumber', 'zipCode', 'city',
      'job', 'education', 'experience', 'strengths', 'languages', 'motivation',
      'companyName', 'companyStreet', 'companyHouseNumber', 'companyZipCode', 'companyCity'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          error: `Pflichtfeld fehlt: ${field}`,
          field: field 
        });
      }
    }

    // Formatiere Bewerberadresse
    const applicantName = `${firstName} ${lastName}`;
    const applicantAddress = `${street} ${houseNumber}\n${zipCode} ${city}`;
    const applicantContact = `${email}\n${phone}`;
    
    // Formatiere Firmenadresse
    const companyAddress = `${companyName}${contactPerson ? '\nz.Hd. ' + contactPerson : ''}\n${companyStreet} ${companyHouseNumber}\n${companyZipCode} ${companyCity}`;
    
    // Definiere Bewerbungsstil
    let stylePrompt = "";
    switch(style) {
      case 'formal': 
        stylePrompt = "formellen, professionellen Stil"; 
        break;
      case 'creative': 
        stylePrompt = "kreativen, originellen Stil, der mich von anderen Bewerbern abhebt"; 
        break;
      case 'casual': 
        stylePrompt = "modernen, persönlichen Stil – dennoch professionell und respektvoll"; 
        break;
      default: 
        stylePrompt = "formellen, professionellen Stil";
    }

    // Erstelle den Prompt für das KI-Modell
    const prompt = `
Erstelle ein vollständiges professionelles Bewerbungsschreiben im deutschen DIN 5008 Standard mit allen notwendigen Elementen.
Das Bewerbungsschreiben soll folgenden Aufbau haben:
1. Absenderadresse
2. Empfängeradresse
3. Ort und Datum
4. Betreffzeile
5. Anrede
6. Einleitung
7. Hauptteil
8. Schluss mit Grußformel
9. Unterschrift

Der Stil soll einem ${stylePrompt} entsprechen.

Bewerberinformationen:
- Name: ${applicantName}${age ? '\n- Alter: ' + age + ' Jahre' : ''}
- Adresse: ${applicantAddress}
- Kontakt: ${applicantContact}
- Beruf: ${job}
- Ausbildung: ${education}
- Berufserfahrung: ${experience}
- Stärken & Fähigkeiten: ${strengths}
- Sprachkenntnisse: ${languages}
- Motivation: ${motivation}

Firmeninformationen:
- Firmenadresse: ${companyAddress}
`;

    // Verwende OpenRouter oder direkt die OpenAI API
    const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
    
    let endpoint, headers;
    
    if (useOpenRouter) {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bewerbungsagent.onrender.com', // Ändere dies in deine Domain
        'X-Title': 'Bewerbungsgenerator'
      };
    } else {
      endpoint = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      };
    }
    
    const response = await axios.post(
      endpoint,
      {
        model: useOpenRouter ? 'openai/gpt-3.5-turbo' : 'gpt-3.5-turbo',
        messages: [
          { role: "system", content: "Du bist ein professioneller Bewerbungsschreiber mit Expertise in deutschen Bewerbungsstandards." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      { headers }
    );

    const content = response?.data?.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Keine Antwort von der KI erhalten.");
    }

    // Formatiere die Bewerbung als HTML
    const formattedApplication = formatApplicationAsHTML(content);
    
    res.json({ 
      application: formattedApplication,
      rawText: content 
    });
    
  } catch (error) {
    console.error('❌ API-Fehler:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Fehler bei der Bewerbungserstellung: ' + (error.response?.data?.error?.message || error.message),
    });
  }
});

// Verbesserte Formatierungsfunktion mit korrekter HTML-Struktur
function formatApplicationAsHTML(text) {
  // Teile den Text in Zeilen auf
  const lines = text.split('\n');
  let html = '<div class="application-letter">\n';
  
  // Identifiziere die verschiedenen Abschnitte der Bewerbung
  let currentSection = null;
  let sectionContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    let newSection = null;
    
    // Bestimme den Abschnitt basierend auf Zeileninhalt und Position
    if (line === '') {
      // Leerzeile - füge einen Spacer hinzu, wenn wir uns in einem Abschnitt befinden
      if (currentSection) {
        sectionContent.push('<div class="spacer"></div>');
      }
      continue;
    }
    
    // Abschnittserkennung
    if (i < 8 && (line.includes('Straße') || line.includes('Str.') || line.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/))) {
      newSection = 'sender-address';
    }
    else if (i < 15 && (line.match(/^\d{1,2}\.\d{1,2}\.\d{4}/) || line.match(/^[A-Z][a-zäöüß]+,\s+\d{1,2}\.\s+[A-Za-zäöß]+\s+\d{4}/))) {
      newSection = 'date';
    }
    else if (i < 20 && (line.toLowerCase().includes('betr') || line.toLowerCase().includes('bewerbung als'))) {
      newSection = 'subject';
    }
    else if (i < 25 && (line.toLowerCase().includes('sehr geehrte') || line.toLowerCase().includes('hallo') || line.toLowerCase().includes('liebe'))) {
      newSection = 'greeting';
    }
    else if (i > lines.length - 8 && (line.toLowerCase().includes('freundliche') || line.toLowerCase().includes('grüße') || line.toLowerCase().includes('hochachtungsvoll'))) {
      newSection = 'closing';
    }
    else if (i > lines.length - 5) {
      newSection = 'signature';
    }
    else if (i > 20) {
      newSection = 'body';
    }
    
    // Bei Abschnittswechsel, schließe den aktuellen Abschnitt ab und beginne einen neuen
    if (newSection && newSection !== currentSection) {
      // Schließe den vorherigen Abschnitt ab, wenn vorhanden
      if (currentSection && sectionContent.length > 0) {
        html += `<div class="${currentSection}">\n`;
        html += sectionContent.join('\n');
        html += `\n</div>\n`;
        sectionContent = [];
      }
      
      // Setze den neuen Abschnitt
      currentSection = newSection;
    }
    
    // Füge die aktuelle Zeile mit entsprechendem Markup hinzu
    if (currentSection === 'subject') {
      sectionContent.push(`<p><strong>${line}</strong></p>`);
    } else {
      sectionContent.push(`<p>${line}</p>`);
    }
  }
  
  // Schließe den letzten Abschnitt ab, wenn vorhanden
  if (currentSection && sectionContent.length > 0) {
    html += `<div class="${currentSection}">\n`;
    html += sectionContent.join('\n');
    html += `\n</div>\n`;
  }
  
  // Schließe das Hauptelement
  html += '</div>';
  
  return html;
}
app.listen(port, () => {
  console.log(`✅ Server läuft auf Port ${port}`);
});
