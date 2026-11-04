# "Publish to site": configurazione (una volta sola)

Il pulsante nel foglio avvia un'azione GitHub (`.github/workflows/publish.yml`) che:
legge il foglio → scarica da Drive le foto nuove o cambiate → controlla i dati → genera immagini e sito →
pubblica su Netlify → scrive l'esito nella scheda **_Publish** del foglio. Circa 2–3 minuti.

Il foglio **non** va pubblicato sul web: contiene colonne interne (contatti dei clienti, note). Lo legge un
account di servizio Google che vede solo il foglio e la cartella foto. Le colonne che iniziano con `_` vengono
scartate appena lette e non arrivano mai nel repository né sul sito.

| Cosa | Valore |
|---|---|
| Foglio dati | `15YCZ1CYHhVl9hOGppfjQOQt8_ToyUsPOeoBenA6RxKg` |
| Cartella foto (Drive) | `1GhsGf2eXrM9wU8BdjxjBFD4Y07rtdw-k` — "Italy meets America – Photos" |
| Sito Netlify (site id) | `8c9d58db-22d4-47fd-a8ae-a408c6f63bbc` |

## 1. Account di servizio Google (IT o chi gestisce Google Cloud)

1. Google Cloud Console → un progetto BFC → **API e servizi** → abilitare **Google Sheets API** e **Google Drive API**.
2. **IAM → Account di servizio → Crea**: nome `italy-meets-america-publisher`, nessun ruolo.
3. Sull'account creato: **Chiavi → Aggiungi chiave → JSON**. Si scarica un file: è una password, non va inviato per email.
4. Condividere con l'email dell'account (`…@….iam.gserviceaccount.com`):
   - il **foglio dati** come **Editor** (serve per scrivere l'esito nella scheda _Publish);
   - la **cartella foto** come **Visualizzatore**.
   Se il dominio blocca la condivisione con indirizzi esterni, va consentita per questo account.

## 2. GitHub (repo agostini-commits/italy-meets-america → Settings)

**Secrets and variables → Actions → Secrets**
- `GOOGLE_SERVICE_ACCOUNT_JSON`: tutto il contenuto del file JSON del punto 1.3.
- `NETLIFY_AUTH_TOKEN`: Netlify → User settings → Applications → **Personal access tokens → New**.
- `NETLIFY_SITE_ID`: `8c9d58db-22d4-47fd-a8ae-a408c6f63bbc`.

**Secrets and variables → Actions → Variables** (scheda Variables, non Secrets)
- `PUBLISH_ENABLED`: `true` (così anche ogni modifica al codice unita su `main` va online con i dati del foglio)
- `SHEET_ID` e `DRIVE_FOLDER_ID` non servono: foglio e cartella sono già scritti nell'automazione. Aggiungerli solo
  se cambiano (stessi nomi, valore = nuovo ID).

**Token per il foglio**: profilo GitHub → Settings → Developer settings → **Fine-grained tokens → Generate**:
repository solo `italy-meets-america`, permesso **Actions: Read and write**, scadenza 1 anno (da rinnovare).

## 3. Il menu nel foglio

1. Foglio dati → **Estensioni → Apps Script**.
2. Incollare `apps-script/Publish.gs` (al posto del contenuto di `Codice.gs`).
3. Impostazioni progetto → spuntare "Mostra il file manifest appsscript.json" → incollare `apps-script/appsscript.json`.
4. Impostazioni progetto → **Proprietà script**:
   - `GITHUB_TOKEN` = il token del punto 2;
   - `PUBLISHERS` (facoltativo) = email abilitate a pubblicare, separate da virgola. Vuoto = tutti gli editor del foglio.
5. Salvare, ricaricare il foglio: compare il menu **Italy meets America**. Al primo uso Google chiede l'autorizzazione.

## 4. Netlify

**Non collegare il repository a Netlify**: pubblica solo l'azione GitHub, che legge i dati aggiornati dal foglio.
Un collegamento diretto pubblicherebbe i dati salvati nel repository, che possono essere più vecchi.

## Uso quotidiano

1. Compilare le righe, stato **approved** su quelle pronte; foto e loghi nella cartella "Italy meets America – Photos"
   (anche in sottocartelle), con il nome scritto nel foglio.
2. Menu **Italy meets America → Publish to site**: il riepilogo dice quante schede vanno online e quali sono
   bloccate dai controlli. Confermare.
3. Dopo 2–3 minuti l'esito è nella scheda **_Publish** (anche **Publish status** nel menu). Le righe con errori
   non vengono pubblicate; quelle con avvisi sì. Il dettaglio completo è nel link "Details" (riepilogo e report scaricabile).

## Se qualcosa non va

| Messaggio | Causa |
|---|---|
| "Setup incomplete, missing: …" | manca un secret del punto 2 (i nomi devono essere esatti, nella sezione Repository secrets di **Actions**) |
| "Google API 403/404 … shared with the service account?" | foglio o cartella non condivisi con l'account di servizio |
| "GitHub did not accept the request (401)" | `GITHUB_TOKEN` scaduto o senza permesso Actions |
| "Strict mode: approved cards with errors" | una scheda approvata ha errori: correggere (vedi scheda Checks) o rimetterla in `in_review` |
| Foto "not on Drive" | nome nel foglio diverso dal nome del file su Drive (attenzione a maiuscole ed estensione) |

Prova senza Google: `scripts` accettano `GOOGLE_SHEETS_API` / `GOOGLE_DRIVE_API` per un server finto (usato nei test del 04/11/2026).

## Modulo per le aziende (raccolta dati)

`apps-script/Form.gs` (stesso progetto Apps Script del foglio, file a parte) crea un Modulo Google collegato al foglio:
ogni risposta diventa una riga di **Companies** in stato **draft**.

1. Nell'editor Apps Script: **+** accanto a "File" → **Script** → nome `Form` → incollare `apps-script/Form.gs`.
2. Sostituire `appsscript.json` con la versione aggiornata (servono i permessi per Moduli, Presentazioni, trigger e
   Google Maps) e salvare.
3. Ricaricare il foglio → **Italy meets America → Create the company form** → autorizzare. Il messaggio finale dà il
   link da mandare alle aziende e quello per modificare il Modulo. Va fatto **una volta sola** (una seconda volta
   mostra di nuovo i link).

Come funziona:
- Due parti (AGO 04/11), prima il racconto perché è quello che promette la slide: **1 · Il racconto dell'azienda**
  (nome, presentazione, mission, vision, citazione, buyer, prodotti simbolo, offerta per l'America, titolo sulla foto,
  eventi USA: il marketing, in inglese, circa 30 minuti) e **2 · Dati pratici** (ragione sociale, sede su Google Maps,
  settore, anno, sito, email, social, link a foto e logo, referente, autorizzazione: pochi minuti). Limiti di caratteri controllati durante la compilazione.
- **Indirizzo da Google Maps**: l'azienda incolla il link della sede (Maps → Condividi → Copia link). Lo script segue il
  link corto, legge le coordinate (o il nome del luogo) e chiede a Google Maps via, CAP, città (in inglese), provincia e
  regione (portata ai nomi di `Lists`). Se il link non si legge la riga nasce lo stesso, con una nota in `_internal_notes`.
- **Rebuild the company form**: dopo una modifica di `Form.gs` ricostruisce le domande sullo **stesso** Modulo (stesso
  link); le risposte già arrivate restano in `_Form responses`.
- **Short link and slide**: crea il link corto `forms.gle` e lo scrive (testo e clic) nella slide "Cosa chiediamo alle
  aziende" (`IMA_FORM.SLIDE_ID`), al posto del link lungo. Si può rilanciare.
- Compilabile senza account Google. Le foto **non** si caricano dal Modulo (Google chiederebbe l'accesso): l'azienda
  incolla un link WeTransfer/Dropbox/Drive, salvato in `_internal_notes`. La redazione mette i file nella cartella
  foto e scrive i nomi nelle colonne `logo`, `photo`, `gallery_*`.
- La redazione completa `package` (`corporate`, `priority`, `extended`, `cover_partner`: i 4 pacchetti del mediakit) e controlla il settore; poi `to_client` per mandare la bozza,
  `approved` dopo l'ok del cliente.
- La stessa azienda che rimanda il Modulo mentre la riga è `draft` aggiorna quella riga; se la riga è già oltre la
  bozza ne nasce una nuova con id `-2` (da controllare).
- Le risposte originali restano nella scheda `_Form responses`.
