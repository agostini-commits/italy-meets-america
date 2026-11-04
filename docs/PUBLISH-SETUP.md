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
