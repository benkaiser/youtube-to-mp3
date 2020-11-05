# Youtube to MP3
## Powered by [react-native-ytdl](https://github.com/AbelTesfaye/react-native-ytdl), [ffmpeg.js](https://github.com/Kagami/ffmpeg.js/) and [Sia SkyNet](https://siasky.net/)

Most other youtube to mp3 services rely on an external server to do the conversion. This processing is costly and results in ad-filled experiences with lots of waiting and generally risky procedures.

This extension combats that by doing the downloading and conversion from youtube formats to mp3 locally in the browser.
Once converted, these files are backed up with [Sia SkyNet](https://siasky.net/) so future downloads are faster for everyone.

## Installation

1. [Download a the extension folder of this repo](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/benkaiser/youtube-to-mp3/tree/master/extension)
2. Unzip
3. Go to chrome://extensions in Chrome
4. Toggle the "Developer Mode" in the top right corner
5. Click "Load unpacked"
6. Select the "extension" folder in the unzipped repo
7. Visit any youtube page and click "Download MP3" next to the subscribe button

## Building

Run these commands from the root of the repo:

```
npm install
npm start
```

Then refresh the unpacked extension in chrome://extensions from the above installation steps.

## License

MIT
