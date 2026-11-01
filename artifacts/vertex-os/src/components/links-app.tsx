import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, ChevronLeft, ChevronRight, Code2, Copy, ExternalLink, FileCode, Handshake, Link2, Search, Sparkles, Square, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { assetUrl } from "../asset-map";

const BASE = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const asset = (path: string) => assetUrl(BASE, path);

type DomainItem = { name: string; url: string; icon: string; shot: string; note: string; tint?: boolean };
type ProxyItem = { id: string; name: string; url: string; icon: string; shot: string };

const SHOT_OS = asset("images/domain-vertexos.webp");
const SHOT_FINDER = asset("images/domain-linkfinder.webp");

/** Every address that serves Vertex OS itself. */
const DOMAINS: DomainItem[] = [
  { name: "Netlify", url: "https://vertex-os-site.netlify.app/", icon: asset("images/netlify.png"), shot: SHOT_OS, note: "global cdn" },
  { name: "Vercel", url: "https://vertex-os-ebon.vercel.app/", icon: asset("images/vercel.png"), shot: SHOT_OS, note: "edge deploy" },
  { name: "GitHub Pages", url: "https://xkznn.github.io/VertexOS/", icon: asset("images/github.svg"), shot: SHOT_OS, note: "official site", tint: true },
  { name: "B-CDN", url: "https://s3westamazonaws.b-cdn.net/", icon: asset("images/v-cloud-logo.png"), shot: SHOT_OS, note: "second domain" },
  { name: "Bunny CDN", url: "https://vertexosweb.b-cdn.net/", icon: asset("images/v-cloud-logo.png"), shot: SHOT_OS, note: "our cdn mirror" },
  { name: "Link Finder", url: "https://link-finder.netlify.app/", icon: asset("images/links.svg"), shot: SHOT_FINDER, note: "our other tool" },
  { name: "HyperZHub", url: "https://hyperzhub.pages.dev/", icon: asset("images/hyperzhub-icon.png"), shot: asset("images/hyperzteam-preview.png"), note: "partner hub" },
];

/** Every proxy listed on the LazyList page, in the order that page shows them.
 *  Previews are their own card art; icons fall back to a letter tile when the
 *  site has no favicon we could reach. */
const PROXIES: ProxyItem[] = [
  { id: "hyperzhub", name: "HyperZHub", url: "https://hyperzhub.pages.dev/", icon: asset("images/hyperzhub-icon.png"), shot: asset("images/hyperzteam-preview.png") },
  { id: "desync", name: "Desync", url: "https://help-3753.colloky.com.pe/main.html", icon: asset("images/desync-icon.png"), shot: asset("images/desync-preview.webp") },
  { id: "bunnies", name: "Bunnies", url: "https://bunnies.lat", icon: asset("images/lazyico-bunnies.webp"), shot: asset("images/lazy-bunnies.webp") },
  { id: "tung-tung", name: "Tung Tung", url: "https://ttbest.s3.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-tung-tung.webp") },
  { id: "lucide", name: "Lucide", url: "https://s3.amazonaws.com/mathassets/index.html", icon: "", shot: asset("images/lazy-lucide.webp") },
  { id: "frogie-s-arcade", name: "Frogie's Arcade", url: "https://frogiesarcade.net/", icon: asset("images/lazyico-frogie-s-arcade.webp"), shot: asset("images/lazy-frogie-s-arcade.webp") },
  { id: "voya", name: "Voya", url: "https://voya.adfos.com/", icon: "", shot: asset("images/lazy-voya.webp") },
  { id: "nebulo", name: "Nebulo", url: "https://tool.doriswel.com/", icon: "", shot: asset("images/lazy-nebulo.webp") },
  { id: "void-network", name: "Void Network", url: "https://oda-loves-vng.renaca.com/study/chemistry/unit-6-YTBhMjllZDJiLlBxa2U4dG04STJ6cQ", icon: "", shot: asset("images/lazy-void-network.webp") },
  { id: "truffled", name: "Truffled", url: "https://goguardian.com.ophirschooldistrict.org/", icon: asset("images/lazyico-truffled.webp"), shot: asset("images/lazy-truffled.webp") },
  { id: "opium", name: "Opium", url: "https://cleverlearning.s3.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-opium.webp") },
  { id: "beez-unb", name: "beez unb", url: "https://beez-4d4.pages.dev/", icon: "", shot: asset("images/lazy-beez-unb.webp") },
  { id: "bull-33", name: "Bull-33", url: "https://s3.amazonaws.com/oiop/index.html", icon: "", shot: asset("images/lazy-bull-33.webp") },
  { id: "chalkle", name: "Chalkle", url: "https://chalkle.lootline.xyz/", icon: asset("images/lazyico-chalkle.webp"), shot: asset("images/lazy-chalkle.webp") },
  { id: "flare", name: "Flare", url: "https://gifts.giftofappetite.com/", icon: asset("images/lazyico-flare.webp"), shot: asset("images/lazy-flare.webp") },
  { id: "peak-ubg", name: "Peak UBG", url: "https://racialequityleadership.com/", icon: asset("images/lazyico-peak-ubg.webp"), shot: asset("images/lazy-peak-ubg.webp") },
  { id: "uranium", name: "Uranium", url: "https://portal.apertura.com/", icon: "", shot: asset("images/lazy-uranium.webp") },
  { id: "space", name: "Space", url: "https://space.kkmsilvia.com/", icon: asset("images/lazyico-space.webp"), shot: asset("images/lazy-space.webp") },
  { id: "overcloaked", name: "OverCloaked", url: "https://over.veranda.co.id/", icon: asset("images/lazyico-overcloaked.webp"), shot: asset("images/lazy-overcloaked.webp") },
  { id: "daydream", name: "Daydream", url: "https://zkvp.s3.us-east-1.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-daydream.webp") },
  { id: "gust-browser", name: "GUST Browser", url: "https://html.cafe/x7aad49cc", icon: asset("images/lazyico-gust-browser.webp"), shot: asset("images/lazy-gust-browser.webp") },
  { id: "study-hub", name: "Study Hub", url: "https://studyhub.adfos.com/", icon: "", shot: asset("images/lazy-study-hub.webp") },
  { id: "korona", name: "Korona", url: "https://math-test.akanesucks.cfd/browser", icon: asset("images/lazyico-korona.webp"), shot: asset("images/lazy-korona.webp") },
  { id: "velcro", name: "Velcro", url: "https://script.google.com/macros/s/AKfycbzu71H712BtDwHAGHoJU23_l4mooXxk-cFLFf-D1L5QPeGj014zQShmAgf3dVqCA7L9/exec?id=1", icon: asset("images/lazyico-velcro.webp"), shot: asset("images/lazy-velcro.webp") },
  { id: "axiom", name: "Axiom", url: "https://axiom-2.b-cdn.net/", icon: "", shot: asset("images/lazy-axiom.webp") },
  { id: "rosin", name: "Rosin", url: "https://pretezels.drbijaytamang.com.np/", icon: asset("images/lazyico-rosin.webp"), shot: asset("images/lazy-rosin.webp") },
  { id: "glim", name: "Glim", url: "https://axk4.s3.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-glim.webp") },
  { id: "equinox", name: "Equinox", url: "https://equal.bulls.ferrosider.com.ar/", icon: asset("images/lazyico-equinox.webp"), shot: asset("images/lazy-equinox.webp") },
  { id: "monoxide", name: "Monoxide", url: "https://monoxide.dev/", icon: asset("images/lazyico-monoxide.webp"), shot: asset("images/lazy-monoxide.webp") },
  { id: "imp-v2", name: "IMP v2", url: "https://imp-v2.b-cdn.net/", icon: "", shot: asset("images/lazy-imp-v2.webp") },
  { id: "seamless-os", name: "Seamless OS", url: "https://seamless.free.nf/?i=1", icon: "", shot: asset("images/lazy-seamless-os.webp") },
  { id: "boredom", name: "Boredom", url: "https://vps-ac2179fd.vps.ovh.ca/", icon: "", shot: asset("images/lazy-boredom.webp") },
  { id: "cherri", name: "Cherri", url: "https://kicks-shop.com/", icon: "", shot: asset("images/lazy-cherri.webp") },
  { id: "strawberri", name: "Strawberri", url: "https://streeii.adfos.com/", icon: asset("images/lazyico-strawberri.webp"), shot: asset("images/lazy-strawberri.webp") },
  { id: "serumos", name: "SerumOS", url: "https://s3.amazonaws.com/scholarnook/index.html", icon: "", shot: asset("images/lazy-serumos.webp") },
];

