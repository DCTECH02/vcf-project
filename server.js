
const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

// In-memory storage for sessions
const sessions = {};

// Route: Dashboard
app.get("/", (req, res) => {
  res.render("dashboard", { sessions });
});

// Route: Create New Session
app.post("/register", (req, res) => {
  const { groupLink, isAdmin, adminName } = req.body;
  const sessionId = uuidv4();

  // Create session
  sessions[sessionId] = {
    groupLink,
    isAdmin,
    adminName,
    contacts: [],
    expiresAt: Date.now() + 3600000, // 1-hour timer
  };

  res.json({ sessionId, link: `/session/${sessionId}` });
});

// Route: Add Contact to Session
app.post("/session/:id/add", (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  if (!sessions[id]) {
    return res.status(404).json({ error: "Session not found" });
  }

  sessions[id].contacts.push({ name, phone });
  res.json({ success: true });
});

// Route: Download VCF File
app.get("/session/:id/download", (req, res) => {
  const { id } = req.params;

  if (!sessions[id]) {
    return res.status(404).json({ error: "Session not found" });
  }

  const session = sessions[id];
  const vCard = require("vcard-creator");
  const card = new vCard();

  session.contacts.forEach((contact) => {
    card.addName(contact.name);
    card.addPhoneNumber(contact.phone);
  });

  const filePath = `./downloads/${id}.vcf`;
  fs.writeFileSync(filePath, card.toString());
  res.download(filePath, "contacts.vcf", () => {
    // Cleanup
    delete sessions[id];
    fs.unlinkSync(filePath);
  });
});

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    