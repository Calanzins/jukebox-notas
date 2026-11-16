# JukeBox com notas sobrepostas

Versão modificada do [JukeBox](https://jukeebox.github.io), feita pela Calanzins.
A única mudança é permitir notas sobrepostas no mesmo instrumento: enquanto uma nota está segurada, outra pode começar no meio dela.

Site: https://calanzins.github.io/jukebox-notas/

## Como usar

- Ligue o botão **Sobrepor**, abaixo dos botões de zoom, e clique dentro de uma nota segurada em outra altura. Funciona também no celular.
- No PC, **Alt + clique** faz o mesmo sem ligar o botão.
- Com o modo desligado, o editor funciona como no JukeBox original: clicar em outra altura dentro de uma nota adiciona a altura ao acorde.

## Compatibilidade

- Músicas sem notas sobrepostas são salvas no formato do JukeBox original (versão 5) e abrem nele normalmente.
- Músicas com notas sobrepostas são salvas como versão 6 e só abrem nesta versão.
- Ao importar um MIDI, cada nota vira uma nota própria, sobreposta às outras, em vez de um acorde que recomeça a cada nota nova.
- Cada instrumento toca até 64 vozes antes de cortar rápido as caudas das notas soltas (no original eram 18).

## Limitações

- As notas sobrepostas não usam as transições entre notas vizinhas, como o slide, nem o strum.
- Com o modo desligado, editar, colar ou arrastar notas pode cortar as que estão por cima, como o JukeBox sempre fez.

## Créditos

JukeBox, desenvolvido por CoolTasDude, é um mod do Slarmoo's Box, que é um mod do UltraBox, que trouxe recursos do Pandora's Box para o GoldBox; ambos são mods do JummBox, que é um mod do [BeepBox](https://beepbox.co), criado por John Nesky.
Todo o crédito pelo editor e pelo sintetizador é dos autores originais. A licença MIT original está em [LICENSE.md](LICENSE.md).

O texto abaixo é o README original do projeto.

---

# Slarmoo's Box Testing

Slarmoo's Box is an online tool for sketching and sharing instrumental music.
You can find it [here](https://github.com/slarmoo/slarmoosbox/).
It is a modification of [Ultrabox](https://ultraabox.github.io), which is a modification of [JummBox](https://github.com/jummbus/jummbox), which inturn is a modification of the [original BeepBox](https://beepbox.co).

Slarmoo's Box is a mod of Ultrabox that aims to advance Beepbox's capabilities. Feel free to contribute!


All song data is packaged into the URL at the top of your browser. When you make
changes to the song, the URL is updated to reflect your changes. When you are
satisfied with your song, just copy and paste the URL to save and share your
song!

Slarmoo's Box, as well as the beepmods which it's based on, are free projects. If you ever feel so inclined, please support the original creator, [John Nesky](http://www.johnnesky.com/), via
[PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=QZJTX9GRYEV9N&currency_code=USD)!

## Compiling

The compilation procedure is identical to the repository for BeepBox. I will include the excerpt on compiling from that page's readme below for convenience:

The source code is available under the MIT license. The code is written in
[TypeScript](https://www.typescriptlang.org/), which requires
[node & npm](https://www.npmjs.com/get-npm), so install those first. Then to
build this project, open a command line ([Git Bash](https://gitforwindows.org/)) and run:

```
git clone https://github.com/slarmoo/slarmoosbox.git
cd slarmoosbox
npm install
npm run build
```

JummBox (and by extension, Slarmoo's Box) makes a divergence from BeepBox that necessitates an additional dependency:
rather than using the (rather poor) default HTML select implementation, the custom
library [select2](https://select2.org) is employed. select2 has an explicit dependency
on [jQuery](https://jquery.com) as well, so you may need to install the following
additional dependencies if they are not picked up automatically.

```
npm install select2
npm install @types/select2
npm install @types/jquery
```

## Code

The code is divided into several folders. This architecture is identical to BeepBox's.

The [synth/](synth) folder has just the code you need to be able to play Slarmoo's Box
songs out loud, and you could use this code in your own projects, like a web
game. After compiling the synth code, open website/synth_example.html to see a
demo using it. To rebuild just the synth code, run:

```
npm run build-synth
```

The [editor/](editor) folder has additional code to display the online song
editor interface. After compiling the editor code, open website/index.html to
see the editor interface. To rebuild just the editor code, run:

```
npm run build-editor
```

The [player/](player) folder has a miniature song player interface for embedding
on other sites. To rebuild just the player code, run:

```
npm run build-player
```

The [website/](website) folder contains index.html files to view the interfaces.
The build process outputs JavaScript files into this folder.

## Dependencies

Most of the dependencies are listed in [package.json](package.json), although
 Slarmoo's Box also has an indirect, optional dependency on
[lamejs](https://www.npmjs.com/package/lamejs) via
[jsdelivr](https://www.jsdelivr.com/) for exporting .mp3 files. If the user
attempts to export an .mp3 file, Slarmoo's Box will direct the browser to download
that dependency on demand. 
Additionally, random envelopes rely on [js-xxhash](https://npmjs.com/package/js-xxhash) for fast hashing. 


## Offline version

If you'd like to BUILD the offline version, enter the following into the command line of your choice:
```
npm run build-offline
```


After building, you can then enter the following to run it for testing purposes:
```
npm run start
```

And to package, run (do ```npm run package-host``` for your host platform; you may need to run git bash as an administrator for non-host platforms):
```
npm run package
```
