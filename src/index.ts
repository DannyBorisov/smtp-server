import { SMTPServer, type SMTPServerOptions } from "smtp-server";
import fs from "fs";
import { authenticateUser } from "./users.js";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";

const appPassword = process.env.GMAIL_APP_PASSWORD || `kltu wuxz oyqt wulx`;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525');
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dannyboris1993@gmail.com",
    pass: appPassword,
  },
});

const getCertificates = () => {
  const certPath = process.env.SSL_CERT_PATH || "/app/certs/cert.pem";
  const keyPath = process.env.SSL_KEY_PATH || "/app/certs/key.pem";
  
  try {
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
  } catch (error) {
    console.warn("SSL certificates not found, running in non-secure mode");
    return null;
  }
};

const certificates = getCertificates();
const options: SMTPServerOptions = {
  secure: !!certificates,
  ...(certificates && { cert: certificates.cert, key: certificates.key }),
  onConnect(session, callback) {
    console.log("Client connected:", session.remoteAddress, session.user);
    callback(); // Accept the connection
  },

  onMailFrom(address, session, callback) {
    console.log("Mail from:", address.address);
    session.envelope = { mailFrom: address, rcptTo: [] };
    callback();
  },

  onRcptTo(address, session, callback) {
    console.log("Mail to:", address.address);
    session.envelope.rcptTo.push(address);
    callback();
  },

  onData(stream, session, callback) {
    console.log("Receiving email data...");
    let emailData = "";

    stream.on("data", (chunk) => {
      emailData += chunk.toString();
    });

    stream.on("end", async () => {
      try {
        const parsed = await simpleParser(emailData);

        const fromAddress = session.envelope.mailFrom
          ? session.envelope.mailFrom.address
          : "unknown";
        const toAddresses = session.envelope.rcptTo
          .map((addr) => (addr ? addr.address : "unknown"))
          .join(", ");

        // Use the first recipient as the forwarding destination
        const forwardToEmail = session.envelope.rcptTo[0]
          ? session.envelope.rcptTo[0].address || "dannyboris1993@gmail.com"
          : "dannyboris1993@gmail.com";

        console.log("Forwarding email:", {
          from: fromAddress,
          to: toAddresses,
          forwardTo: forwardToEmail,
          subject: parsed.subject,
          hasComplexHtml:
            parsed.html &&
            (parsed.html.includes("<img") ||
              parsed.html.includes("<table") ||
              parsed.html.includes("style=")),
        });

        // Check if email has complex HTML (images, tables, inline styles)
        const hasComplexHtml =
          parsed.html &&
          (parsed.html.includes("<img") ||
            parsed.html.includes("<table") ||
            parsed.html.includes("style=") ||
            parsed.html.includes("background") ||
            parsed.html.includes("font-") ||
            parsed.html.length > 1000);

        let emailContent;
        if (hasComplexHtml) {
          // Forward AS IS for complex HTML/marketing emails
          emailContent = {
            from: `"SMTP Forwarder" <dannyboris1993@gmail.com>`,
            to: forwardToEmail,
            subject: parsed.subject || "Forwarded Email",
            text: parsed.text,
            html: parsed.html,
            // Preserve attachments
            attachments: parsed.attachments || [],
          };
        } else {
          // Add forwarding headers for simple emails
          emailContent = {
            from: `"SMTP Forwarder" <dannyboris1993@gmail.com>`,
            to: forwardToEmail,
            subject: `Forwarded: ${parsed.subject || "No Subject"}`,
            text: `Original From: ${fromAddress}\nOriginal To: ${toAddresses}\n\n${
              parsed.text || ""
            }`,
            html: parsed.html
              ? `<div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
                <p><strong>Original From:</strong> ${fromAddress}</p>
                <p><strong>Original To:</strong> ${toAddresses}</p>
              </div>
              ${parsed.html}`
              : `<p><strong>Original From:</strong> ${fromAddress}</p>
               <p><strong>Original To:</strong> ${toAddresses}</p>
               <hr>
               <pre>${parsed.text || ""}</pre>`,
            attachments: parsed.attachments || [],
          };
        }

        const info = await transporter.sendMail({
          from: emailContent.from,
          to: emailContent.to,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html || undefined,
        });
        console.log("Email forwarded successfully:", info.messageId);
        callback();
      } catch (error) {
        console.error("Error forwarding email:", error);
        callback(new Error("Failed to forward email"));
      }
    });
  },

  onAuth(auth, session, callback) {
    console.log("Authentication attempt:", auth.username);
    if (!auth.username || !auth.password) {
      return callback(new Error("Username and password are required"));
    }
    const user = authenticateUser(auth.username, auth.password);
    if (user) {
      return callback(null, { user: user.email });
    }
    return callback(new Error("Invalid username or password"));
  },
};
const server = new SMTPServer(options);

server.on("error", (err) => {
  console.error("Error occurred in SMTP server:", err);
});

server.listen(SMTP_PORT, SMTP_HOST, () => {
  console.log(`SMTP server is listening on ${SMTP_HOST}:${SMTP_PORT}`);
});
