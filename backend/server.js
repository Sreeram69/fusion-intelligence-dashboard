const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const axios = require("axios");

// 🔥 TRANSLATION (UNCHANGED)
const translateText = async (text) => {
  try {
    const res = await axios.get(
      "https://translate.googleapis.com/translate_a/single",
      {
        params: {
          client: "gtx",
          sl: "auto",
          tl: "en",
          dt: "t",
          q: text
        }
      }
    );

    return res.data[0].map(t => t[0]).join("");
  } catch (err) {
    console.log("Translation failed");
    return text;
  }
};

// 🔥 ✅ MOVED HERE (ONLY FIX — NOTHING CHANGED)
const getRealCoordinates = async (text) => {
  try {
    const res = await axios.get(
      "https://api.opencagedata.com/geocode/v1/json",
      {
        params: {
          q: text,
          key: "584eaa4267634879809d490439429737",
          limit: 1
        }
      }
    );

    const result = res.data.results[0];

    if (result) {
      return {
        lat: result.geometry.lat,
        lng: result.geometry.lng
      };
    }

    return null;
  } catch (err) {
    console.log("Geocoding failed");
    return null;
  }
};

const app = express();

app.use(cors());
app.use(express.json());

// ✅ MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/intelligenceDB")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// 🔥 CACHE
let cachedOSINT = [];
let lastFetchTime = 0;

// Schema
const intelSchema = new mongoose.Schema({
  type: String,
  title: String,
  description: String,
  lat: Number,
  lng: Number,
  image: [String],
  timestamp: { type: Date, default: Date.now }
});

const Intel = mongoose.model("Intel", intelSchema);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ✅ GET data
app.get("/api/intel", async (req, res) => {
  try {
    const data = await Intel.find();

    const safeData = data.map(item => ({
      ...item._doc,
      lat: item.lat ?? (20 + Math.random() * 10),
      lng: item.lng ?? (75 + Math.random() * 10)
    }));

    res.json(safeData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// ✅ ADD sample data
app.get("/add", async (req, res) => {
  try {
    await Intel.insertMany([
      {
        type: "OSINT",
        title: "Suspicious Activity",
        description: "Movement detected",
        lat: 28.61,
        lng: 77.20,
      },
      {
        type: "HUMINT",
        title: "Field Report",
        description: "Crowd gathering",
        lat: 28.70,
        lng: 77.10,
      },
      {
        type: "IMINT",
        title: "Satellite Image",
        description: "New structure spotted",
        lat: 28.53,
        lng: 77.39,
      }
    ]);

    res.send("Sample Data Added ✅");
  } catch {
    res.status(500).send("Failed to add sample data");
  }
});

// 🔥 BULK INSERT
app.post("/api/intel/bulk", async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];

    await Intel.deleteMany({});
    await Intel.insertMany(items);

    res.json({ message: "Data replaced successfully" });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

// 🔥 DELETE ALL
app.delete("/api/intel", async (req, res) => {
  try {
    await Intel.deleteMany({});
    res.json({ message: "All data cleared" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

// 🔥 MULTER
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 🔥 IMAGE UPLOAD
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    imageUrl: `/uploads/${req.file.filename}`,
  });
});

// 🔥 SERVE IMAGES
app.use("/uploads", express.static("uploads"));

// 📍 Location mapping (UNCHANGED)
const getCoordinatesFromText = (text) => {
  if (!text) return null;

  const lower = text.toLowerCase();

  const advancedMap = {
    delhi: { lat: 28.6139, lng: 77.2090 },
    mumbai: { lat: 19.0760, lng: 72.8777 },
    chennai: { lat: 13.0827, lng: 80.2707 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    kolkata: { lat: 22.5726, lng: 88.3639 },
    hyderabad: { lat: 17.3850, lng: 78.4867 },
    tamil: { lat: 11.1271, lng: 78.6569 },
    tamilnadu: { lat: 11.1271, lng: 78.6569 },
    kerala: { lat: 10.8505, lng: 76.2711 },
    valparai: { lat: 10.3269, lng: 76.9558 },
    jaipur: { lat: 26.9124, lng: 75.7873 },
    lucknow: { lat: 26.8467, lng: 80.9462 }
  };

  for (let place in advancedMap) {
    if (lower.includes(place)) {
      return advancedMap[place];
    }
  }

  return null;
};

// 🔥 OSINT API (UNCHANGED LOGIC)
app.get("/api/osint", async (req, res) => {
  const now = Date.now();

  if (now - lastFetchTime < 5 * 60 * 1000 && cachedOSINT.length > 0) {
    return res.json({ message: "Cached data", data: cachedOSINT });
  }

  try {
    const response = await axios.get(
      "https://gnews.io/api/v4/top-headlines?country=in&token=de69d0ca87dae44e2233e8c1f9952f6b"
    );

    let articles = response.data.articles || [];

    const formattedData = articles
      .slice(0, 3)
      .map(async (item) => {
        if (!item || !item.title) return null;

        let title = item.title || "No title";
        let description = item.description || "No description";

        try {
          title = await translateText(title);
          description = await translateText(description);
        } catch {}

        const text = `${item.title || ""} ${item.description || ""}`;

        let coords = await getRealCoordinates(text);

        if (!coords) {
          coords = getCoordinatesFromText(text);
        }

        return {
          type: "OSINT",
          title,
          description,
          originalTitle: item.title,
          originalDescription: item.description,
          lat: coords ? coords.lat : 20 + Math.random() * 10,
          lng: coords ? coords.lng : 75 + Math.random() * 10,
          image: item.image ? [item.image] : []
        };
      });

    const resolvedData = (await Promise.all(formattedData)).filter(Boolean);

    cachedOSINT = resolvedData;
    lastFetchTime = now;

    await Intel.deleteMany({ type: "OSINT" });
    await Intel.insertMany(resolvedData);

    res.json({ message: "OSINT updated", data: resolvedData });

  } catch (error) {
    if (cachedOSINT.length > 0) {
      return res.json({ data: cachedOSINT });
    }

    res.status(500).json({ error: "OSINT fetch failed" });
  }
});

// 🔥 AUTO FETCH
setInterval(async () => {
  try {
    await axios.get("http://localhost:5000/api/osint");
  } catch {}
}, 300000);

// ✅ START SERVER
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});