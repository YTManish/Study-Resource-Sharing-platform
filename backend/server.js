require("dotenv").config(); // optional (can keep or remove)

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");

const app = express();

/* ========= MIDDLEWARE ========= */
app.use(cors());
app.use(express.json());

/* ========= CONNECT MONGODB (FIXED) ========= */
mongoose.connect("mongodb://127.0.0.1:27017/studyhub")
.then(() => console.log("✅ MongoDB Connected (Local)"))
.catch(err => console.log("❌ DB Error:", err));

/* ========= SCHEMAS ========= */
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: { type: String, default: "user" }
});

const resourceSchema = new mongoose.Schema({
    title: String,
    subject: String,
    type: String,
    content: String,
    user: String
});

const User = mongoose.model("User", userSchema);
const Resource = mongoose.model("Resource", resourceSchema);

/* ========= UPLOAD FOLDER ========= */
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

app.use("/uploads", express.static("uploads"));

/* ========= MULTER ========= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

/* ========= LOGIN ========= */
app.post("/login", async (req, res) => {

    const user = await User.findOne({
        email: req.body.email,
        password: req.body.password
    });

    if (user) {
        res.json({
            status: "success",
            email: user.email,
            name: user.name,
            role: user.role
        });
    } else {
        res.json({ status: "fail" });
    }
});

/* ========= SIGNUP ========= */
app.post("/signup", async (req, res) => {

    const exists = await User.findOne({ email: req.body.email });

    if (exists) {
        return res.send("User already exists");
    }

    await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: "user"
    });

    res.send("Signup successful");
});

/* ========= PDF UPLOAD ========= */
app.post("/upload/pdf", upload.single("file"), async (req, res) => {

    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const { title, subject, user } = req.body;

        await Resource.create({
            title,
            subject,
            type: "pdf",
            content: req.file.filename,
            user
        });

        res.send("PDF uploaded");

    } catch (err) {
        console.error(err);
        res.status(500).send("Error uploading PDF");
    }
});

/* ========= LINK / NOTE ========= */
app.post("/upload", async (req, res) => {

    await Resource.create(req.body);
    res.send("Uploaded");
});

/* ========= GET ========= */
app.get("/resources", async (req, res) => {

    const data = await Resource.find();
    res.json(data);
});

/* ========= DELETE ========= */
app.delete("/delete/:id", async (req, res) => {

    const { user, role } = req.query;

    const resource = await Resource.findById(req.params.id);

    if (!resource) return res.send("Not found");

    if (resource.user !== user && role !== "admin") {
        return res.send("Not allowed");
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.send("Deleted");
});

/* ========= ADMIN USER ========= */
(async () => {
    const admin = await User.findOne({ email: "admin@gmail.com" });

    if (!admin) {
        await User.create({
            name: "Admin",
            email: "admin@gmail.com",
            password: "admin123",
            role: "admin"
        });
        console.log("✅ Admin created");
    }
})();

/* ========= SERVER ========= */
app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});