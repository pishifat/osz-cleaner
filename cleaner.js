const fs = require('fs');
const fsExtra = require('fs-extra');
const AdmZip = require('adm-zip');
const FileType = require('file-type');
const logger = require('./helper/logger.js');

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
    logger.consoleCheck('start');
    logger.consoleWarn(`---`);

    // extract everything to ./temp
    const zip = new AdmZip(`./maps.zip`);
    const zipEntries = zip.getEntries();
    zip.extractAllTo('./temp/unpacked', true);

    // process each .osz
    for (const zipEntry of zipEntries) {
        const oszString = zipEntry.entryName;
        logger.consoleInfo(`Filename: '${oszString}'`);

        const oszZip = new AdmZip(`./temp/unpacked/${oszString}`);
        oszZip.extractAllTo(`./temp/osz/${oszString}`, true);
        const osz = oszZip.getEntries();

        // establish new osz
        const newOsz = new AdmZip();

        let osuDone = false;

        // process files
        for (const file of osz) {
            const type = await findFileType(`./temp/osz/${oszString}/${file.entryName}`);
            const skip = 'skiplineokkkkk';
            logger.consoleLog(file.entryName);

            // clean .osu
            if (file.name.includes('osu') && !type) {
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
                        lines[i] = 'AudioFilename: audio.mp3';
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
                        text += line;
                        text += '\r\n';
                    }
                }

                newOsz.addFile(`${oszString.substring(0, oszString.length-4)}.osu`, Buffer.from(text, 'utf8'));
                osuDone = true;
            }

            //add .mp3
            if (type && type.ext == 'mp3') {
                fs.renameSync(`./temp/osz/${oszString}/${file.entryName}`, `./temp/osz/${oszString}/audio.mp3`);
                newOsz.addLocalFile(`./temp/osz/${oszString}/audio.mp3`);
            }
        }

        // generate .osz
        newOsz.writeZip(`./output/${oszString}`);

        logger.consoleInfo('Generated clean `.osz`');
        logger.consoleWarn('---');
    }

    logger.consoleCheck('done');
}

reset();
clean();