// server.mjs or index.mjs
import dotenv from "dotenv";
import axios from "axios";
import { WebSocketServer } from "ws";

dotenv.config();

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;

const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`✅ WebSocket Server running on ws://localhost:${PORT}`);
});

wss.on("connection", (ws) => {
  console.log("🔌 Client connected");

  ws.on("message", async (message) => {
    const city = message.toString().trim();
    console.log(`📩 Received city: ${city}`);

    try {
      // Step 1: Get coordinates
      const geoRes = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
      );

      if (!geoRes.data.length) {
        ws.send(JSON.stringify({ error: `City "${city}" not found.` }));
        return;
      }

      const { lat, lon, name } = geoRes.data[0];

      // Step 2: Get AQI
      const aqiRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );

      const data = aqiRes.data.list[0];
      const aqiIndex = data.main.aqi;
      const aqiLevels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
      const pollutants = data.components;

      ws.send(JSON.stringify({
        city: name || city,
        lat,
        lon,
        aqiIndex,
        aqiLevel: aqiLevels[aqiIndex - 1],
        advice: getAQIAdvice(aqiIndex),
        pollutants
      }));
    } catch (error) {
      console.error("❌ Error fetching AQI:", error.message);
      ws.send(JSON.stringify({ error: "Could not fetch AQI" }));
    }
  });

  ws.on("close", () => {
    console.log("❎ Client disconnected");
  });
});

function getAQIAdvice(aqi) {
  switch (aqi) {
    case 1: return "Air quality is good. Enjoy your day!";
    case 2: return "Air quality is fair. No major risks.";
    case 3: return "Air quality is moderate. Sensitive individuals should take caution.";
    case 4: return "Air quality is poor. Reduce outdoor activity.";
    case 5: return "Air quality is very poor. Avoid outdoor activities.";
    default: return "Unknown AQI level.";
  }
}