/* ------------------------------------------------------------------ *
 * PARTNERSHIP — HyperZHub
 * A partner hub: one card, and clicking it reveals every mirror they
 * publish, grouped exactly the way they hand them out.
 * ------------------------------------------------------------------ */

type HzGroup = { title: string; urls: string[] };

const HZ_NAME = "HyperZHub";
const HZ_DISCORD = "https://discord.gg/jkNhnxjARR";
const HZ_SITES = [
  "https://hyperzhub.pages.dev/",
  "https://hyperzhub.vercel.app/",
  "https://hyperzhub.netlify.app/",
  "https://hyperzteam456.github.io/hyperzhub",
];

const HZ_GROUPS: HzGroup[] = [
  {
    title: "DDNS Links",
    urls: [
      "https://powerschool.pntr.dev/",
      "https://skyward.pntr.dev/",
      "https://canvas.pntr.dev/",
      "https://skyward.xubi.org/",
      "https://ixl.kozow.com/",
      "https://google-classroom.opik.net/",
      "https://powerschool.flashhub.net/",
      "https://schoology.env.pm/",
      "https://classlink.env.pm/",
      "https://wikipedia.env.pm/",
      "https://w3schools.env.pm/",
      "https://ck12.env.pm/",
      "https://khanacademy.ddns.net/",
    ],
  },
  {
    title: "1st InfinityFree ACC",
    urls: [
      "https://ixl.free.je/",
      "https://classlink.gt.tc/",
      "https://boxathome.rf.gd/",
      "https://schoology.xo.je/",
      "https://noredink.66ghz.com/",
      "https://google-classroom.fwh.is/",
      "https://khanacademy.page.gd/",
      "https://hmh.10001mb.com/",
      "https://canvas.freedev.app/",
      "https://mcgrawhill.infy.click/",
      "https://quizlet.ct.ws/",
      "https://newsela.ifree.page/",
      "https://wikipedia.totalh.net/",
      "https://coursera.site.je/",
      "https://clever.ifree.page/",
      "https://k12.page.gd/",
      "https://cambiumtds.wuaze.com/",
      "https://powerschool.gt.tc/",
      "https://skyward.66ghz.com/",
      "https://photomath.fast-page.org/",
      "https://pearson.gamer.free/",
      "https://scholastic.xo.je/",
      "https://splashlearn.html-5.me/",
      "https://edsby.my-board.org/",
      "https://mathematics.free.nf/",
      "https://schoology.page.gd/",
      "https://ixl.free.nf/",
      "https://powerschool.html-5.me/",
      "https://skyward.site.je/",
      "https://khanacademy.gt.tc/",
      "https://ck12.xo.je/",
      "https://wikipedia.ifree.page/",
      "https://ixl.site.je/",
      "https://skyward.22web.org/",
      "https://google-classroom.web1337.net/",
    ],
  },
  {
    title: "2nd InfinityFree ACC",
    urls: [
      "https://studyhub.ifree.page/",
      "https://geogebra.site.je/",
      "https://edpuzzle.kesug.com",
      "https://ixl.ct.ws/",
      "https://performancematters.site.je/",
      "https://aleks.66ghz.com/",
      "https://skyward.kesug.com",
      "https://wayground.ct.ws/",
      "https://scholastic.22web.org/",
      "https://phet.site.je/",
      "https://powerschool.wuaze.com",
      "https://nationalgeographic.free.je",
      "https://openlearn.free.nf/",
      "https://quizlet.22web.org/",
      "https://edutopia.web1337.net/",
      "https://xtramath.fwh.is/",
      "https://desmos.freedev.app/",
      "https://newsela.ct.ws/",
      "https://coursera.wuaze.com/",
      "https://openlearn.fwh.is/",
      "https://xtramath.web1337.net/",
      "https://getepic.xo.je/",
      "https://kahoot.42web.io/",
      "https://ixl.xo.je/",
      "https://edx.gt.tc/",
      "https://w3schools.fwh.is/",
      "https://schoology.freehosting.dev/",
      "https://quizlet.infinityfree.io/",
      "https://classlink.synergize.co/",
      "https://khanacademy.free.nf/",
    ],
  },
  {
    title: "3rd InfinityFree ACC",
    urls: [
      "https://hapara.rf.gd/",
      "https://teams-microsoft.ifree.page/",
      "https://ck12.gt.tc/",
      "https://deltamath.66ghz.com/",
      "https://ixl.freepage.cc/",
      "https://skyward.wuaze.com/",
      "https://classlink.site.je/",
      "https://skyward.fwh.is/",
      "https://google-classroom.42web.io/",
      "https://powerschool.nichesite.org/",
      "https://canvas.xo.je",
      "https://canva.66ghz.com",
      "https://w3schools.rf.gd/",
      "https://quizizz.site.je/",
      "https://skyward.synergize.co/",
      "https://schoology.ct.ws/",
      "https://ck12.22web.org/",
      "https://w3schools.ifree.page/",
      "https://scholastic.ct.ws/",
      "https://powerschool.42web.io/",
      "https://brainpop.wuaze.com/",
      "https://getepic.nichesite.org/",
      "https://coursera.kesug.com/",
      "https://nationalgeographic.gt.tc/",
      "https://desmos.ct.ws/",
    ],
  },
  {
    title: "Google Links",
    urls: [
      "https://script.google.com/macros/s/AKfycbw0HpAcABQXr2As7KJ9D4iy8-hs69iZhJUkvdVB00q1lU3dsU5622nYZltlTCua5I8/exec",
      "https://script.google.com/macros/s/AKfycbxeZG899-CkjrqZof2D8cj1EmUlyesKY1lnbo33fInlPqtrXsv3ZIMehruV-kaVWIr9/exec",
      "https://script.google.com/macros/s/AKfycbwxPuexlEgqp0pLTe7g6BTjY6o-RG-TOBYFlT66E8m0oMubJMQ6x59dh8CPGnN0OwmY/exec",
      "https://sites.google.com/view/ixl0/ixl",
      "https://sites.google.com/view/khan-academy0/khan-academy",
      "https://sites.google.com/view/coursera0/coursera",
      "https://script.google.com/macros/s/AKfycbxJPUaJQGNL6ek0NPKCygEN0A8ivMuGa-ZjxAsVlLOV3DaIVYb4jz9qaEoPZwz9tud5/exec",
      "https://script.google.com/macros/s/AKfycbw8pAEAsY27d8-zzxh9iW79ZvNpMN2zJtjSS63qhb_JQfD80Fi0mCRfY3pDegdmxU-o/exec",
      "https://script.google.com/macros/s/AKfycby5XgIVcgCcmxiRZWKKXY1NsSCvohy1UFPm-ao_mLdhALELPvNW5ONpf7JeDCLatQ/exec",
      "https://script.google.com/macros/s/AKfycbyZXkxjjlB2nSltBBAqUbl_yQJiBXTeCIdmLxK0v2lDmknjHa4slvzSkkueft1qfns8/exec",
    ],
  },
  {
    title: "CDN Links",
    urls: [
      "https://skyw0rd.b-cdn.net/",
      "https://cdn.statically.io/gh/HyperZTeam456/hyperzhub/main/loader.svg",
      "https://cdn.staticdelivr.com/gh/HyperZTeam456/hyperzhub/main/loader.svg",
      "https://cdn.githubraw.com/HyperZTeam456/hyperzhub/main/loader.svg",
      "https://githubraw.com/HyperZTeam456/hyperzhub/main/loader.svg",
      "https://raw.githack.com/HyperZTeam456/hyperzhub/main/loader.svg",
      "https://rawcdn.githack.com/HyperZTeam456/hyperzhub/main/loader.svg",
      "https://cdn.jsdelivr.net/gh/HyperZTeam456/hyperzhub@main/loader.svg",
      "https://jsd.cdn.zzko.cn/gh/HyperZTeam456/hyperzhub@main/loader.svg",
      "https://cdn.jsdmirror.com/gh/HyperZTeam456/hyperzhub@main/loader.svg",
      "https://jsd.onmicrosoft.cn/gh/HyperZTeam456/hyperzhub@main/loader.svg",
      "https://fastly.jsdelivr.net/gh/HyperZTeam456/hyperzhub@main/loader.svg",
    ],
  },
];

