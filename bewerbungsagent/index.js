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
console.log('API_KEY:', process.env.OPENROUTER_API_KEY);

const API_KEY = process.env.OPENROUTER_API_KEY;

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

    let stylePrompt = "";
    switch(style) {
      case 'formal': stylePrompt = "formellen, professionellen Stil"; break;
      case 'creative': stylePrompt = "kreativen, originellen Stil"; break;
      case 'casual': stylePrompt = "lockeren, persönlichen Stil – dennoch professionell"; break;
      default: stylePrompt = "formellen, professionellen Stil";
    }

    const prompt = `
Erstelle ausschließlich den Bewerbungstext ab der Anrede bis zur Grußformel. 
Kein Betreff, keine Adressen, kein Datum. Der Text soll dem deutschen DIN 5008 Standard folgen.

Struktur:
1. Anrede
2. Einleitung
3. Hauptteil
4. Schluss
5. Grußformel

Der Stil soll dem folgenden entsprechen: ${stylePrompt}

Bewerberinformationen:
- Name: ${applicantName}
- Beruf: ${job}
- Erfahrung: ${experience}
- Stärken: ${strengths}
- Ausbildung: ${education}
- Sprachen: ${languages}
- Motivation: ${motivation}
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

    const content = response?.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Keine Antwort von der KI erhalten.");

    const formattedApplication = `
      <div class="letterhead">
        <div class="contact-info">
          ${applicantName}<br>
          ${applicantContact.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div class="date">
        ${new Date().toLocaleDateString('de-DE')}
      </div>
      
      <div class="subject">
        <strong>Bewerbung als ${job}</strong>
      </div>
      
      ${content}
      
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
