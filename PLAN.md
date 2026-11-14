# PLAN.md — Lunar Landing Site Navigator

Projekt für die NASA Space Apps Challenge 2026, Challenge **„Lunar Landing Site Navigator"**, Local Event Ahlen (virtuell).

Diese Datei ist der Arbeitsplan für Claude Code. Lies sie vollständig, bevor du anfängst, und arbeite die Meilensteine der Reihe nach ab.

---

## 1. Termine (Ortszeit, MEZ)

| Wann | Was |
|---|---|
| Sa 14.11., ab jetzt | Entwicklung |
| So 15.11., 12:00 | **Feature-Freeze.** Danach nur noch Fehler beheben. |
| So 15.11., 13:00 | Projektseite, Demo-Video, Präsentation vorbereiten |
| So 15.11., 15:00 | Präsentation vor der lokalen Jury |
| So 15.11., 17:00 | Eigene Abgabefrist (Puffer) |
| So 15.11., 19:00 | Harte Abgabefrist des Local Events |

Die Zeit ist knapp. Im Zweifel gilt: lieber weniger Funktionen, die sauber laufen, als viele halbfertige.

---

## 2. Die Aufgabe

Ein Tool, mit dem Missionsplaner, Lehrende und die Öffentlichkeit Landeplätze auf dem Mond und Landetermine **schnell vergleichen** können. Es zeigt, wo **Sonne und Erde relativ zum Horizont** stehen, um zwei Dinge einzuschätzen:

- **Strom:** Steht die Sonne über dem Horizont? Wie hoch, wie lange noch?
- **Funk:** Ist die Erde sichtbar (direkte Verbindung ohne Relaissatellit)? Wie lange noch?

Besonders wichtig ist der **Südpol**: Dort stehen Sonne und Erde immer knapp am Horizont, kleine Änderungen bei Ort oder Datum entscheiden über Licht und Funkkontakt.

Laut Aufgabenstellung sind bestehende Tools (Quickmap, Moon Trek, Horizons) für Laien schwer zu bedienen. Unser Mehrwert ist deshalb die **einfache, schnelle Bedienung**, nicht maximale Datentiefe.

### Was die Aufgabenstellung nennt (alles „may consider")

1. Auswahl bekannter Landeplätze plus eigene Koordinaten, Vergleich nebeneinander
2. Datum und Uhrzeit frei wählbar
3. Sonnen- und Erdposition relativ zum Horizont, Zeit bis Sonnenuntergang und Erduntergang
4. Kennzahlen: Sonnenhöhe, Dauer des Sonnenlichts, Sichtfenster zur Erde
5. Verschiedene Darstellungen (2D, 3D)
6. Animation oder Zeitleiste über einen Mondtag oder mehrere Tage
7. Verständlich für Fachleute und Laien

---

## 3. Unser Konzept

**Hauptfenster:** 3D-Mond, drehbar und zoombar, beleuchtet aus der echten Sonnenrichtung zum gewählten Zeitpunkt.

**Seitenleiste links (aufklappbar):** Landeplatz wählen oder Koordinaten eingeben, Kennzahlen, Ampelbewertung, Schalter für Hervorhebungen.

**Zeitleiste unten:** Regler für Vergangenheit und Zukunft, Play-Taste, Geschwindigkeit.

**Vergleichsansicht:** Diagramm mit Sonnen- und Erdhöhe über 30 Tage für zwei Plätze im selben Zeitraum. (Vergleich zweier Termine bewusst gestrichen, spart Zeit.)

### Ausdrücklich NICHT im Umfang

- Eingabe von Rover- oder Landermaßen und Hinderniserkennung (bräuchte Hangneigung aus Höhendaten, zu groß für die Zeit)
- Flächendeckende echte Geländeschatten am Südpol
- Nutzerkonten, Backend, Datenbank

### Bekannte Einschränkung (so auch in die Abgabe schreiben)

Wir rechnen mit einem **glatten, idealen Horizont** (Mond als Kugel), korrigiert um die **Kimmtiefe** des Landeplatzes (siehe Abschnitt 6): Ein erhöhter Platz sieht unter den geometrischen Horizont und hat deshalb länger Sonne und Erdsicht. Das umliegende Gelände bleibt unberücksichtigt. In Wirklichkeit können Kraterränder und Berge Licht und Erde verdecken (Kraterböden bekommen dann weniger Licht), oder hohe Gipfel sehen noch weiter (mehr Licht). Unsere Werte sind also **weder Ober- noch Untergrenze**, sondern eine Näherung für freistehende Plätze, kein Ersatz für eine Geländeanalyse. Das Horizontprofil aus Höhendaten ist ein Zusatzziel (siehe Meilenstein 6).

