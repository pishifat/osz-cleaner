import colors from 'colors';

export function logDefault (message) {
	console.log(message.bgBlue.black);
}

export function logError (message) {
	console.log(message.bgRed.black);
}

export function logCheck (message) {
	console.log(message.bgGreen.black);
}

export function logInfo (message) {
    console.log(message.bgCyan.black);
}

export function logWarn (message) {
    console.log(message.bgYellow.black);
}