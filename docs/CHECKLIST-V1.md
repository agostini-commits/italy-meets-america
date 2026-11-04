# Italy meets America – checklist v1 (04/11/2026)

Sito: https://italy-meets-america.netlify.app · Repo: agostini-commits/italy-meets-america

## Come aggiornare i dati dal foglio Google

1. Compilare il foglio **"Italy meets America – Yearbook DATA"**, scheda **Companies** (una riga = un'azienda).
   La scheda **Checks** dice subito cosa manca o è troppo lungo; **Fields** spiega ogni colonna.
2. Mettere lo stato **approved** sulle righe pronte (solo `approved` e `published` vanno online).
3. Caricare le foto originali (min. 2600×3600 px) e i loghi (SVG o PNG) nella cartella Drive, con il nome scritto nel foglio.
4. Pubblicazione (oggi, a mano, finché non c'è il pulsante "Publish to site"):
   ```bash
   npm run import-data -- --url "<link CSV pubblicato della scheda Companies>"
   npm run images
   npm run build
   ```
   poi commit e deploy. Leggere `data/import-report.md`: le righe con errori **non** vengono pubblicate,
   quelle con avvisi sì (es. foto troppo piccola per la stampa).
5. Prossimo passo concordato: pulsante nel foglio → GitHub Action (scarica dati e foto da Drive, controlla,
   genera, pubblica su Netlify) in 1–2 minuti, senza toccare file.

## Test fatti (in automatico, Chromium + emulazione)

| Area | Esito |
|---|---|
| Dati: import, validazione, report | ✅ 12 test; limiti, slug, email, https, settori/regioni scritti male, foto sotto 2600×3600 |
| Scheda mobile 360 / 390 / 430 px | ✅ niente scorrimento orizzontale, tocchi ≥ 44 px, testo 16 px, nome 34 px, titolo 36–40 px |
| Tablet 768 px | ✅ |
| Desktop 900 → 1920 px | ✅ doppia pagina foto 38% / testo 62%, 297:210 da ~1050 px di altezza |
| Sfogliatore | ✅ tasti ← → PagSu/PagGiù, pulsanti, swipe (iPhone 13 emulato), scroll verticale non gira pagina |
| Indice | ✅ 11 test di ricerca; filtri, conteggi, indirizzo condivisibile, tasto indietro |
| Stampa Magazine A4 | ✅ PDF generato: 210×297 mm, copertina + 2 pagine per scheda, numeri di pagina |
| Stampa Single sheet A4 | ✅ PDF generato: copertina 210×297 + schede 297×210 mm |
| Stampa per la tipografia | ✅ PDF 230×317 / 317×230 mm (3 mm abbondanza + segni di taglio) |
| Scheda con tutti i campi al massimo | ✅ entra in entrambi i formati; con testo oltre i limiti compare l'avviso |
| Lighthouse mobile | ✅ Performance 97–98, Accessibilità 100, Best practices 100, SEO 100 |
| Prima scheda visibile su 4G | ✅ 0,4–0,5 s (copertina 0,5 s); su 4G lento 2,0–2,9 s |
| PWA installabile | ✅ Chrome: manifest e installabilità senza errori |
| Offline dopo la prima visita | ✅ tutte le pagine; foto viste presenti, le altre col colore dominante |
| Anteprima link (Open Graph) | ✅ titolo, descrizione e foto 1200×630 per ogni scheda |

## Da provare a mano su dispositivi veri (non possibile da qui)

- [ ] **iPhone (Safari)**: aprire una scheda dal link, swipe, "Install the app" → Condividi → Aggiungi a Home,
      riaprire dall'icona in modalità aereo.
- [ ] **Android (Chrome)**: "Install the app" → installazione, riapertura offline.
- [ ] **Windows / macOS (Chrome o Edge)**: icona di installazione nella barra degli indirizzi.
- [ ] **Stampa da Chrome desktop**: Print → "Salva come PDF", margini "Predefiniti" o "Nessuno",
      **Grafica di sfondo attiva**; Magazine e Single sheet.
- [ ] **Safari / Firefox desktop**: stampa (le pagine con dimensioni miste sono supportate meglio da Chrome).
- [ ] **Anteprima su LinkedIn e WhatsApp**: incollare il link di una scheda.

## Limiti noti

- Le foto di esempio vengono dal PDF (907–1196 px): vanno bene a schermo, non per la stampa. I loghi mancano.
- Il PDF dal browser non contiene TrimBox/BleedBox: la tipografia legge il taglio dai segni.
- Offline sono disponibili tutti i testi; le foto solo se già viste.
- Editoriale e colophon: testi da fornire.
