const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = process.env.PORT || 3000;

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "j39Dkd8!_Random#Key_2025!!",
    resave: false,
    saveUninitialized: false,
  })
);

/* ---------- MYSQL (RAILWAY FIXED) ---------- */
const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQL_PORT),
  ssl: {
    rejectUnauthorized: false,
  },
});

/* TEST CONNECTION */
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB CONNECTION FAILED:", err.message);
  } else {
    console.log("✅ Railway MySQL Connected");
    conn.release();
  }
});

/* ---------- ADMIN LOGIN ---------- */
app.post("/adminlogin", (req, res) => {
  const { busid, password } = req.body;

  db.query(
    "SELECT * FROM adminn WHERE busid=? AND password=?",
    [busid, password],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });

      if (rows.length) {
        req.session.user = { role: "admin", busid };
        res.json({ redirect: "/admindashboard.html" });
      } else {
        res.json({ message: "Invalid Admin credentials" });
      }
    }
  );
});

/* ---------- ADMIN REGISTER ---------- */
app.post("/adminregister", (req, res) => {
  const { busid, password } = req.body;

  db.query(
    "INSERT INTO adminn (busid, password) VALUES (?,?)",
    [busid, password],
    (err) => {
      if (err) return res.json({ message: "Admin already exists" });
      res.json({ redirect: "/admindashboard.html" });
    }
  );
});

/* ---------- STUDENT LOGIN ---------- */
app.post("/studentlogin", (req, res) => {
  const { busid, password } = req.body;

  db.query(
    "SELECT * FROM logiin WHERE busid=? AND password=?",
    [busid, password],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });

      if (rows.length) {
        req.session.user = { role: "student", busid };
        res.json({ redirect: "/home.html" });
      } else {
        res.json({ message: "Student not found" });
      }
    }
  );
});

/* ---------- STUDENT REGISTER ---------- */
app.post("/studentregister", (req, res) => {
  const { busid, password } = req.body;

  db.query(
    "INSERT INTO logiin (busid, password) VALUES (?,?)",
    [busid, password],
    (err) => {
      if (err) return res.json({ message: "Student exists" });
      res.json({ redirect: "/home.html" });
    }
  );
});

/* ---------- FILE UPLOAD ---------- */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) =>
    cb(null, uuidv4() + path.extname(file.originalname)),
});

const upload = multer({ storage });
let lastUploaded = null;

app.post("/upload-schedule", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.json({ message: "No file uploaded" });
  lastUploaded = req.file.filename;
  res.json({ message: "Upload successful" });
});

app.get("/download-schedule", (req, res) => {
  if (!lastUploaded) return res.send("No file uploaded");
  res.download(path.join(uploadDir, lastUploaded));
});

/* ---------- SERVER ---------- */
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