---

## 4. Technik

- **Build:** Vite, Vanilla JavaScript oder TypeScript (nimm, womit es schneller geht). Kein schweres Framework nötig.
- **3D:** three.js mit OrbitControls
- **Positionsberechnung:** `astronomy-engine` (npm), läuft komplett im Browser
- **Diagramme:** Chart.js oder uPlot
- **Hosting:** GitHub Pages oder Vercel (statische Seite, die Jury braucht einen Link)
- **Sprache der Oberfläche:** Englisch (die globale Bewertung läuft auf Englisch)

### Vorschlag Projektstruktur

```
/
├─ PLAN.md
├─ README.md               (Englisch: Was, Wie, Datenquellen, KI-Nutzung)
├─ index.html
├─ public/textures/        (Mondtextur als JPG)
├─ src/
│  ├─ main.js
│  ├─ ephemeris.js         (Sonne/Erde über dem Horizont)
│  ├─ windows.js           (Auf-/Untergänge, Sichtfenster, Bewertung)
│  ├─ sites.js             (Liste der Landeplätze)
│  ├─ scene.js             (three.js: Mond, Licht, Marker)
│  ├─ ui/sidebar.js
│  ├─ ui/timeline.js
│  └─ ui/compare.js
├─ scripts/horizons-check.mjs   (Vergleich mit JPL Horizons)
└─ tests/ephemeris.test.js
```

---

## 5. Ressourcen

### Aus der Aufgabenstellung (NASA)

| Ressource | Link | Wofür wir sie nutzen |
|---|---|---|
| JPL Horizons System | https://ssd.jpl.nasa.gov/horizons/ | Referenzwerte: Höhe und Azimut von Sonne und Erde für einen Punkt auf dem Mond. Damit prüfen wir unsere Berechnung. |
| LROC Quickmap | https://quickmap.lroc.asu.edu/ | Koordinaten und Gelände von Landeplätzen nachschlagen, Screenshots für die Präsentation |
| Moon Trek | https://trek.nasa.gov/moon/ | 3D-Ansicht des Geländes, Koordinaten gegenprüfen |
| CSA Moon Exploration | https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/ | Hintergrund zu Missionen (Partnerressource) |

### Zusätzlich (vor Verwendung URL und Lizenz kurz prüfen)

| Ressource | Link | Wofür |
|---|---|---|
| Horizons API (Doku) | https://ssd-api.jpl.nasa.gov/doc/horizons.html | Automatische Abfrage für das Prüfskript |
| NASA SVS CGI Moon Kit | https://svs.nasa.gov/4720 | Mondtextur (Farbe) und Höhenkarte aus LRO-Daten. Dateien sind TIFF und müssen nach JPG/PNG umgewandelt werden. Für den Start reicht 2k oder 4k. |
| LOLA-Südpol-Höhenmodelle (NASA GSFC PGDA) | https://pgda.gsfc.nasa.gov/products/78 | Nur für das Zusatzziel Horizontprofil |
| astronomy-engine | https://github.com/cosinekitty/astronomy | Positionen von Sonne und Mond, Rotationsachse des Mondes, Libration |
| three.js | https://threejs.org/docs/ | 3D-Darstellung |

### Hinweise zu Horizons

- Beobachter auf der Mondoberfläche: `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='<Länge Ost>,<Breite>,<Höhe km>'`
- Ziel: `COMMAND='10'` (Sonne) bzw. `COMMAND='399'` (Erde)
- Ausgabe: `QUANTITIES='4'` (scheinbarer Azimut und Höhe)
- Diese Parameter gegen die API-Doku prüfen, bevor du dich darauf verlässt.
- Die API lässt sich vermutlich nicht direkt aus dem Browser aufrufen (CORS). Deshalb nur im Node-Skript `scripts/horizons-check.mjs` verwenden, nicht in der App.

---

## 6. Berechnung: Sonne und Erde über dem lokalen Horizont

Das ist der Kern des Projekts. Er muss stimmen, bevor die Oberfläche gebaut wird.

**Eingabe:** Breite φ, Länge λ (Ost positiv) auf dem Mond, Höhe h des Platzes (km, relativ zum Referenzradius 1737,4 km), Zeitpunkt t (UTC).
**Ausgabe:** Höhe und Azimut der Sonne, Höhe und Azimut der Erde, jeweils geometrisch und relativ zum scheinbaren Horizont (mit Kimmtiefe).

