const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Root Route liefert HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OpenRouter API-Key
const API_KEY = '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';

// POST-Route zur Generierung der Bewerbung
app.post('/generate', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      job,
      experience,
      strengths,
      education,
      languages,
      motivation,
      style
    } = req.body;

    if (!firstName || !lastName || !job || !experience || !strengths || !education || !languages || !motivation) {
      return res.status(400).json({ error: 'Alle Pflichtfelder müssen ausgefüllt sein.' });
    }

    const applicantName = `${firstName} ${lastName}`;
    const applicantContact = `${address}\n${email}\n${phone}`;

    const companyName = "Musterfirma GmbH";
    const companyAddress = "Musterstraße 123\n12345 Musterstadt";
    const contactPerson = "Frau Müller";

    let stylePrompt = "";
    switch(style) {
      case 'formal': stylePrompt = "im formellen, professionellen Stil"; break;
      case 'creative': stylePrompt = "im kreativen, innovativen Stil mit originellen Formulierungen"; break;
      case 'casual': stylePrompt = "im lockeren, persönlichen Stil, aber dennoch professionell"; break;
      default: stylePrompt = "im formellen, professionellen Stil";
    }

    const prompt = `
Erstelle ein vollständiges Bewerbungsschreiben ${stylePrompt} nach DIN 5008-Standard. 

Bewerber-Informationen:
- Name: ${applicantName}
- Kontakt: ${applicantContact}
- Angestrebte Position: ${job}
- Berufserfahrung: ${experience}
- Stärken & Fähigkeiten: ${strengths}
- Ausbildung: ${education}
- Sprachkenntnisse: ${languages}
- Motivation: ${motivation}

Firma:
- Name: ${companyName}
- Adresse: ${companyAddress}
- Kontaktperson: ${contactPerson}

Das Bewerbungsschreiben soll folgende Elemente enthalten:
1. Absenderadresse oben rechts (rechtsbündig)
2. Empfängeradresse (linksbündig)
3. Ort und Datum rechts
4. Betreffzeile
5. Anrede
6. Einleitung mit Bezug zur Position
7. Hauptteil mit Qualifikationen, Erfahrungen und Stärken
8. Abschluss mit Gesprächswunsch
9. Grußformel und Name

Achte auf einen professionellen Ton und vermeide typische Floskeln. Verwende keine Platzhalter, sondern generiere einen vollständigen, individuellen Text.
Formatiere das Ergebnis mit HTML-Tags für die Anzeige im Browser, einschließlich korrekter Absätze und Formatierung nach DIN 5008.
`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: "system", content: "Du bist ein professioneller Bewerbungsexperte." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const formattedApplication = `
      <div class="letterhead">
        <div class="company-info">
          ${companyName}<br>
          ${companyAddress.replace('\n', '<br>')}
          <br>
          z.Hd. ${contactPerson}
        </div>
        <div class="contact-info">
          ${applicantName}<br>
          ${applicantContact.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div class="date">
        Musterstadt, ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </div>
      
      <div class="subject">
        <strong>Bewerbung als ${job}</strong>
      </div>
      
      ${response.data.choices[0].message.content}
      
      <div class="signature">
        ${applicantName}
      </div>
    `;

    res.json({ application: formattedApplication });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Es gab einen Fehler bei der Erstellung der Bewerbung' });
  }
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
