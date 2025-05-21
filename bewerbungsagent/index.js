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

// Formatiert die Bewerbung als HTML
function formatApplicationAsHTML(content) {
  // Falls die Bewerbung bereits HTML enthält, gib sie unverändert zurück
  if (content.includes('<div') || content.includes('<p>')) {
    return content;
  }

  // Wandle Zeilenumbrüche in HTML-Tags um
  let formattedContent = content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n([A-Za-z])/g, '<br>$1');

  // Füge die HTML-Struktur hinzu
  formattedContent = `
    <div class="application-letter">
      ${formattedContent}
    </div>
  `;

  return formattedContent;
}

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
    
    // Falls kein API-Key verfügbar ist, sende eine Dummy-Antwort zurück
    if (!API_KEY) {
      console.log("Kein API-Key vorhanden, sende Dummy-Bewerbung zurück");
      
      const dummyApplication = generateDummyApplication({
        firstName, lastName, age, email, phone,
        street, houseNumber, zipCode, city,
        job, education, experience, strengths, languages, motivation,
        companyName, contactPerson, companyStreet, companyHouseNumber, companyZipCode, companyCity
      });
      
      return res.json({
        application: dummyApplication,
        rawText: "Dummy-Bewerbung (kein API-Key verfügbar)"
      });
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
    
    // Generiere eine Dummy-Bewerbung als Fallback
    const dummyApplication = generateDummyApplication(req.body);
    
    res.json({
      application: dummyApplication,
      rawText: "Fallback-Bewerbung (API-Fehler: " + (error.response?.data?.error?.message || error.message) + ")"
    });
  }
});

// Generiere eine Dummy-Bewerbung für Entwicklungszwecke oder API-Ausfälle
function generateDummyApplication(data) {
  const {
    firstName = "Max", 
    lastName = "Mustermann", 
    email = "max.mustermann@example.com",
    phone = "+49 123 456789",
    street = "Musterstraße", 
    houseNumber = "42", 
    zipCode = "12345", 
    city = "Berlin",
    job = "Webentwickler",
    education = "Informatik-Studium",
    experience = "3 Jahre Erfahrung als Webentwickler",
    strengths = "HTML, CSS, JavaScript",
    languages = "Deutsch, Englisch",
    motivation = "Ich interessiere mich sehr für die ausgeschriebene Position",
    companyName = "Beispiel GmbH",
    contactPerson = "",
    companyStreet = "Firmenstraße",
    companyHouseNumber = "100",
    companyZipCode = "54321",
    companyCity = "München"
  } = data;

  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return `
  <div class="application-letter">
    <div class="sender-address">
      <p>${firstName} ${lastName}</p>
      <p>${street} ${houseNumber}</p>
      <p>${zipCode} ${city}</p>
      <p>${email}</p>
      <p>${phone}</p>
    </div>
    
    <div class="spacer"></div>
    
    <div class="receiver-address">
      <p>${companyName}</p>
      ${contactPerson ? `<p>z.Hd. ${contactPerson}</p>` : ''}
      <p>${companyStreet} ${companyHouseNumber}</p>
      <p>${companyZipCode} ${companyCity}</p>
    </div>
    
    <div class="date">
      <p>${city}, ${today}</p>
    </div>
    
    <div class="subject">
      <p><strong>Bewerbung als ${job}</strong></p>
    </div>
    
    <div class="greeting">
      <p>Sehr geehrte Damen und Herren,</p>
    </div>
    
    <div class="body">
      <p>hiermit bewerbe ich mich um die Position als ${job} in Ihrem Unternehmen.</p>
      
      <p>Zu meiner Person: Ich habe ${education} absolviert und verfüge über ${experience}. 
      Zu meinen Stärken zählen insbesondere ${strengths}. ${languages ? `Ich spreche fließend ${languages}.` : ''}</p>
      
      <p>${motivation}</p>
      
      <p>Ich freue mich auf ein persönliches Kennenlernen und stehe Ihnen für Rückfragen gerne zur Verfügung.</p>
    </div>
    
    <div class="closing">
      <p>Mit freundlichen Grüßen</p>
      <p>${firstName} ${lastName}</p>
    </div>
  </div>
  `;
}

// API-Status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    hasApiKey: !!API_KEY,
    provider: process.env.OPENROUTER_API_KEY ? 'OpenRouter' : (process.env.OPENAI_API_KEY ? 'OpenAI' : 'Keiner')
  });
});

// Starte den Server
app.listen(port, () => {
  console.log(`🚀 Bewerbungsgenerator läuft auf Port ${port}`);
  console.log(`📂 Statische Dateien werden aus ${path.join(__dirname, 'public')} bedient`);
  console.log(`🔑 API-Key ${API_KEY ? 'vorhanden' : 'FEHLT'}`);
  console.log(`🌐 API-Anbieter: ${process.env.OPENROUTER_API_KEY ? 'OpenRouter' : (process.env.OPENAI_API_KEY ? 'OpenAI' : 'Keiner')}`);
});
