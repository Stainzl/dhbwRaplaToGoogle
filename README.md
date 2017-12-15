# dhbwRaplaToGoogle
This node script copys data from dhbw rapla to a defined google calendar and syncs it

## Instalation
To run this script you need to have node.js with npm installed.
For first run load all used npm packages with `npm install`.
After this got to [Enable Google Calendar Api](https://console.developers.google.com/flows/enableapi?apiid=calendar "Enable Google Calendar Api") and follow the Instructions.
Now create an OAuth-Token and save it as `client_secret.json`.

Then copy the part behind `key=` and the next `&` or the end. Paste that to your `config.json`, you could copy `config.example.json`, to the `calendar_key`-property.

Find our Google Calendar ID and paste it to the `g_cal`-property.

## Run it
From command line run `node quickstart.js` or on any UNIX-like system `start.sh`.
