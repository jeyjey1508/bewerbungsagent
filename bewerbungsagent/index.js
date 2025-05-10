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

// Fester API-Key direkt im Code (nicht über Umgebungsvariable)
const API_KEY = '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';

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

    // Pflichtfelder prüfen
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
Erstelle ein Bewerbungsschreiben ${stylePrompt} nach DIN 5008:

Bewerber:
- Name: ${applicantName}
- Kontakt: ${applicantContact}
- Beruf: ${job}
- Erfahrung: ${experience}
- Stärken: ${strengths}
- Ausbildung: ${education}
- Sprachen: ${languages}
- Motivation: ${motivation}

Firma:
- Name: ${companyName}
- Adresse: ${companyAddress}
- Kontakt: ${contactPerson}

Struktur:
1. Absender (rechts)
2. Empfänger (links)
3. Datum (rechts)
4. Betreffzeile
5. Anrede
6. Einleitung
7. Hauptteil
8. Schluss
9. Grußformel
`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: "system", content: "Du bist ein professioneller Bewerbungsschreiber." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bewerbungsagent.onrender.com',
          'X-Title': 'Bewerbungsagent'
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
        Musterstadt, ${new Date().toLocaleDateString('de-DE')}
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
    console.error('❌ OpenRouter-Fehler:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Fehler bei der Bewerbungserstellung: ' + (error.response?.data?.error?.message || error.message),
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server läuft auf Port ${port}`);
});
