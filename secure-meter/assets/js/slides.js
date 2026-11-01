/*
  HOME PAGE SLIDER - edit this list to change, add or remove slides.
  Everything here works offline: images are files inside assets/img/slides/.

    image : picture file (SVG, PNG or JPG). Keep it wide, about 3:1 (for example 1200 x 400).
            To use a real photo, copy it into assets/img/slides/ and put its file name here.
    tag   : small label above the title
    title : headline
    text  : one or two sentences
    cta   : optional button  { label: "Open ...", go: "tool-id" }   (tool ids are in assets/js/tools.js)
*/
window.SLIDES = [
  {
    image: "assets/img/slides/smart-metering.svg",
    tag: "Smart metering",
    title: "Smart meters for a smarter grid",
    text: "Secure Meters, based in Udaipur, builds metering and energy-management solutions, from smart grid meters to intelligent heating controls."
  },
  {
    image: "assets/img/slides/first-electronic-meter.svg",
    tag: "Our heritage",
    title: "India's first electronic energy meter, 1988",
    text: "Secure introduced the country's first electronic electricity meter in 1988 and has grown from there into a worldwide metering business."
  },
  {
    image: "assets/img/slides/revenue-protection.svg",
    tag: "Revenue protection",
    title: "Saving energy, stopping theft",
    text: "Smart metering helps conserve energy while fighting energy theft, protecting both utilities and honest consumers."
  },
  {
    image: "assets/img/slides/global-footprint.svg",
    tag: "Global footprint",
    title: "From Udaipur to the world",
    text: "Operations across South Asia, the Middle East, Europe, the UK, Australia and Africa, including large smart meter roll-outs in Victoria, Australia and the UK."
  },
  {
    image: "assets/img/slides/data-dashboard.svg",
    tag: "This workspace",
    title: "Your meter data, one dashboard",
    text: "Search meters, review AMR and BIS reports, build case studies and letters, and keep attendance, all in one place and fully offline.",
    cta: { label: "Open Non AMR and BIS Report", go: "non-amr-bis" }
  }
];
