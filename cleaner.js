import fs from 'fs';
import fsExtra from 'fs-extra';
import AdmZip from 'adm-zip';
import FileType from 'file-type';
import { logDefault, logError, logCheck, logInfo, logWarn } from './helper/logger.js';
import { parseBuffer } from 'music-metadata';
import variables from './variables.json' assert { type: 'json' };

// find filetype
async function findFileType(file) {
    return await FileType.fromFile(file);
}

// reset directories
function reset() {
    const directories = ['./temp/unpacked', './temp/osz', './output'];

    for (const dir of directories) {
        if (fs.existsSync(dir)) {
            fsExtra.emptyDirSync(dir);
        } else {
            fs.mkdirSync(dir);
        }
    }
}

// clean
async function clean() {
    logCheck('start');
    logWarn(`---`);

    // extract everything to ./temp
    const zip = new AdmZip(`./maps.zip`);
    const zipEntries = zip.getEntries();
    zip.extractAllTo('./temp/unpacked', true);

    // process each .osz
    for (const zipEntry of zipEntries) {
        const oszString = zipEntry.entryName;
        logInfo(`Filename: '${oszString}'`);

        const oszZip = new AdmZip(`./temp/unpacked/${oszString}`);
        oszZip.extractAllTo(`./temp/osz/${oszString}`, true);
        const osz = oszZip.getEntries();

        // establish new osz
        const newOsz = new AdmZip();

        // note when a .osu file is cleansed so it doesn't process the rest
        let osuDone = false;

        // to determine if the  audio file is actually processed, but very poorly
        let audioFileCount = 0;

        // keep bg condition
        let background = null;
        let backgroundName = null;

        // process files
        for (const file of osz) {
            const type = await findFileType(`./temp/osz/${oszString}/${file.entryName}`);
            const skip = 'skiplineokkkkk'; // this can be anything

            // clean .osu
            if (file.name.includes('osu') && !type && !osuDone) {
                logDefault(file.entryName);
                const osu = file.getData().toString();
                const lines = osu.split('\r\n');

                let eventsTrigger = false;
                let timingPointsTrigger = false;
                let coloursTrigger = false;
                let hitObjectsTrigger = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // [General]
                    if (line.includes('AudioFilename:')) {
                        let extension;

                        if (line.includes('.mp3')) {
                            extension = '.mp3';
                        } else if (line.includes('.ogg')) {
                            extension = '.ogg';
                        } else {
                            logError(`Can't find audio extension from .osu file`);
                        }

                        lines[i] = `AudioFilename: audio${extension}`;
                    } else if (line.includes('AudioLeadIn:')) {
                        lines[i] = 'AudioLeadIn: 0';
                    } else if (line.includes('PreviewTime:')) {
                        lines[i] = 'PreviewTime: -1';
                    } else if (line.includes('Countdown:')) {
                        lines[i] = 'Countdown: 0';
                    } else if (line.includes('SampleSet:')) {
                        lines[i] = 'SampleSet: Soft';
                    } else if (line.includes('StackLeniency:')) {
                        lines[i] = 'StackLeniency: 0.7';
                    } else if (line.includes('Mode:')) {
                        lines[i] = 'Mode: 0';
                    } else if (line.includes('LetterboxInBreaks:')) {
                        lines[i] = 'LetterboxInBreaks: 0';
                    } else if (line.includes('SpecialStyle:')) {
                        lines[i] = skip;
                    } else if (line.includes('WidescreenStoryboard:')) {
                        lines[i] = 'WidescreenStoryboard: 0';
                    }

                    // [Editor]
                    if (line.includes('Bookmarks:')) {
                        lines[i] = skip;
                    } else if (line.includes('DistanceSpacing:')) {
                        lines[i] = 'DistanceSpacing: 1.0';
                    } else if (line.includes('BeatDivisor:')) {
                        lines[i] = 'BeatDivisor: 4';
                    } else if (line.includes('GridSize:')) {
                        lines[i] = 'GridSize: 32';
                    } else if (line.includes('TimelineZoom:')) {
                        lines[i] = 'TimelineZoom: 1';
                    }

                    // [Metadata]
                    if (line.includes('Creator:')) {
                        lines[i] = 'Creator:';
                    } else if (line.includes('Version:')) {
                        lines[i] = 'Version:';
                    } else if (line.includes('Source:')) {
                        lines[i] = 'Source:';
                    } else if (line.includes('Tags:')) {
                        lines[i] = 'Tags:';
                    } else if (line.includes('BeatmapID:')) {
                        lines[i] = 'BeatmapID:0';
                    } else if (line.includes('BeatmapSetID:')) {
                        lines[i] = 'BeatmapSetID:-1';
                    }

                    // [Difficulty]
                    if (line.includes('HPDrainRate:')) {
                        lines[i] = 'HPDrainRate:5';
                    } else if (line.includes('CircleSize:')) {
                        lines[i] = 'CircleSize:5';
                    } else if (line.includes('OverallDifficulty:')) {
                        lines[i] = 'OverallDifficulty:5';
                    } else if (line.includes('ApproachRate:')) {
                        lines[i] = 'ApproachRate:5';
                    } else if (line.includes('SliderMultiplier:')) {
                        lines[i] = 'SliderMultiplier:1.4';
                    } else if (line.includes('SliderTickRate:')) {
                        lines[i] = 'SliderTickRate:1';
                    }

                    // [Events]
                    if (line.includes('[TimingPoints]')) {
                        eventsTrigger = false;
                    }

                    if (eventsTrigger) {
                        // keep bg
                        if (variables.background) {
                            const split = line.split(",");

                            if (split[0] == "0") {
                                backgroundName = split[2].replace(/^"|"$/g,'');
                                const fileExt = backgroundName.split(".")[1];
                                background = line.replace('/\r|\n/g', '').replace(backgroundName, `background.${fileExt}`);
                            }
                        }
                        
                        lines[i] = skip;
                    }

                    if (line.includes('[Events]')) {
                        eventsTrigger = true;
                        lines[i] += '\r\n//Background and Video events\r\n//Break Periods\r\n//Storyboard Layer 0 (Background)\r\n//Storyboard Layer 1 (Fail)\r\n//Storyboard Layer 2 (Pass)\r\n//Storyboard Layer 3 (Foreground)\r\n//Storyboard Layer 4 (Overlay)\r\n//Storyboard Sound Samples\r\n';
                    }


                    // [TimingPoints]
                    if (line.includes('[Colours]') || line.includes('[HitObjects]')) {
                        timingPointsTrigger = false;
                    }

                    if (timingPointsTrigger) {
                        const lineSplit = line.split(',');

                        if (lineSplit.length > 1) {
                            if (!parseInt(lineSplit[6])) {
                                lines[i] = skip;
                            } else {
                                if (parseInt(lineSplit[3]) > 0) {
                                    lineSplit[3] = '0';
                                }

                                if (parseInt(lineSplit[4]) > 0) {
                                    lineSplit[4] = '0';
                                }

                                if (parseInt(lineSplit[5]) < 100) {
                                    lineSplit[5] = '100';
                                }

                                if (parseInt(lineSplit[7]) > 0) {
                                    lineSplit[7] = '0';
                                }

                                lines[i] = lineSplit.join(',');
                            }
                        }
                    }

                    if (line.includes('[TimingPoints]')) {
                        timingPointsTrigger = true;
                    }
                    
                    // [Colours]
                    if (line.includes('[HitObjects]')) {
                        coloursTrigger = false;
                    }

                    if (line.includes('[Colours]')) {
                        coloursTrigger = true;
                    }

                    if (coloursTrigger) {
                        lines[i] = skip;
                    }

                    // [HitObjects]
                    if (hitObjectsTrigger) {
                        lines[i] = skip;
                    }

                    if (line.includes('[HitObjects]')) {
                        hitObjectsTrigger = true;
                    }
                }

                // reconstruct .osu
                let text = '';

                for (const line of lines) {
                    if (line !== skip) {
                        let addition = line;

                        if (line.includes('//Background and Video events') && background) {
                            addition = addition.replace('//Background and Video events', '//Background and Video events\r\n' + background)
                        }

                        text += addition;
                        text += '\r\n';
                    }
                }

                newOsz.addFile(`${oszString.substring(0, oszString.length-4)}.osu`, Buffer.from(text, 'utf8'));
                osuDone = true;
            }

            //add .mp3 or .ogg
            if (type && (type.ext == 'mp3' || type.ext == 'ogg')) {
                const buffer = file.getData();
                const audioData = await parseBuffer(buffer);

                // ensure audio file isn't a hitsound
                if (audioData.format.duration > 30) {
                    logDefault(file.entryName);
                    // ensure 192kbps .mp3
                    if (type.ext == 'mp3' && audioData.format.bitrate !== 192000) {
                        logError(`Incorrect .mp3 bitrate: ${audioData.format.bitrate}`);
                    }

                    if (type.ext == 'ogg' && (audioData.format.bitrate > 192000 || audioData.format.bitrate < 128000)) {
                        logError(`Incorrect .ogg bitrate: ${audioData.format.bitrate}`);
                    }

                    audioFileCount++;
                    fs.renameSync(`./temp/osz/${oszString}/${file.entryName}`, `./temp/osz/${oszString}/audio.${type.ext}`);
                    newOsz.addLocalFile(`./temp/osz/${oszString}/audio.${type.ext}`);
                }
            }
        }

        if (variables.background) {
            for (const file of osz) {
                const type = await findFileType(`./temp/osz/${oszString}/${file.entryName}`);
                if (backgroundName && type && (type.ext == 'jpg' || type.ext == 'jpeg' || type.ext == 'png')) {
                    if (file.entryName == backgroundName) {
                        logDefault(file.entryName);
                        fs.renameSync(`./temp/osz/${oszString}/${file.entryName}`, `./temp/osz/${oszString}/background.${type.ext}`);
                        newOsz.addLocalFile(`./temp/osz/${oszString}/background.${type.ext}`);
                    }
                }
            }
        }

        if (audioFileCount !== 1) {
            logError('Incorrect number of audio files: ' + audioFileCount);
        }

        // generate .osz
        newOsz.writeZip(`./output/${oszString}`);

        logInfo('Generated clean `.osz`');
        logWarn('---');
    }

    logCheck('done');
}

reset();
clean();