const HZ_DATA = "data:text/html;base64,PCFET0NUWVBFIGh0bWw+PGh0bWw+PGhlYWQ+PG1ldGEgY2hhcnNldD0iVVRGLTgiPjx0aXRsZT5OZXcgVGFiPC90aXRsZT48L2hlYWQ+PGJvZHkgc3R5bGU9Im1hcmdpbjowO2JhY2tncm91bmQ6IzAwMDtjb2xvcjojZmZmO2ZvbnQ6MTNweCBzeXN0ZW0tdWk7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtoZWlnaHQ6MTAwdmg7Z2FwOjEycHgiPjxzZWxlY3QgaWQ9Im4iIHN0eWxlPSJiYWNrZ3JvdW5kOiMxMTI7Y29sb3I6I2ZmZjtib3JkZXI6MXB4IHNvbGlkICMzMzM7cGFkZGluZzo2cHggMTBweDtib3JkZXItcmFkaXVzOjRweDtmb250OjEzcHggc3lzdGVtLXVpIj48b3B0aW9uIHZhbHVlPSJJWEwgTGVhcm5pbmciPklYTCBMZWFybmluZzwvb3B0aW9uPjxvcHRpb24gdmFsdWU9IkNsYXNzTGluayBMYXVuY2hQYWQiPkNsYXNzTGluayBMYXVuY2hQYWQ8L29wdGlvbj48b3B0aW9uIHZhbHVlPSJTY2hvb2xvZ3kgRGFzaGJvYXJkIj5TY2hvb2xvZ3kgRGFzaGJvYXJkPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT0iS2hhbiBBY2FkZW15IFByYWN0aWNlIj5LaGFuIEFjYWRlbXkgUHJhY3RpY2U8L29wdGlvbj48b3B0aW9uIHZhbHVlPSJRdWl6bGV0IFN0dWR5IFNldCI+UXVpemxldCBTdHVkeSBTZXQ8L29wdGlvbj48b3B0aW9uIHZhbHVlPSJCcmFpbmx5IEhvbWV3b3JrIEhlbHAiPkJyYWlubHkgSG9tZXdvcmsgSGVscDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9IkNhbnZhcyBMTVMgUG9ydGFsIj5DYW52YXMgTE1TIFBvcnRhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9Ikdvb2dsZSBDbGFzc3Jvb20iPkdvb2dsZSBDbGFzc3Jvb208L29wdGlvbj48b3B0aW9uIHZhbHVlPSJNY0dyYXcgSGlsbCBDb25uZWN0Ij5NY0dyYXcgSGlsbCBDb25uZWN0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT0iRGlzY292ZXJ5IEVkdWNhdGlvbiI+RGlzY292ZXJ5IEVkdWNhdGlvbjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9IlNwbGFzaExlYXJuIE1hdGgiPlNwbGFzaExlYXJuIE1hdGg8L29wdGlvbj48b3B0aW9uIHZhbHVlPSJTZWVzYXcgSm91cm5hbCI+U2Vlc2F3IEpvdXJuYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPSJQZWFyc29uIFJlYWxpemUiPlBlYXJzb24gUmVhbGl6ZTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9IkVkc2J5IFN0dWRlbnQgUG9ydGFsIj5FZHNieSBTdHVkZW50IFBvcnRhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9Il9fY3VzdG9tIj5DdXN0b20gTmFtZS4uLjwvb3B0aW9uPjwvc2VsZWN0PjxpbnB1dCBpZD0iYyIgcGxhY2Vob2xkZXI9IkVudGVyIGN1c3RvbSBuYW1lIiBzdHlsZT0iZGlzcGxheTpub25lO2JhY2tncm91bmQ6IzExMjtjb2xvcjojZmZmO2JvcmRlcjoxcHggc29saWQgIzMzMztwYWRkaW5nOjZweCAxMHB4O2JvcmRlci1yYWRpdXM6NHB4O2ZvbnQ6MTNweCBzeXN0ZW0tdWk7d2lkdGg6MjIwcHgiPjxidXR0b24gaWQ9ImIiIHN0eWxlPSJiYWNrZ3JvdW5kOiMyMjI7Y29sb3I6I2ZmZjtib3JkZXI6MXB4IHNvbGlkICM0NDQ7cGFkZGluZzo4cHggMjBweDtib3JkZXItcmFkaXVzOjRweDtmb250OjEzcHggc3lzdGVtLXVpO2N1cnNvcjpwb2ludGVyIj5Eb3dubG9hZDwvYnV0dG9uPjxzY3JpcHQ+dmFyIG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ24nKSxjPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjJyk7bi5vbmNoYW5nZT1mdW5jdGlvbigpe2lmKG4udmFsdWU9PT0nX19jdXN0b20nKXtjLnN0eWxlLmRpc3BsYXk9J2Jsb2NrJztjLmZvY3VzKCl9ZWxzZXtjLnN0eWxlLmRpc3BsYXk9J25vbmUnfX07ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2InKS5vbmNsaWNrPWZ1bmN0aW9uKCl7dmFyIG5tPW4udmFsdWU9PT0nX19jdXN0b20nPyhjLnZhbHVlLnRyaW0oKXx8J0ZldGNoZXInKSsnLmh0bWwnOm4udmFsdWUrJy5odG1sJzt2YXIgZmM9YXRvYignUENGRVQwTlVXVkJGSUdoMGJXdytQR2gwYld3Z2JHRnVaejBpWlc0aVBqeG9aV0ZrUGp4dFpYUmhJR05vWVhKelpYUTlJbFZVUmkwNElqNDhiV1YwWVNCdVlXMWxQU0oyYVdWM2NHOXlkQ0lnWTI5dWRHVnVkRDBpZDJsa2RHZzlaR1YyYVdObExYZHBaSFJvTENCcGJtbDBhV0ZzTFhOallXeGxQVEV1TUNJK1BIUnBkR3hsUGs1bGR5QlVZV0k4TDNScGRHeGxQanh6ZEhsc1pUNWliMlI1TEdoMGJXeDdiV0Z5WjJsdU9qQTdjR0ZrWkdsdVp6b3dPMmhsYVdkb2REb3hNREFsZldsbWNtRnRaWHQzYVdSMGFEb3hNREFsTzJobGFXZG9kRG94TURCMmFEdGliM0prWlhJNmJtOXVaVHR2ZG1WeVpteHZkenBvYVdSa1pXNTlQQzl6ZEhsc1pUNDhMMmhsWVdRK1BHSnZaSGsrUEdScGRpQnBaRDBpWjJsMGFIVmlMV052Ym5SbGJuUWlQand2WkdsMlBqeHpZM0pwY0hRK2RtRnlJRTg5SWtoNWNHVnlXbFJsWVcwME5UWWlMRkk5SW1oNWNHVnllbWgxWWlJc1FqMGliV0ZwYmlJc1JqMGlhVzVrWlhndWFIUnRiQ0lzVFQxYkltaDBkSEJ6T2k4dmNtRjNMbWRwZEdoMVluVnpaWEpqYjI1MFpXNTBMbU52YlM4aUswOHJJaThpSzFJcklpOGlLMElySWk4aUswWXNJbWgwZEhCek9pOHZZMlJ1TG1welpHVnNhWFp5TG01bGRDOW5hQzhpSzA4cklpOGlLMUlySWtBaUswSXJJaThpSzBZc0ltaDBkSEJ6T2k4dloyTnZjbVV1YW5Oa1pXeHBkbkl1Ym1WMEwyZG9MeUlyVHlzaUx5SXJVaXNpUUNJclFpc2lMeUlyUml3aWFIUjBjSE02THk5bVlYTjBiSGt1YW5Oa1pXeHBkbkl1Ym1WMEwyZG9MeUlyVHlzaUx5SXJVaXNpUUNJclFpc2lMeUlyUml3aWFIUjBjSE02THk5MFpYTjBhVzVuWTJZdWFuTmtaV3hwZG5JdWJtVjBMMmRvTHlJclR5c2lMeUlyVWlzaVFDSXJRaXNpTHlJclJpd2lhSFIwY0hNNkx5OXFjMlF1WTJSdUxucDZhMjh1WTI0dloyZ3ZJaXRQS3lJdklpdFNLeUpBSWl0Q0t5SXZJaXRHTENKb2RIUndjem92TDJOa2JpNXFjMlJ0YVhKeWIzSXVZMjl0TDJkb0x5SXJUeXNpTHlJclVpc2lRQ0lyUWlzaUx5SXJSaXdpYUhSMGNITTZMeTlqWkc0dWFuTmtaV3hwZG5JdWNtVnVMMmRvTHlJclR5c2lMeUlyVWlzaVFDSXJRaXNpTHlJclJpd2lhSFIwY0hNNkx5OXFjMlF1YjI1dGFXTnliM052Wm5RdVkyNHZaMmd2SWl0UEt5SXZJaXRTS3lKQUlpdENLeUl2SWl0R0xDSm9kSFJ3Y3pvdkwyZG9jSEp2ZUhrdVkyOXRMMmgwZEhCek9pOHZjbUYzTG1kcGRHaDFZblZ6WlhKamIyNTBaVzUwTG1OdmJTOGlLMDhySWk4aUsxSXJJaThpSzBJcklpOGlLMFlzSW1oMGRIQnpPaTh2WjJod2NtOTRlUzV1WlhRdmFIUjBjSE02THk5eVlYY3VaMmwwYUhWaWRYTmxjbU52Ym5SbGJuUXVZMjl0THlJclR5c2lMeUlyVWlzaUx5SXJRaXNpTHlJclJpd2lhSFIwY0hNNkx5OXRhWEp5YjNJdVoyaHdjbTk0ZVM1amIyMHZhSFIwY0hNNkx5OXlZWGN1WjJsMGFIVmlkWE5sY21OdmJuUmxiblF1WTI5dEx5SXJUeXNpTHlJclVpc2lMeUlyUWlzaUx5SXJSaXdpYUhSMGNITTZMeTluYVhSb1ZXSXViVzlsZVhrdWVIbDZMMmgwZEhCek9pOHZjbUYzTG1kcGRHaDFZblZ6WlhKamIyNTBaVzUwTG1OdmJTOGlLMDhySWk4aUsxSXJJaThpSzBJcklpOGlLMFlzSW1oMGRIQnpPaTh2WjJod2N5NWpZeTlvZEhSd2N6b3ZMM0poZHk1bmFYUm9kV0oxYzJWeVkyOXVkR1Z1ZEM1amIyMHZJaXRQS3lJdklpdFNLeUl2SWl0Q0t5SXZJaXRHTENKb2RIUndjem92TDNOc2FXNXJMbXgwWkM5b2RIUndjem92TDNKaGR5NW5hWFJvZFdKMWMyVnlZMjl1ZEdWdWRDNWpiMjB2SWl0UEt5SXZJaXRTS3lJdklpdENLeUl2SWl0R0xDSm9kSFJ3Y3pvdkwyaDFZaTV1ZFdGaExtTm1MeUlyVHlzaUx5SXJVaXNpTDNKaGR5OGlLMElySWk4aUswWXNJbWgwZEhCek9pOHZhSFZpTG5sNmRYVXVZMll2SWl0UEt5SXZJaXRTS3lJdmNtRjNMeUlyUWlzaUx5SXJSaXdpYUhSMGNITTZMeTl5WVhjdVoybDBZMnh2Ym1VdVkyOXRMeUlyVHlzaUx5SXJVaXNpTDNKaGR5OGlLMElySWk4aUswWXNJbWgwZEhCek9pOHZjbUYzTG5ObGRtVnVZMlJ1TG1OdmJTOGlLMDhySWk4aUsxSXJJaTl5WVhjdklpdENLeUl2SWl0R0xDSm9kSFJ3Y3pvdkwydHJaMmwwYUhWaUxtTnZiUzhpSzA4cklpOGlLMUlySWk5eVlYY3ZJaXRDS3lJdklpdEdMQ0pvZEhSd2N6b3ZMMmRvTG5KaGQyUnNMbWx5THlJclR5c2lMeUlyVWlzaUx5SXJRaXNpTHlJclJpd2lhSFIwY0hNNkx5OXlZWGN1WTJSdUxtSnBiR2xoY0drdWJtVjBMeUlyVHlzaUx5SXJVaXNpTHlJclFpc2lMeUlyUml3aWFIUjBjSE02THk5bmFIQnliM2g1TG1wd0wyaDBkSEJ6T2k4dmNtRjNMbWRwZEdoMVluVnpaWEpqYjI1MFpXNTBMbU52YlM4aUswOHJJaThpSzFJcklpOGlLMElySWk4aUswWXNJbWgwZEhCek9pOHZaMmh3Y205NGVTNXJjaTlvZEhSd2N6b3ZMM0poZHk1bmFYUm9kV0oxYzJWeVkyOXVkR1Z1ZEM1amIyMHZJaXRQS3lJdklpdFNLeUl2SWl0Q0t5SXZJaXRHWFR0aGMzbHVZeUJtZFc1amRHbHZiaUJmWmlocEtYdHBaaWhwUGoxTkxteGxibWQwYUNseVpYUjFjbTQ3ZEhKNWUzWmhjaUJ5UFdGM1lXbDBJR1psZEdOb0tFMWJhVjBwTzJsbUtDRnlMbTlyS1hSb2NtOTNJREE3ZG1GeUlIUTlZWGRoYVhRZ2NpNTBaWGgwS0Nrc1pUMWtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NKcFpuSmhiV1VpS1R0bExuTjBlV3hsTG5kcFpIUm9QU0l4TURBbElqdGxMbk4wZVd4bExtaGxhV2RvZEQwaU1UQXdkbWdpTzJVdWMzUjViR1V1WW05eVpHVnlQU0p1YjI1bElqdGxMbk4wZVd4bExtOTJaWEptYkc5M1BTSm9hV1JrWlc0aU8yVXVjM0pqWkc5alBYUTdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0ltZHBkR2gxWWkxamIyNTBaVzUwSWlrdVlYQndaVzVrUTJocGJHUW9aU2w5WTJGMFkyZ29aU2w3WDJZb2FTc3hLWDE5WDJZb01DazhMM05qY21sd2RENDhMMkp2WkhrK1BDOW9kRzFzUGc9PSc";