### Vorgehen mit astronomy-engine

1. `moon = GeoMoon(t)`: Vektor Erde → Mond (äquatorial J2000).
2. `sun = GeoVector(Body.Sun, t, true)`: Vektor Erde → Sonne.
3. Richtungen vom Mond aus:
   - zur Sonne: `dSun = normalize(sun − moon)`
   - zur Erde: `dEarth = normalize(−moon)`
   - Für einen Landeplatz die Richtung **topozentrisch** rechnen (vom Platz aus, nicht vom Mondmittelpunkt): Die Parallaxe der Erde beträgt nahe am Horizont bis ca. 0,26°. (Erkenntnis aus dem Horizons-Abgleich in M2.)
4. `axis = RotationAxis(Body.Moon, t)` liefert den Nordpol (`north`, Einheitsvektor), `ra`, `dec` und `spin` (Winkel W des Nullmeridians in Grad).
   **Achtung Einheiten:** `ra` ist in **Stunden** (Sternzeit), `dec` und `spin` sind in Grad. Vor der Verwendung `raDeg = ra * 15` rechnen.
5. Mondfestes Koordinatensystem aufbauen:
   - `z = north`
   - `Q = (cos(raDeg + 90°), sin(raDeg + 90°), 0)` (aufsteigender Knoten des Mondäquators)
   - `x = Q·cos(W) + (z × Q)·sin(W)` (zeigt zum Nullmeridian)
   - `y = z × x`
6. Flächennormale am Landeplatz:
   `n = cosφ·cosλ·x + cosφ·sinλ·y + sinφ·z`
7. Höhe: `elevation = asin(n · d)`
8. Azimut: `east = normalize(z × n)`, `northLocal = n × east`,
   `azimuth = atan2(d · east, d · northLocal)` (0° = Nord, 90° = Ost).
   An den Polen ist `east` nicht definiert. Diesen Fall abfangen (z. B. Azimut relativ zum Nullmeridian angeben).
9. Kimmtiefe (Horizontabsenkung durch die Höhe des Platzes):
   `dip = acos(R / (R + h))` mit R = 1737,4 km, h in km; für h ≤ 0 gilt `dip = 0`.
   Näherung zum Prüfen: `dip ≈ √(2h/R)`, also h = 2 km → ca. 2,7°, h = 5 km → ca. 4,3°.
   Höhe über dem scheinbaren Horizont: `elevationApparent = elevation + dip`.
   Alle Fenster und die Ampel verwenden `elevationApparent`. Die Plausibilitätsprüfungen und der Horizons-Abgleich verwenden die geometrische `elevation` (h = 0).

### Pflichtprüfungen

- **Plausibilität 1:** Der Punkt direkt unter der Erde (wo `dEarth` senkrecht steht) muss nahe 0° Breite, 0° Länge liegen, mit Schwankung von wenigen Grad (Libration). Mit `Libration(t)` aus astronomy-engine vergleichen.
- **Plausibilität 2:** Bei Vollmond steht die Sonne nahe (0°, 0°) im Zenit, bei Neumond nahe (0°, 180°).
- **Plausibilität 3:** Am Südpol bleibt die Sonnenhöhe immer zwischen etwa −1,6° und +1,6°.
- **Referenz:** Für mindestens 3 Plätze und 5 Zeitpunkte mit Horizons vergleichen. Ziel: Abweichung unter 0,5°. Ergebnis in die README schreiben.
- **Kimmtiefe:** Test, dass `dip(0) = 0` und `dip(2 km)` ≈ 2,7° ist.

### Zahlen für die Bewertung

- Scheinbarer Radius der Sonne vom Mond aus: ca. 0,27°
- Scheinbarer Radius der Erde vom Mond aus: ca. 0,95°
- Ein Mondtag (Sonnenaufgang zu Sonnenaufgang) dauert ca. 29,5 Erdtage.

### Fenster und Bewertung (`windows.js`)

- Höhe von Sonne und Erde stündlich über 30 Tage abtasten (720 Werte), Vorzeichenwechsel suchen, mit Bisektion auf die Minute genau verfeinern.
- Kennzahlen pro Platz und Zeitpunkt:
  - Sonnenhöhe jetzt, Erdhöhe jetzt
  - Zeit bis zum nächsten Sonnenuntergang bzw. Sonnenaufgang
  - Zeit bis zum nächsten Erduntergang bzw. Erdaufgang
  - Sonnenstunden in den nächsten 14 Tagen
  - Stunden mit Erdsicht in den nächsten 14 Tagen
