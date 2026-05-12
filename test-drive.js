const { google } = require("googleapis");
const fs = require("fs");
const { Readable } = require("stream");

async function test() {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const credsMatch = envContent.match(/GOOGLE_SERVICE_ACCOUNT_JSON=(.+)/);
  const folderMatch = envContent.match(/GOOGLE_DRIVE_FOLDER_ID=(.+)/);

  const creds = JSON.parse(credsMatch[1]);
  const folderId = folderMatch[1].trim();

  console.log("Folder ID:", folderId);
  console.log("Service Account:", creds.client_email);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });

  // Test 1: List files in folder
  console.log("\n--- Test 1: List files in folder ---");
  try {
    const list = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size)",
      pageSize: 10,
    });
    console.log("Files found:", list.data.files.length);
    list.data.files.forEach((f) =>
      console.log(" -", f.name, `(${f.id})`)
    );
  } catch (e) {
    console.error("List error:", e.message);
  }

  // Test 2: Upload a small test file
  console.log("\n--- Test 2: Upload test file ---");
  try {
    const testContent = "Hello from media-uploader test! " + new Date().toISOString();
    const stream = new Readable();
    stream.push(testContent);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: "test-upload.txt",
        parents: [folderId],
      },
      media: {
        mimeType: "text/plain",
        body: stream,
      },
      fields: "id, name, webViewLink",
    });
    console.log("Upload SUCCESS:", res.data.name);
    console.log("File ID:", res.data.id);
    console.log("Link:", res.data.webViewLink);
  } catch (e) {
    console.error("Upload ERROR:", e.message);
    if (e.errors) console.error("Details:", JSON.stringify(e.errors, null, 2));
  }
}

test().catch(console.error);
