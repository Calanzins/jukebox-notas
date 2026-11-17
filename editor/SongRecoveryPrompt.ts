// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { SongDocument } from "./SongDocument";
import { RecoveredSong, RecoveredVersion, SongRecovery, versionToKey } from "./SongRecovery";
import { Prompt } from "./Prompt";
import { EditorConfig } from "./EditorConfig";
import { HTML } from "imperative-html/dist/esm/elements-strict";

const { button, div, h2, p, select, option, iframe, input } = HTML;

// ViberBox: lista de todas as músicas guardadas neste navegador (substitui o "Recover Recent Song").
// Cada música tem um campo para trocar o nome, a lista de versões e um botão para ouvir.
// O player só é criado quando a pessoa clica em "Preview", para a janela não travar com muitas músicas.
export class SongRecoveryPrompt implements Prompt {
	private readonly _songContainer: HTMLDivElement = div();
	private readonly _searchInput: HTMLInputElement = input({ type: "text", placeholder: "Search by name...", style: "width: 100%; box-sizing: border-box; margin: 4px 0;" });
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });

	public readonly container: HTMLDivElement = div({ class: "prompt", style: "width: 300px;" },
		h2("Saved Songs"),
		div({ style: "max-height: 385px; overflow-y: auto;" },
			p("Every song you make in this browser is kept here, and you can rename them. The most recent songs also keep older versions. This is not a backup: clearing your browser data erases this list, so export the songs you care about! SONGS THAT USE SAMPLES WILL TAKE A WHILE TO LOAD, so be patient!"),
			this._searchInput,
			this._songContainer,
			p("(If \"Display Song Data in URL\" is enabled in your preferences, then you may also be able to find song versions in your browser history. However, saved songs won't work if you were browsing in private/incognito mode.)"),
		),
		this._cancelButton,
	);

	private readonly _entries: { container: HTMLDivElement, song: RecoveredSong }[] = [];

	constructor(private _doc: SongDocument) {
		this._cancelButton.addEventListener("click", this._close);
		this._searchInput.addEventListener("input", this._filter);
		this._searchInput.addEventListener("keydown", (event: KeyboardEvent) => event.stopPropagation());

		const songs: RecoveredSong[] = SongRecovery.getAllRecoveredSongs();

		if (songs.length == 0) {
			this._songContainer.appendChild(p("There are no saved songs yet. Try making a song!"));
		}

		for (const song of songs) {
			this._addSongEntry(song);
		}
	}

	private _addSongEntry(song: RecoveredSong): void {
		const nameInput: HTMLInputElement = input({ type: "text", maxlength: "30", value: song.versions[0].name, style: "flex: 1; min-width: 0; font-weight: bold;" });
		const renameButton: HTMLButtonElement = button({ style: "width: auto; padding: 0 8px; margin-left: 4px;" }, "Rename");
		const versionMenu: HTMLSelectElement = select({ style: "width: 100%;" });
		const previewButton: HTMLButtonElement = button({ style: "width: 100%; margin: 2px 0;" }, "Preview");
		const playerHolder: HTMLDivElement = div();
		let player: HTMLIFrameElement | null = null;

		const fillVersionMenu = (): void => {
			while (versionMenu.firstChild) versionMenu.removeChild(versionMenu.firstChild);
			for (const version of song.versions) {
				versionMenu.appendChild(option({ value: version.time }, new Date(version.time).toLocaleString()));
			}
		};
		fillVersionMenu();

		const selectedSongData = (): string | null => {
			const version: RecoveredVersion = song.versions[Math.max(0, versionMenu.selectedIndex)];
			return window.localStorage.getItem(versionToKey(version));
		};
		const showPlayer = (): void => {
			const url: string = "player/" + (OFFLINE ? "index.html" : "") + "#song=" + selectedSongData();
			if (player == null) {
				player = iframe({ style: "width: 100%; height: 60px; border: none; display: block;" });
				player.src = url;
				playerHolder.appendChild(player);
				previewButton.style.display = "none";
			} else {
				player.contentWindow!.location.replace(url);
				player.contentWindow!.dispatchEvent(new Event("hashchange"));
			}
		};

		const rename = (): void => {
			const newName: string = nameInput.value.trim().substring(0, 30);
			if (newName == "" || newName == song.versions[0].name) {
				nameInput.value = song.versions[0].name;
				return;
			}
			SongRecovery.renameSong(song, newName);
			nameInput.value = song.versions[0].name;
			fillVersionMenu();
			// Se a música renomeada é a que está aberta, o editor também passa a usar o nome novo.
			if (song.versions[0].uid == this._doc.recoveryUid) {
				this._doc.song.title = song.versions[0].name;
				document.title = song.versions[0].name + " - " + EditorConfig.versionDisplayName;
				this._doc.notifier.changed();
			}
			if (player != null) showPlayer();
		};

		renameButton.addEventListener("click", rename);
		nameInput.addEventListener("keydown", (event: KeyboardEvent) => {
			event.stopPropagation(); // As teclas digitadas no nome não viram atalhos do editor.
			if (event.key == "Enter") rename();
		});
		previewButton.addEventListener("click", showPlayer);
		versionMenu.addEventListener("change", () => { if (player != null) showPlayer(); });

		const container: HTMLDivElement = div({ style: "margin: 6px 0; padding-bottom: 6px; border-bottom: 1px solid var(--ui-widget-background, #444);" },
			div({ style: "display: flex; flex-direction: row; align-items: center; margin: 2px 0;" }, nameInput, renameButton),
			div({ class: "selectContainer", style: "width: 100%; margin: 2px 0;" }, versionMenu),
			previewButton,
			playerHolder,
		);
		this._songContainer.appendChild(container);
		this._entries.push({ container: container, song: song });
	}

	// Mostra só as músicas cujo nome contém o texto da busca.
	private _filter = (): void => {
		const query: string = this._searchInput.value.trim().toLowerCase();
		for (const entry of this._entries) {
			const matches: boolean = query == "" || entry.song.versions[0].name.toLowerCase().indexOf(query) != -1;
			entry.container.style.display = matches ? "" : "none";
		}
	}

	private _close = (): void => {
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._cancelButton.removeEventListener("click", this._close);
		this._searchInput.removeEventListener("input", this._filter);
	}
}