/* ------------------------------------------------------------------ *
 * How a site gets opened. Every method opens a NEW tab and leaves the
 * Links window exactly where it is — nothing here is ever allowed to
 * navigate the page you are reading. The user picks the method per
 * click and it sticks between visits.
 * ------------------------------------------------------------------ */

type OpenMethod = "link" | "blank" | "html5" | "blob";

const METHODS: { id: OpenMethod; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "link", label: "Link", hint: "plain new tab — goes straight to the address", icon: Link2 },
  { id: "blank", label: "about:blank", hint: "empty tab first, then that tab travels to the site", icon: Square },
  { id: "html5", label: "HTML5", hint: "new tab stays ours and renders the site inside a frame", icon: Code2 },
  { id: "blob", label: "Blob", hint: "builds the page in memory as a blob: document and shows it in a new tab", icon: FileCode },
];

const METHOD_KEY = "vertex-links-method";

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SHELL_CSS = [
  "*{box-sizing:border-box}",
  "html,body{margin:0;height:100%;background:#070d18;color:#93aac4;font:13px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}",
  ".bar{position:fixed;inset:0 0 auto 0;height:30px;display:flex;align-items:center;gap:10px;padding:0 12px;background:rgba(9,15,26,.94);border-bottom:1px solid rgba(160,200,235,.14);z-index:2}",
  ".bar b{color:#dce9f8;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".bar a{margin-left:auto;color:#37c6ed;text-decoration:none;white-space:nowrap}",
  "iframe{position:fixed;inset:30px 0 0 0;width:100%;height:calc(100% - 30px);border:0;background:#070d18}",
].join("");

/** A whole page that embeds the site. Written in one shot so there is no
 *  DOM poking after the document is live (that used to leave blank tabs). */
function embedDoc(url: string) {
  const host = esc(hostLabel(url));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${host}</title><style>${SHELL_CSS}</style></head><body><div class="bar"><b>${host}</b><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">open directly</a></div><iframe src="${esc(url)}" allow="autoplay; clipboard-write; camera; microphone; fullscreen; gamepad; encrypted-media" referrerpolicy="no-referrer" title="${host}"></iframe></body></html>`;
}

/** An empty tab we still hold a handle on. Null if a pop-up blocker ate it. */
function newTab() {
  return window.open("about:blank", "_blank");
}

/** Last resort when the browser refuses window.open: a synthetic link click.
 *  Still a new tab, and still never the current page. */
function anchorTab(href: string, revoke?: string) {
  try {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    /* nothing left to try — the card's own address is on screen */
  }
  if (revoke) window.setTimeout(() => URL.revokeObjectURL(revoke), 60000);
}

function sendTab(win: Window, url: string) {
  try {
    win.location.replace(url);
  } catch {
    try { win.location.href = url; } catch { /* cross-origin and locked down */ }
  }
}

export type OpenResult = { ok: boolean; how: string };

export function openSite(url: string, method: OpenMethod): OpenResult {
  try {
    if (method === "link") {
      // No "noopener" in the feature string on purpose: Chrome hands back a
      // null window whenever noopener is set, which is what used to send us
      // into the "navigate the current tab" fallback.
      const win = window.open(url, "_blank");
      if (win) { try { win.opener = null; } catch { /* read-only, fine */ } return { ok: true, how: "opened in a new tab" }; }
      anchorTab(url);
      return { ok: true, how: "opened in a new tab (via link click)" };
    }

    const win = newTab();
    if (!win) { anchorTab(url); return { ok: false, how: "pop-ups are blocked — used a link click instead" }; }

    if (method === "blank") { sendTab(win, url); return { ok: true, how: "blank tab, then straight to the site" }; }

    if (method === "html5") {
      win.document.open();
      win.document.write(embedDoc(url));
      win.document.close();
      return { ok: true, how: "new tab framing the site" };
    }

    const href = URL.createObjectURL(new Blob([embedDoc(url)], { type: "text/html" }));
    sendTab(win, href);
    window.setTimeout(() => URL.revokeObjectURL(href), 60000);
    return { ok: true, how: "new tab showing a blob: document" };
  } catch {
    anchorTab(url);
    return { ok: false, how: "pop-ups are blocked — used a link click instead" };
  }
}

function readMethod(): OpenMethod {
  try {
    const saved = localStorage.getItem(METHOD_KEY);
    return METHODS.some((m) => m.id === saved) ? (saved as OpenMethod) : "link";
  } catch {
    return "link";
  }
}

function writeMethod(method: OpenMethod) {
  try { localStorage.setItem(METHOD_KEY, method); } catch { /* preference just won't stick */ }
}

type OpenCtx = { status: string; open: (url: string) => void };
const MethodContext = createContext<OpenCtx>({
  status: "",
  open: (url) => { const w = window.open(url, "_blank"); if (w) { try { w.opener = null; } catch { /* fine */ } } else anchorTab(url); },
});

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

/** Like hostOf, but keeps the path, so github.io/our-repo.github.io reads correctly. */
function hostLabel(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return hostOf(url);
  }
}

