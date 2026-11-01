# Secure Meter

A set of offline tools in one project.

Open `index.html` in a browser (double-click is enough, no server, no install, no internet needed). It looks and works the same however you open it.

## Folder layout

```
secure-meter/
├── index.html                  Main page (left navigation, Home, header)
├── assets/
│   ├── css/shell.css           Styles of the main page
│   ├── css/nav.css             Left navigation: icon tiles and hover effects
│   ├── css/home.css            Styles of the Home page (banner and tool cards)
│   ├── css/slider.css          Styles of the Home slider
│   ├── js/developer.js         DEVELOPER INFO shown top right (name, role, code, extra lines)
│   ├── js/tools.js             LIST OF TOOLS (names, descriptions, folders)
│   ├── js/config.js            SETTINGS for optional features (Google Drive keys)
│   ├── js/drive-picker.js      "Pick from Google Drive" button for every upload box
│   ├── js/shell.js             Navigation logic of the main page
│   ├── js/slides.js            SLIDES of the Home slider (edit text and pictures here)
│   ├── js/slider.js            Slider logic (autoplay, arrows, dots, swipe)
│   └── img/
│       ├── profile.jpg         Photo shown in the header
│       └── slides/             The slider pictures (offline SVG files)
├── tools/                      One folder per tool, each with its own files
│   ├── meter-search/           Meter & Substation Search
│   ├── non-amr-bis/            Non AMR and BIS Report
│   ├── case-study/             Case Study (WhatsApp ZIP -> meter PDFs)
│   │   └── data/trk-data.js    Meter tracker data (large)
│   ├── agdt-letters/           AGDT Letter Generator
│   │   └── data/images.js      Logo, footer and signature images
│   ├── agdt-1983/              1983 AGDT Processor
│   └── attendance/             Attendance Record (index.html, style.css, app.js, xlsx-writer.js)
├── vendor/                     Third-party libraries shared by the tools
│   ├── jszip.min.js            (case-study, agdt-letters, agdt-1983, attendance)
│   ├── jspdf.umd.min.js        (case-study)
│   └── pdf-lib.min.js          (agdt-letters)
└── scripts/csv_to_js.py        Helper to refresh the case-study data
```

Every tool folder follows the same pattern: `index.html` (page structure), `style.css` (look), `app.js` (logic).

## Left navigation

The navigation on the left is always visible, on Home and inside every tool. Each tool has its own coloured icon tile. Moving the mouse over an item tilts and lifts the icon, a soft glow follows the pointer, and the active item gets a coloured bar. You can also move with the Up and Down arrow keys. The pictures and colours are set in `assets/js/tools.js` (`icon`, `color`); the effects are in `assets/css/nav.css`.

## Home slider

The slider on the Home page works completely offline: its pictures are files inside the project (`assets/img/slides/`), with no internet needed.
- It plays by itself every 6 seconds and stops while the mouse is over it, while you use the keyboard on it, or when you press the pause button. Arrows, dots, Left/Right keys and swiping all work.
- **Change the slides:** edit `assets/js/slides.js` (tag, title, text, optional button).
- **Use real photos:** copy a wide picture (about 3:1, for example 1200 x 400, PNG or JPG) into `assets/img/slides/` and write its file name in `slides.js`. Photos from the company website can be used this way: save them once into that folder and they will work offline.
- The five included pictures are drawings made for this project, and the text is a short summary of public company information.

## Home page

The Home page has a greeting banner, the slider and one card for each tool. Click a card (or the button on it) to open the tool. The page is the same whether you open `index.html` by double-click or from a web address.

## Attendance Record tool

Open it from the sidebar. Four tabs:

- **Daily**: pick a date, set each employee to Present / Absent / Leave / Half Day / Week Off / Holiday, with optional in/out time and remark. "Mark all Present" fills the unmarked ones.
- **Monthly**: grid of employees by day with totals. Click a cell to change its status. "Mark Sundays as Week Off" fills empty Sundays.
- **Employees**: add, delete, or import from a CSV (columns: Code, Name, Department).
- **Export & Backup**: download the month as Excel (.xlsx with a monthly sheet and a daily log sheet) or CSV, and save or restore a backup (.json).

Data is saved in the browser on that computer only. Download a backup regularly, and use it to move the data to another computer.
To change the status list (for example add "Work From Home"), edit the `STATUS` list at the top of `tools/attendance/app.js` and the colour variables in `style.css`.

## Google Drive setup (optional)

By default every tool picks files from your computer. To also get a **Pick from Google Drive** button under every upload box:

1. Go to Google Cloud Console and create a project. Enable the **Google Picker API** and the **Google Drive API**.
2. Create an **OAuth client ID** (type: Web application). Under "Authorized JavaScript origins" add the address you will open the project from, for example `http://localhost:8000`.
3. Create an **API key** and restrict it to the Picker API.
4. Put the values in `assets/js/config.js` (`clientId`, `apiKey`, and optionally `appId` = the project number).
5. Open the project through a web address, not by double-click. The simplest way on your computer: open a terminal in the `secure-meter` folder and run `python -m http.server 8000`, then open `http://localhost:8000`.

Notes:
- Google blocks sign-in from `file://` pages, so the button stays hidden when you double-click `index.html`. Nothing else changes.
- Google Sheets are converted to .xlsx when picked. Google Docs and Slides are not supported: download them from Drive first.
- You can only pick files the person signing in can open. The first time, Google asks for permission.
- The button needs an internet connection. The tools themselves keep working offline.

## How to change things

| I want to... | Edit this |
|---|---|
| Change the text or look of a tool | `tools/<tool>/index.html` and `style.css` |
| Change how a tool works | `tools/<tool>/app.js` |
| Change letter wording, remarks or "To" list | `tools/agdt-letters/app.js` (`REM`, `TOS`, and the `letter()` function) |
| Change logo / signature on the letters | `tools/agdt-letters/data/images.js` |
| Rename a tool or change its description on Home | `assets/js/tools.js` |
| Change colours/layout of the sidebar and header | `assets/css/shell.css` |
| Change the look of the Home banner and tool cards | `assets/css/home.css` |
| Change the developer name, role, code or photo (top right) | `assets/js/developer.js` and `assets/img/profile.jpg` |
| Show more developer info (email, phone, ...) | add lines to `extra` in `assets/js/developer.js` |
| Update the case-study meter data | `python scripts/csv_to_js.py new.csv` |
| Change attendance statuses or export columns | `tools/attendance/app.js` |
| Turn the Google Drive button on or off | `assets/js/config.js` |

## Add a new tool

1. Copy any folder under `tools/` (for example `agdt-1983`) and rename it, e.g. `tools/my-tool`.
2. Edit its `index.html`, `style.css` and `app.js`.
3. Add one entry in `assets/js/tools.js` pointing `path` to `tools/my-tool/index.html`.

It then appears automatically in the sidebar and on Home.

## Notes

- Keep the folder structure as it is: tools load the libraries with relative paths such as `../../vendor/jszip.min.js`.
- **Fully offline.** Everything works without internet except one library: Meter & Substation Search reads Excel files with SheetJS, which it takes from the internet unless you save a copy as `vendor/xlsx.full.min.js` (download `xlsx.full.min.js`, version 0.18.5, from the SheetJS website once). Fonts are no longer loaded from the internet.
- After editing a file, refresh the browser (Ctrl+F5) to see the change.
