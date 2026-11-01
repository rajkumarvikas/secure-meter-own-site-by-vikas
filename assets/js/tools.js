/*
  TOOL LIST - edit this file to add, rename, reorder or remove tools.
  Each tool lives in its own folder under tools/ (index.html + style.css + app.js).
  id      : used in the page address (#id) - letters, digits and hyphens only
  path    : the tool's main page, relative to the project root
  icon    : search | chart | file | mail | layers | calendar   (picture on the Home card)
  color   : colour of the Home card icon
*/
window.TOOLS = [
  {
    id: "meter-search",
    name: "Meter & Substation Search",
    short: "Search",
    icon: "search",
    color: "#2f6fb0",
    path: "tools/meter-search/index.html",
    description: "Look up any number of meter serial numbers or substation names at once.",
    worksWith: "Excel or CSV register",
    button: "Open Search"
  },
  {
    id: "non-amr-bis",
    name: "Non AMR and BIS Report",
    short: "Non AMR and BIS",
    icon: "chart",
    color: "#d9822b",
    path: "tools/non-amr-bis/index.html",
    description: "AMR communication, BIS power quality and a combined view of Non-AMR meter ageing.",
    worksWith: "Meter-wise and BIS CSV files",
    button: "Open report"
  },
  {
    id: "case-study",
    name: "Case Study",
    short: "Case Study",
    icon: "file",
    color: "#7a5ccf",
    path: "tools/case-study/index.html",
    description: "Turn a WhatsApp export into date-wise meter PDFs with the Case Study front page.",
    worksWith: "WhatsApp export ZIP",
    button: "Open Case Study"
  },
  {
    id: "agdt-letters",
    name: "AGDT Letter Generator",
    short: "Letters",
    icon: "mail",
    color: "#1f9d78",
    path: "tools/agdt-letters/index.html",
    description: "Pick a meter, set the outward number and remark, then create the letter PDF and updated Excel.",
    worksWith: "AGDT_Letter.xlsx",
    button: "Open Letters"
  },
  {
    id: "agdt-1983",
    name: "1983 AGDT Processor",
    short: "1983",
    icon: "layers",
    color: "#c8453f",
    path: "tools/agdt-1983/index.html",
    description: "Load the six files, run the process and export the updated 1983 workbook.",
    worksWith: "1983 workbook and 5 data files",
    button: "Open 1983 Processor"
  },
  {
    id: "attendance",
    name: "Attendance Record",
    short: "Attendance",
    icon: "calendar",
    color: "#0e8aa0",
    path: "tools/attendance/index.html",
    description: "Mark daily attendance, see the monthly grid with totals, export to Excel or CSV.",
    worksWith: "Employee list (CSV, optional)",
    button: "Open Attendance"
  },
];