/** Turns "poki.com" into "https://poki.com", leaves "cool games" alone. */
function directUrl(raw: string) {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`;
  return null;
}

function SectionHead({ kicker, title, blurb, right }: { kicker?: string; title: string; blurb: string; right?: ReactNode }) {
  return (
    <div className="lnk-sect-head">
      <div className="lnk-sect-heading">
        {kicker && <span className="lnk-sect-kicker"><span className="lnk-sect-dot" aria-hidden="true" />{kicker}</span>}
        <h2 className="lnk-sect-title">{title}</h2>
        <p className="lnk-sect-blurb">{blurb}</p>
      </div>
      {right}
    </div>
  );
}

/** Falls back to a gradient letter tile so a missing icon never shows as a broken image. */
function CardIcon({ src, name, tint }: { src?: string; name: string; tint?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    let hue = 0;
    for (let i = 0; i < name.length; i += 1) hue = (hue * 31 + name.charCodeAt(i)) % 360;
    return <span className="lnk-card-fallback" style={{ backgroundImage: `linear-gradient(140deg, hsl(${hue} 78% 54%), hsl(${(hue + 48) % 360} 76% 44%))` }} aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>;
  }
  return <img src={src} alt="" className={tint ? "is-tint" : undefined} onError={() => setBroken(true)} draggable={false} />;
}

function Preview({ shot, fit, alt }: { shot: string; fit: "cover" | "contain"; alt: string }) {
  return (
    <span className={`lnk-shot${fit === "contain" ? " is-contain" : ""}`} style={fit === "contain" ? { backgroundImage: `url("${shot}")` } : undefined}>
      <span className="lnk-shot-blur" aria-hidden="true" style={fit === "contain" ? { backgroundImage: `url("${shot}")` } : undefined} />
      <img src={shot} alt={alt} draggable={false} />
    </span>
  );
}

function DomainCard({ item, ghost }: { item: DomainItem; ghost?: boolean }) {
  const { open } = useContext(MethodContext);
  return (
    <button
      className="lnk-dcard"
      onClick={() => open(item.url)}
      title={item.url}
      tabIndex={ghost ? -1 : 0}
      aria-hidden={ghost || undefined}
    >
      <Preview shot={item.shot} fit="cover" alt="" />
      <span className="lnk-card-foot">
        <span className="lnk-card-icon">
          <CardIcon src={item.icon} name={item.name} tint={item.tint} />
        </span>
        <span className="lnk-card-text">
          <span className="lnk-card-name">{item.name}</span>
          <span className="lnk-card-host">{hostLabel(item.url)}</span>
        </span>
        <span className="lnk-card-note">{item.note}</span>
        <ArrowUpRight className="lnk-card-go" size={16} />
      </span>
    </button>
  );
}

/** Keeps the featured strip drifting forever: the cards are rendered twice, so
 *  wrapping scrollLeft back by half a track is invisible. */
function FeaturedRow() {
  const track = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  const normalise = (el: HTMLDivElement) => {
    const half = el.scrollWidth / 2;
    if (half <= el.clientWidth) return;
    if (el.scrollLeft >= half) el.scrollLeft -= half;
    else if (el.scrollLeft < 0) el.scrollLeft += half;
  };

  useEffect(() => {
    const el = track.current;
    if (!el || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      if (el.scrollWidth / 2 <= el.clientWidth) return;
      const now = performance.now();
      el.scrollLeft += ((now - last) / 1000) * 32;
      last = now;
      normalise(el);
    }, 40);
    return () => window.clearInterval(id);
  }, [paused]);

  const nudge = (dir: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.82), behavior: "smooth" });
    window.setTimeout(() => normalise(el), 460);
  };

  return (
    <div
      className="lnk-dtrack-wrap"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onWheel={() => setPaused(true)}
    >
      <div className="lnk-dtrack" ref={track}>
        {[0, 1].map((copy) => DOMAINS.map((item) => (
          <DomainCard key={`${copy}-${item.url}`} item={item} ghost={copy === 1} />
        )))}
      </div>
      <button className="lnk-dnav lnk-dnav--prev" onClick={() => nudge(-1)} aria-label="Scroll featured left"><ChevronLeft size={18} /></button>
      <button className="lnk-dnav lnk-dnav--next" onClick={() => nudge(1)} aria-label="Scroll featured right"><ChevronRight size={18} /></button>
    </div>
  );
}

function Ribbon() {
  return (
    <div className="lnk-ribbon" aria-hidden="true">
      <div className="lnk-ribbon-track">
        {[0, 1].map((copy) => (
          <div className="lnk-ribbon-set" key={copy}>
            <span className="lnk-ribbon-pill"><span className="lnk-ribbon-pulse" />blocked? try the next host</span>
            {DOMAINS.map((item) => (
              <span className="lnk-ribbon-item" key={item.url}>
                <img src={item.icon} alt="" className={item.tint ? "is-tint" : undefined} />
                {hostLabel(item.url)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedSection({ compact }: { compact: boolean }) {
  return (
    <section className={`lnk-sect lnk-feat${compact ? " is-compact" : ""}`} aria-label="Featured">
      <SectionHead
        kicker="Start here"
        title="Featured"
        blurb="Our addresses plus a partner hub — every Vertex OS mirror runs the same system, so if a host is blocked just open the next."
        right={(
          <div className="lnk-row-nav">
            <button onClick={() => document.querySelector(".lnk-dnav--prev")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))} aria-label="Scroll featured left"><ChevronLeft size={16} /></button>
            <button onClick={() => document.querySelector(".lnk-dnav--next")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))} aria-label="Scroll featured right"><ChevronRight size={16} /></button>
          </div>
        )}
      />
      <FeaturedRow />
      <Ribbon />
    </section>
  );
}

function ProxyCard({ item }: { item: ProxyItem }) {
  const { open } = useContext(MethodContext);
  return (
    <button className="lnk-pcard" onClick={() => open(item.url)} title={item.url}>
      <Preview shot={item.shot} fit="cover" alt={`${item.name} preview`} />
      <span className="lnk-card-foot">
        <span className="lnk-card-icon">
          <CardIcon src={item.icon} name={item.name} />
        </span>
        <span className="lnk-card-text">
          <span className="lnk-card-name">{item.name}</span>
          <span className="lnk-card-host">{hostOf(item.url)}</span>
        </span>
        <ArrowUpRight className="lnk-card-go" size={16} />
      </span>
    </button>
  );
}

/** All proxies as one library grid — every card opens with the open method picked above. */
function ProxyRow({ items }: { items: ProxyItem[] }) {
  return (
    <section className="lnk-sect" aria-label="Proxy library">
      <SectionHead
        kicker="LazyList library"
        title="Proxy library"
        blurb={`${items.length} proxies from the LazyList page — pick an open method up top, then tap any card`}
      />
      <div className="lnk-pgrid">
        {items.map((item) => <ProxyCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

/** Readable label for one of HyperZTeam's links: host + last path piece. */
function linkLabel(url: string) {
  try {
    const u = new URL(url);
    const base = u.hostname.replace(/^www\./, "");
    const seg = u.pathname.split("/").filter(Boolean).pop() || "";
    return seg && !["exec", "index", "exec.html"].includes(seg) ? `${base} · ${seg}` : base;
  } catch {
    return url;
  }
}

function HzDiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M19.6 5.4A17 17 0 0 0 15.4 4l-.3.5a13 13 0 0 1 3.6 1.8 12 12 0 0 0-4.7-1.5 13 13 0 0 0-4 .3A12.5 12.5 0 0 1 5.3 6.4 13 13 0 0 1 9 4.6L8.6 4A17 17 0 0 0 4.4 5.4C1.9 9.2 1.2 12.9 1.5 16.5A17 17 0 0 0 6.7 19l.6-1a11 11 0 0 1-1.9-.9l.5-.4a12 12 0 0 0 10.3 0l.5.4a11 11 0 0 1-1.9.9l.6 1a17 17 0 0 0 5.2-2.5c.4-4.2-.6-7.9-2.5-11.1ZM8.6 14.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.8 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}

function PartnershipSection({ onOpen }: { onOpen: () => void }) {
  const { open: openUrl } = useContext(MethodContext);
  return (
    <section className="lnk-sect lnk-partner" aria-label="Partnership">
      <SectionHead
        kicker="Partners"
        title="Partnership"
        blurb="We team up with other hubs that share the mission — free, unblocked school tools. Support theirs, they support ours."
      />
      <div className="lnk-partner-card">
        <span className="lnk-partner-glow" aria-hidden="true" />
        <button className="lnk-partner-main" onClick={onOpen} title={`Open ${HZ_NAME}`}>
          <span className="lnk-partner-shot">
            <img src={asset("images/hyperzteam-preview.png")} alt="" draggable={false} />
          </span>
          <span className="lnk-partner-info">
            <span className="lnk-partner-top">
              <span className="lnk-partner-avatar"><Handshake size={18} /></span>
              <span className="lnk-partner-heading">
                <span className="lnk-partner-name">{HZ_NAME} <span className="lnk-partner-chip">PARTNER</span></span>
                <span className="lnk-partner-host">hyperzhub.pages.dev</span>
              </span>
            </span>
            <span className="lnk-partner-desc">
              A hub of game, proxy and unblocker links — dozens of mirrors so one blocked host never stops you.
            </span>
          </span>
        </button>
        <div className="lnk-partner-actions">
          <button className="lnk-partner-btn is-primary" onClick={onOpen}>
            <ExternalLink size={14} /> View all {HZ_SITES.length + HZ_GROUPS.reduce((n, g) => n + g.urls.length, 0) + 1} links
          </button>
          <a className="lnk-partner-btn is-discord" href={HZ_DISCORD} target="_blank" rel="noreferrer noopener">
            <HzDiscordIcon size={15} /> Join our Discord
          </a>
        </div>
      </div>
    </section>
  );
}

function HzModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { open: openUrl } = useContext(MethodContext);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copyData = async () => {
    try {
      await navigator.clipboard.writeText(HZ_DATA);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard blocked */ }
  };

  const total = HZ_SITES.length + HZ_GROUPS.reduce((n, g) => n + g.urls.length, 0);

  return (
    <div className="lnk-hzmodal" role="dialog" aria-modal="true" aria-label={`${HZ_NAME} links`}>
      <div className="lnk-hzmodal-backdrop" onClick={onClose} />
      <div className="lnk-hzmodal-panel">
        <header className="lnk-hzmodal-head">
          <span className="lnk-hzmodal-title">
            <span className="lnk-partner-avatar"><Handshake size={18} /></span>
            <span className="lnk-hzmodal-heading">
              <strong>{HZ_NAME} <span className="lnk-partner-chip">PARTNER</span></strong>
              <small>{total} links · all mirrors of one hub</small>
            </span>
          </span>
          <button className="lnk-hzmodal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="lnk-hzmodal-body">
          <a className="lnk-hz-discord" href={HZ_DISCORD} target="_blank" rel="noreferrer noopener">
            <span className="lnk-hz-discord-icon"><HzDiscordIcon size={20} /></span>
            <span className="lnk-hz-discord-meta">
              <strong>Join the {HZ_NAME} Discord</strong>
              <small>Get new links first, report dead ones, say hi.</small>
            </span>
            <ArrowUpRight size={18} className="lnk-hz-discord-go" />
          </a>
          <div className="lnk-hz-note is-warn">
            <AlertTriangle size={16} />
            <p><strong>WARNING:</strong> Some links run on 'InfinityFree' — if the 'Hits' usage gets limited and the page won't load, then try links that are lower on the list!</p>
          </div>
          <div className="lnk-hz-note is-info">
            <Sparkles size={16} />
            <p><strong>Info:</strong> We are releasing up to 10 (or more) links a day! Each InfinityFree ACC has its own 'hits' usage!</p>
          </div>

          <div className="lnk-hz-group">
            <div className="lnk-hz-label">Main sites</div>
            <div className="lnk-hz-links">
              {HZ_SITES.map((url, i) => (
                <button key={url} className="lnk-hz-link is-site" onClick={() => openUrl(url)} title={url}>
                  <span className="lnk-hz-link-label">{hostOf(url)}</span>
                  {i === 0 && <span className="lnk-hz-best">Best</span>}
                </button>
              ))}
            </div>
          </div>

          {HZ_GROUPS.map((group) => (
            <div className="lnk-hz-group" key={group.title}>
              <div className="lnk-hz-label">{group.title} <span className="lnk-hz-count">{group.urls.length}</span></div>
              <div className="lnk-hz-links">
                {group.urls.map((url) => (
                  <button key={url} className="lnk-hz-link" onClick={() => openUrl(url)} title={url}>
                    <span className="lnk-hz-link-label">{linkLabel(url)}</span>
                    <ExternalLink size={12} className="lnk-hz-link-go" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="lnk-hz-group">
            <div className="lnk-hz-label">Self-contained page</div>
            <div className="lnk-hz-data">
              <textarea className="lnk-hz-data-text" readOnly value={HZ_DATA} spellCheck={false} onFocus={(e) => e.currentTarget.select()} />
              <button className="lnk-hz-data-copy" onClick={() => void copyData()}>
                <Copy size={14} /> {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="lnk-hz-hint">Triple click on the link and copy paste in the url bar.</p>
          </div>

          <p className="lnk-hz-credit">All links above are made by <strong>{HZ_NAME}</strong>.</p>
        </div>
      </div>
    </div>
  );
}

export function LinksApp() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [hzOpen, setHzOpen] = useState(false);
  const [method, setMethod] = useState<OpenMethod>(readMethod);
  const [status, setStatus] = useState("");
  const field = useRef<HTMLInputElement | null>(null);
  const statusTimer = useRef<number | null>(null);

  const q = query.trim().toLowerCase();
  const direct = useMemo(() => directUrl(q), [q]);

  const proxies = useMemo(
    () => (q ? PROXIES.filter((p) => p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)) : PROXIES),
    [q],
  );

  const ctx = useMemo<OpenCtx>(() => ({
    status,
    open: (url) => {
      const result = openSite(url, method);
      setStatus(`${hostLabel(url)} — ${result.how}`);
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
      statusTimer.current = window.setTimeout(() => setStatus(""), 7000);
    },
  }), [method, status]);

  useEffect(() => () => { if (statusTimer.current) window.clearTimeout(statusTimer.current); }, []);

  const pick = (next: OpenMethod) => { setMethod(next); writeMethod(next); };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setQuery(""); return; }
    if (event.key !== "Enter") return;
    if (direct) { ctx.open(direct); return; }
    if (proxies.length === 1) ctx.open(proxies[0].url);
  };

  const active = METHODS.find((m) => m.id === method) ?? METHODS[0];

  return (
    <MethodContext.Provider value={ctx}>
    <div className="links-app">
      <header className="lnk-top">
        <span className="lnk-brand">
          <img className="lnk-brand-mark" src={asset("images/links.svg")} alt="" />
          <span className="lnk-brand-text">
            <strong>LazyList</strong>
            <small>{q ? (direct ? "press enter to open" : `${proxies.length} match${proxies.length === 1 ? "" : "es"}`) : `${PROXIES.length} proxies`}</small>
          </span>
        </span>
        <div className={`lnk-search${focused ? " is-focus" : ""}`}>
          <Search size={16} />
          <input
            ref={field}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            placeholder="Search the list, or type any address"
            aria-label="Search the list"
            spellCheck={false}
            autoComplete="off"
          />
          {query && <button className="lnk-clear" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); field.current?.focus(); }} aria-label="Clear search"><X size={14} /></button>}
        </div>
      </header>

      <div className="lnk-methods">
        <span className="lnk-methods-label">Open with</span>
        <div className="lnk-seg" role="radiogroup" aria-label="Open method">
          {METHODS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={method === item.id}
                className={`lnk-seg-btn${method === item.id ? " is-on" : ""}`}
                onClick={() => pick(item.id)}
                title={item.hint}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </div>
        <span className={`lnk-methods-hint${status ? " is-status" : ""}`}>{status || active.hint}</span>
      </div>

      <div className="lnk-body">
        <FeaturedSection compact={Boolean(q)} />

        <PartnershipSection onOpen={() => setHzOpen(true)} />

        {direct && (
          <button className="lnk-direct" onClick={() => ctx.open(direct)}>
            <span className="lnk-direct-icon"><ArrowUpRight size={16} /></span>
            <span className="lnk-direct-text">
            <strong>{q}</strong>
            <small>open {direct}</small>
            </span>
          </button>
        )}

        {proxies.length > 0 && <ProxyRow items={proxies} />}

        {proxies.length === 0 && !direct && (
          <div className="lnk-empty">
            <Search size={22} />
            <p>Nothing matches <strong>{query}</strong>.</p>
            <small>Try a name, or just type the address and press Enter.</small>
          </div>
        )}
      </div>
      <HzModal open={hzOpen} onClose={() => setHzOpen(false)} />
    </div>
    </MethodContext.Provider>
  );
}
