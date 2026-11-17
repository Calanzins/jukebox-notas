// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Dictionary } from "../synth/SynthConfig";
import { Song } from "../synth/synth";


export interface RecoveredVersion {
    uid: string;
    time: number;
    name: string;
    work: number;
}

export interface RecoveredSong {
    versions: RecoveredVersion[];
}

const versionPrefix = "songVersion: ";
// ViberBox: todas as músicas ficam guardadas. Só as mais recentes mantêm o histórico
// de versões; as outras ficam só com a última versão, para economizar espaço.
const songsWithFullHistory = 8;
const maximumWorkPerVersion = 3 * 60 * 1000; // 3 minutes
const minimumWorkPerSpan = 1 * 60 * 1000; // 1 minute

function keyIsVersion(key: string): boolean {
    return key.indexOf(versionPrefix) == 0;
}

function keyToVersion(key: string): RecoveredVersion {
    return JSON.parse(key.substring(versionPrefix.length));
}

export function versionToKey(version: RecoveredVersion): string {
    return versionPrefix + JSON.stringify(version);
}

export function generateUid(): string {
    // Not especially robust, but simple and effective!
    return ((Math.random() * (-1 >>> 0)) >>> 0).toString(32);
}

function compareSongs(a: RecoveredSong, b: RecoveredSong): number {
    return b.versions[0].time - a.versions[0].time;
}

export function errorAlert(error: any): void {
    console.warn(error);
    window.alert("Whoops, the song data appears to have been corrupted! Please try to recover the last working version of the song from the \"Saved Songs...\" option in ViberBox's \"File\" menu.");
}


function compareVersions(a: RecoveredVersion, b: RecoveredVersion): number {
    return b.time - a.time;
}

export class SongRecovery {
    private _saveVersionTimeoutHandle: ReturnType<typeof setTimeout>;

    private _song: Song = new Song();

