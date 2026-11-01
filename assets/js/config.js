/*
  SETTINGS FOR OPTIONAL FEATURES

  Google Drive file picker
  ------------------------
  Leave the three values empty and the feature stays OFF (nothing changes in the tools).
  Fill clientId and apiKey and a "Pick from Google Drive" button appears under every
  file-upload box in every tool.

  It only works when the project is opened through a web address
  (for example http://localhost:8000 or your company website), NOT by double-clicking
  index.html, because Google blocks sign-in from file:// pages. See README.md, section
  "Google Drive setup".

    clientId : OAuth client ID  (Google Cloud Console > APIs & Services > Credentials)
    apiKey   : API key          (same page; restrict it to the Picker API)
    appId    : project number   (optional; Google Cloud Console > Dashboard > Project number)
*/
window.APP_CONFIG = {
  googleDrive: {
    clientId: "",
    apiKey: "",
    appId: ""
  }
};
