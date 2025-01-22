const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

// In-memory storage for sessions
const sessions = {};

// Route: Dashboard
app.get("/", (req, res) => {
  res.render("dashboard", { sessions });
});

// Route: New Session Form
app.get("/new", (req, res) => {
  res.render("register");
});

// Route: Create New Session
app.post("/register", (req, res) => {
  const { groupName, countdownTime, phoneNumber } = req.body;

  // Validate phone number format
  const phoneRegex = /^\+\d{1,3}\d{4,14}(?:x\d+)?$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).send("Invalid phone number format. Use international format like +2349066528353.");
  }

  // Validate countdown time (max 24 hours)
  const countdownInMs = parseInt(countdownTime, 10) * 60 * 60 * 1000; // Convert hours to milliseconds
  if (isNaN(countdownInMs) || countdownInMs > 24 * 60 * 60 * 1000) {
    return res.status(400).send("Invalid countdown time. Maximum is 24 hours.");
  }

  const sessionId = uuidv4();
  const expiresAt = Date.now() + countdownInMs;

  // Create session
  sessions[sessionId] = {
    groupName,
    phoneNumber,
    contacts: [],
    expiresAt,
  };

  res.redirect(`/session/${sessionId}`);
});

// Route: View Session
app.get("/session/:id", (req, res) => {
  const { id } = req.params;

  if (!sessions[id]) {
    return res.status(404).send("Session not found");
  }

  const session = sessions[id];
  const timeRemaining = session.expiresAt - Date.now();

  if (timeRemaining > 0) {
    res.render("countdown", { timeRemaining, groupName: session.groupName });
  } else {
    res.render("download", { groupName: session.groupName, phoneNumber: session.phoneNumber });
  }
});

// Route: Add Contact to Session
app.post("/session/:id/add", (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  if (!sessions[id]) {
    return res.status(404).send("Session not found");
  }

  sessions[id].contacts.push({ name, phone });
  res.redirect(`/session/${id}`);
});

// Route: Download VCF File
app.get("/session/:id/download", (req, res) => {
  const { id } = req.params;

  if (!sessions[id]) {
    return res.status(404).send("Session not found");
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