    public static getAllRecoveredSongs(): RecoveredSong[] {
        const songs: RecoveredSong[] = [];
        const songsByUid: Dictionary<RecoveredSong> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const itemKey: string = localStorage.key(i)!;
            if (keyIsVersion(itemKey)) {
                const version: RecoveredVersion = keyToVersion(itemKey);
                let song: RecoveredSong | undefined = songsByUid[version.uid];
                if (song == undefined) {
                    song = { versions: [] };
                    songsByUid[version.uid] = song;
                    songs.push(song);
                }
                song.versions.push(version);
            }
        }
        for (const song of songs) {
            song.versions.sort(compareVersions);
        }
        songs.sort(compareSongs);
        return songs;
    }

    // Grava no localStorage. Se o espaço do navegador acabar, apaga versões antigas
    // (nunca a última versão de uma música), começando pelas músicas menos recentes,
    // e tenta de novo. Se não houver mais o que apagar, avisa e não grava.
    private static _setItemFreeingSpace(key: string, data: string, songs: RecoveredSong[]): boolean {
        while (true) {
            try {
                localStorage.setItem(key, data);
                return true;
            } catch (error) {
                let freed: boolean = false;
                for (let i: number = songs.length - 1; i >= 0 && !freed; i--) {
                    const versions: RecoveredVersion[] = songs[i].versions;
                    // Pula a versão mais recente e a que está sendo gravada agora.
                    for (let j: number = versions.length - 1; j >= 1; j--) {
                        const oldKey: string = versionToKey(versions[j]);
                        if (oldKey == key) continue;
                        localStorage.removeItem(oldKey);
                        versions.splice(j, 1);
                        freed = true;
                        break;
                    }
                }
                if (!freed) {
                    console.warn(error);
                    window.alert("The browser storage for saved songs is full. Please export the songs you want to keep (File > Export) before making more.");
                    return false;
                }
            }
        }
    }

    // Troca o nome de uma música guardada: muda o nome na lista e o título dentro
    // dos dados de cada versão, para a música abrir com o nome novo.
    public static renameSong(song: RecoveredSong, newName: string): void {
        newName = newName.substring(0, 30);
        const decoder: Song = new Song();
        const savedDocumentTitle: string = document.title;
        const songs: RecoveredSong[] = SongRecovery.getAllRecoveredSongs();
        for (let i: number = 0; i < song.versions.length; i++) {
            const oldVersion: RecoveredVersion = song.versions[i];
            const oldKey: string = versionToKey(oldVersion);
            const oldData: string | null = localStorage.getItem(oldKey);
            if (oldData == null) continue;
            let newData: string = oldData;
            try {
                decoder.fromBase64String(oldData);
                decoder.title = newName;
                newData = decoder.toBase64String();
            } catch (error) {
                console.warn(error); // Se não der para reescrever os dados, renomeia só na lista.
            }
            const newVersion: RecoveredVersion = { uid: oldVersion.uid, time: oldVersion.time, name: newName, work: oldVersion.work };
            const newKey: string = versionToKey(newVersion);
            if (newKey == oldKey && newData == oldData) continue;
            localStorage.removeItem(oldKey);
            if (!SongRecovery._setItemFreeingSpace(newKey, newData, songs)) {
                localStorage.setItem(oldKey, oldData); // Devolve a versão antiga.
                break;
            }
            song.versions[i] = newVersion;
        }
        // Ler os dados muda o título da aba; volta ao que era.
        document.title = savedDocumentTitle;
    }

    public saveVersion(uid: string, name: string, songData: string): void {
        const newName: string = name;
        const newTime: number = Math.round(Date.now());

        clearTimeout(this._saveVersionTimeoutHandle);
        this._saveVersionTimeoutHandle = setTimeout((): void => {
            try {
                // Ensure that the song is not corrupted.
                this._song.fromBase64String(songData);
            } catch (error) {
                errorAlert(error);
                return;
            }

            const songs: RecoveredSong[] = SongRecovery.getAllRecoveredSongs();
            let currentSong: RecoveredSong | null = null;
            for (const song of songs) {
                if (song.versions[0].uid == uid) {
                    currentSong = song;
                }
            }
            if (currentSong == null) {
                currentSong = { versions: [] };
                songs.unshift(currentSong);
            }
            let versions: RecoveredVersion[] = currentSong.versions;

            let newWork: number = 1000; // default to 1 second of work for the first change.
            if (versions.length > 0) {
                const mostRecentTime: number = versions[0].time;
                const mostRecentWork: number = versions[0].work;
                newWork = mostRecentWork + Math.min(maximumWorkPerVersion, newTime - mostRecentTime);
            }

            const newVersion: RecoveredVersion = { uid: uid, name: newName, time: newTime, work: newWork };
            const newKey: string = versionToKey(newVersion);
            versions.unshift(newVersion);
            // A música editada agora passa a ser a mais recente da lista.
            songs.splice(songs.indexOf(currentSong), 1);
            songs.unshift(currentSong);
            if (!SongRecovery._setItemFreeingSpace(newKey, songData, songs)) {
                versions.shift();
                return;
            }

            // Consider deleting an old version to free up space.
            let minSpan: number = minimumWorkPerSpan; // start out with a gap between versions.
            const spanMult: number = Math.pow(2, 1 / 2); // Double the span every 2 versions back.
            for (var i: number = 1; i < versions.length; i++) {
                const currentWork: number = versions[i].work;
                const olderWork: number = (i == versions.length - 1) ? 0.0 : versions[i + 1].work;
                // If not enough work happened between two versions, discard one of them.
                if (currentWork - olderWork < minSpan) {
                    let indexToDiscard: number = i;
                    if (i < versions.length - 1) {
                        const currentTime: number = versions[i].time;
                        const newerTime: number = versions[i - 1].time;
                        const olderTime: number = versions[i + 1].time;
                        // Weird heuristic: Between the three adjacent versions, prefer to keep
                        // the newest and the oldest, discarding the middle one (i), unless
                        // there is a large gap of time between the newest and middle one, in
                        // which case the middle one represents the end of a span of work and is
                        // thus more memorable.
                        if ((currentTime - olderTime) < 0.5 * (newerTime - currentTime)) {
                            indexToDiscard = i + 1;
                        }
                    }
                    localStorage.removeItem(versionToKey(versions[indexToDiscard]));
                    break;
                }
                minSpan *= spanMult;
            }

            // Músicas fora das mais recentes ficam só com a última versão.
            for (let i: number = songsWithFullHistory; i < songs.length; i++) {
                const oldVersions: RecoveredVersion[] = songs[i].versions;
                for (let j: number = 1; j < oldVersions.length; j++) {
                    localStorage.removeItem(versionToKey(oldVersions[j]));
                }
                oldVersions.length = 1;
            }
        }, 750); // Wait 3/4 of a second before saving a version.
    }
}