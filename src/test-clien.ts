import express from "express";
import nodemailer from "nodemailer";
import fs from "fs";

const app = express();
const PORT = 3000;

app.get("/send-email", async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "localhost",
      port: 2525,
      secure: true,
      auth: {
        user: "user@example.com",
        pass: "securepassword123"
      },
      tls: {
        rejectUnauthorized: false,
        ca: [fs.readFileSync("smtp-cert.pem")],
      },
    });

    const info = await transporter.sendMail({
      from: '"Test Client" <user@example.com>',
      to: "recipient@example.com",
      subject: "Hello ✔",
      text: "Hello world?",
      html: "<b>Hello world?</b>",
    });
    res.send(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Failed to send email");
  }
});

app.listen(PORT, () => {
  console.log(`Test client running at http://localhost:${PORT}`);
});