- Ampel, getrennt für **Power** und **Comms** (Schwellen als Konstanten, leicht änderbar):
  - Grün: Höhe > 2°
  - Gelb: Höhe zwischen 0° und 2° (streifend, in echtem Gelände unsicher)
  - Rot: Höhe < 0°
- Gesamtbewertung = der schlechtere der beiden Werte.

---

## 7. Landeplätze (`sites.js`)

**Die Koordinaten unten sind Näherungen aus dem Gedächtnis. Jede einzelne mit Quickmap, Moon Trek oder einer NASA-Quelle prüfen, bevor sie in die App kommt.** Pro Eintrag: Name, Mission, Jahr, Breite, Länge, **Höhe h (km, relativ zu 1737,4 km)**, Kategorie, Quelle.

Die Höhe h für jeden Platz in Quickmap (LOLA-Höhe) nachschlagen und mit Quelle eintragen. Sie ist vor allem für die Südpol-Plätze wichtig (Kimmtiefe, siehe Abschnitt 6). Solange sie nicht geprüft ist: h = 0 und als „zu prüfen" markieren. Bei eigenen Koordinaten ist h optional (Standard 0).

| Platz | Mission | Breite | Länge (Ost) | Kategorie |
|---|---|---|---|---|
| Mare Tranquillitatis | Apollo 11 (1969) | 0,67° N | 23,47° E | Apollo |
| Taurus-Littrow | Apollo 17 (1972) | 20,19° N | 30,77° E | Apollo |
| Mare Crisium | Blue Ghost M1 (CLPS, 2025) | 18,6° N | 61,8° E | CLPS |
| Malapert A | IM-1 Odysseus (CLPS, 2024) | 80,1° S | 1,4° E | CLPS, Südpol |
| Mons Mouton | IM-2 Athena (CLPS, 2025) | 84,8° S | 29,2° E | CLPS, Südpol |
| Shiv Shakti Point | Chandrayaan-3 (2023) | 69,37° S | 32,35° E | International |
| Shioli-Krater | SLIM (2024) | 13,3° S | 25,2° E | International |
| Von-Kármán-Krater | Chang'e 4 (2019) | 45,4° S | 177,6° E | International, Rückseite |
| Shackleton-Kraterrand | Kandidat (Artemis-Region) | 89,7° S | 0° E (prüfen) | Kandidat, Südpol |

**Stand M4:** Die geprüften Werte mit Quelle stehen in `src/sites.js`. Abweichungen zur Tabelle oben: Chang'e 4 liegt laut LROC bei 45,4561° S / 177,5885° O, der Shackleton-Punkt ist der Schnittpunkt des Shackleton–de-Gerlache-Grats mit dem Kraterrand bei 89,684° S / 196,739° O (= −163,261°). Belegte Höhen gibt es bisher nur für SLIM (−0,912 km) und Chang'e 4 (−5,927 km); die Höhen der Südpol-Plätze fehlen noch (Quickmap/LOLA).

Weitere Kandidaten bei Bedarf: Artemis-III-Kandidatenregionen (z. B. Nobile Rim, Haworth, de Gerlache Rim), Chang'e 6.

Zusätzlich: Eingabefelder für eigene Koordinaten und Klick auf den Mond, um einen Punkt zu setzen.

---

## 8. Meilensteine

Nach jedem Meilenstein: lauffähigen Stand committen, kurz zeigen, erst dann weiter.

### M1 — Grundgerüst und Mond (Ziel: Sa 17:00)
- Vite-Projekt, three.js, OrbitControls
- Mondkugel mit LRO-Farbtextur
- Git-Repo anlegen (öffentlich auf GitHub) und Deployment einrichten (GitHub Pages oder Vercel), damit ab jetzt jeder Commit unter einem festen Link erreichbar ist
- **Fertig, wenn:** Mond dreh- und zoombar ist, ein Testmarker für Apollo 11 sichtbar im Mare Tranquillitatis liegt (prüft, dass Textur und Koordinaten richtig zugeordnet sind) und der Stand unter dem öffentlichen Link läuft.

### M2 — Berechnung (Ziel: Sa 19:00)
- `ephemeris.js` nach Abschnitt 6 (inklusive Kimmtiefe)
- Tests für die drei Plausibilitätsprüfungen und die Kimmtiefe
- `scripts/horizons-check.mjs` und Vergleich dokumentieren
- **Fertig, wenn:** Tests grün sind und die Abweichung zu Horizons unter 0,5° liegt.

