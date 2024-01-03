turn any `.osz` into a clean map template

everything is set to defaults or removed except

- song metadata (artist/title)
- timing points (BPM/meter)
- background (if `background` variable in `variables.json` is set to `false`)

## how to run

1. `npm i` in terminal
2. create folder called `temp` in main directory
3. put maps in `maps.zip` in main directory
4. `node cleaner.js` in terminal

clean `.osz` files will be generated in `output` folder