### M3 — Zeit und Licht (Ziel: Sa 21:00)
- Zeitleiste mit Regler, Datumsfeld, Play/Pause, Geschwindigkeit
- Gerichtetes Licht aus `dSun`, umgerechnet ins mondfeste System, damit der Mond fest bleibt und das Licht wandert
- Pfeil oder kleine Erdkugel in Richtung `dEarth`
- **Fertig, wenn:** die Tag-Nacht-Grenze beim Abspielen in ca. 29,5 Tagen einmal um den Mond läuft.

### M4 — Landeplätze und Seitenleiste (Ziel: Sa 23:30)
- Marker für alle Plätze, eingefärbt nach Ampel für den aktuellen Zeitpunkt
- Seitenleiste: Platzliste nach Kategorie, eigene Koordinaten, Kennzahlen aus `windows.js`
- Kleine Horizontgrafik: Halbkreis oder Streifen mit Sonne und Erde relativ zur Horizontlinie
- Schalter: Marker ein/aus, Ampelfarben ein/aus, Südpolansicht
- **Fertig, wenn:** man einen Platz anklickt und sofort sieht, ob Strom und Funk möglich sind und wie lange noch.

### M5 — Vergleich (Ziel: So 11:00)
- Zwei Plätze wählen (gleicher Zeitraum)
- Diagramm: Sonnen- und Erdhöhe über 30 Tage, Horizontlinie bei 0°, Bereiche über dem Horizont farbig hinterlegt
- Tabelle mit den Kennzahlen nebeneinander
- **Fertig, wenn:** man in unter einer Minute beantworten kann: „Welcher von zwei Plätzen hat im gewählten Monat mehr Sonnenstunden und mehr Erdsicht?"

### M6 — Feinschliff und Zusatzziele (So bis 12:00, nur wenn M1 bis M5 stehen)
Reihenfolge nach Nutzen:
1. Erklärtexte für Laien (Tooltips: Warum ist der Südpol schwierig?)
2. Test des deployten Stands auf einem zweiten Gerät (Deployment selbst ist schon Teil von M1)
3. Höhenkarte als Relief auf dem Mond (Displacement Map aus dem CGI Moon Kit)
4. Benannte Krater und Berge als einblendbare Beschriftung
5. Horizontprofil aus LOLA-Höhendaten für 1 bis 2 Südpol-Plätze

**Ab 12:00 keine neuen Funktionen mehr.**

---

## 9. Abgabe (So ab 13:00)

Die offiziellen Anforderungen stehen im Project Submission Guide von Space Apps. Vor der Abgabe dort gegenprüfen. Vorzubereiten sind:

- **Projektseite** auf der Teamseite (Project-Tab): Kurzbeschreibung, ausführliche Beschreibung, Link zur Demo, Link zum Code
- **Demo:** kurzes Video oder Folien, das die App in Aktion zeigt
- **Verwendete NASA-Daten** klar benennen: Horizons (Referenz), LRO/CGI Moon Kit (Textur), Quickmap und Moon Trek (Koordinaten)
- **KI-Nutzung offenlegen:** angeben, dass und wofür Claude / Claude Code verwendet wurde (Planung, Code)
- **Einschränkung nennen:** glatter Horizont mit Kimmtiefe, umliegendes Gelände nicht berücksichtigt, siehe Abschnitt 3
- Öffentliches Code-Repository mit README auf Englisch

### Roter Faden für die Präsentation (3 bis 5 Minuten)

1. Problem: Am Südpol entscheiden Ort und Datum über Strom und Funk, vorhandene Tools sind schwer zu bedienen.
2. Live-Demo: Platz wählen, Zeit verschieben, Ampel wechselt.
3. Vergleich: zwei Südpol-Plätze im selben Monat.
4. Daten und Genauigkeit: Abgleich mit JPL Horizons.
5. Grenzen und nächste Schritte: echtes Geländeprofil.

---

## 10. Arbeitsregeln für Claude Code

- Meilensteine in der Reihenfolge abarbeiten. Kein Zusatzziel anfangen, bevor M5 fertig ist.
- Nach jedem Meilenstein committen und den Stand kurz zusammenfassen.
- Keine Koordinaten, Zahlen oder Links erfinden. Was nicht belegt ist, als „zu prüfen" markieren.
- Einfache Lösungen bevorzugen. Keine zusätzlichen Abhängigkeiten ohne guten Grund.
- Wenn etwas länger als ca. 45 Minuten blockiert: einfacheren Weg vorschlagen und nachfragen.
- Oberfläche und README auf Englisch, Rückfragen an das Team auf Deutsch.
