// @ts-ignore
import ytdl from "react-native-ytdl";
import { SkynetClient, keyPairFromSeed } from "skynet-js";

const client = new SkynetClient("https://siasky.net");
const { publicKey, privateKey } = keyPairFromSeed("super secret open source keypair for ytdl-extension");

type ExtensionCallback = (format: any) => void;

interface IVideoInfo {
    title: string;
    artist: string;
    fileName: string;
}

class YoutubeDownloaderBackground {
    private url: string;
    private videoId: string;
    private callback: ExtensionCallback;

    constructor(url: string, callback: ExtensionCallback) {
        this.url = url;
        this.videoId = this.youtubeId(url);
        this.callback = callback;
        this.updateStatus('Checking for existing conversion');
        this.getExistingSkyLink()
        .then(skylink => {
            this.updateStatus('Generating file name');
            console.log('Skylink!', skylink);
            this.getFileNameOnly().then((fileName) => {
                this.updateStatus('Downloading');
                this.triggerChromeDownload('https://siasky.net/' + skylink.replace('sia:', ''), fileName);
                this.updateStatus('Download MP3');
            });
        })
        .catch(() => {
            this.updateStatus('Downloading from Youtube');
            this.download();
        });
    }

    updateStatus(status: string) {
        var message = { url: this.url, status };
        chrome.tabs.query({}, (tabs: any) =>
            tabs.forEach((tab: any) => chrome.tabs.sendMessage(tab.id, message))
        );
    }

    youtubeId(url: string) {
        var video_id = url.split('v=')[1];
        var ampersandPosition = video_id.indexOf('&');
        if (ampersandPosition != -1) {
            video_id = video_id.substring(0, ampersandPosition);
        }
        return video_id;
    }

    getExistingSkyLink(): Promise<string> {
        try {
            return client.registry.getEntry(publicKey, this.videoId)
            .then((result: any) => {
                return result.entry.data;
            });
        } catch (error) {
            console.log(error);
            return Promise.reject('Not found');
        }
    }

    extractVideoInfo(info: any): IVideoInfo {
        // regex strips non-ascii characters, should keep filename clean
        const videoFullTitle = info.videoDetails.title.replace(/[^\x00-\x7F]/g, "") || '';
        const videoFullTitleParts = videoFullTitle.split('-');
        let artist = videoFullTitleParts[0] ? videoFullTitleParts[0].trim() : '';
        let title = videoFullTitleParts[1] ? videoFullTitleParts[1].trim() : '';
        if (info.videoDetails.media) {
            if (info.videoDetails.media.song) {
                title = info.videoDetails.media.song;
            }
            if (info.videoDetails.media.artist) {
                artist = info.videoDetails.media.artist;
            }
        }
        const fileName = videoFullTitle + '.mp3';
        return {
            fileName,
            title,
            artist
        };
    }

    getFileNameOnly(): Promise<string> {
        return ytdl.getInfo(this.url).then((info: any) => {
            return this.extractVideoInfo(info).fileName;
        });
    }

    fetchWithProgress(progressCallback: (status: number) => void, response: Response): Response {
        const contentEncoding = response.headers.get('content-encoding');
        const contentLength = response.headers.get(contentEncoding ? 'x-file-size' : 'content-length');
        if (contentLength === null) {
            throw Error('Response size header unavailable');
        }

        const total = parseInt(contentLength, 10);
        let loaded = 0;

        return new Response(
            new ReadableStream({
                start(controller) {
                    const reader = response.body!.getReader();

                    read();
                    function read() {
                        reader.read().then(({done, value}) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            if (value) {
                                loaded += value.byteLength;
                            }
                            progressCallback(loaded / total);
                            if (value) {
                                controller.enqueue(value);
                            }
                            read();
                        }).catch(error => {
                            console.error(error);
                            controller.error(error)
                        })
                    }
                }
            })
        );
    }

    download() {
        ytdl.getInfo(this.url).then((info: any) => {
            let format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
            console.log('Format found!', format);
            fetch(format.url)
            .then(this.fetchWithProgress.bind(this, (progress) => {
                this.updateStatus(`Downloading from Youtube (${Math.round(progress * 100)}%)`);
            }))
            .then(response => {
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                const { fileName, title, artist } = this.extractVideoInfo(info);
                this.transcode(arrayBuffer, fileName, title, artist);
            });
        });
    }

    transcode(videoFile: ArrayBuffer, fileName: string, title: string, artist: string) {
        let dotCounter = 0;
        this.updateStatus('Converting to MP3');
        const worker = new Worker("ffmpeg-worker-mp4.js");
        worker.onmessage = (e) => {
            const msg = e.data;
            switch (msg.type) {
                case "ready":
                    // worker.postMessage({type: "run", arguments: ["-version"]});
                    const videoFileName = 'videoFile.webm';
                    worker.postMessage(
                        {
                            type: "run",
                            // arguments: ["-version"]
                            arguments: [
                                '-i', videoFileName,
                                '-metadata', `title=${ title }`,
                                '-metadata', `artist=${ artist }`,
                                'output.mp3'
                            ],
                            MEMFS: [
                                {
                                    data: videoFile,
                                    name: videoFileName
                                }
                            ]
                        });
                    break;
                case "stdout":
                    console.log(msg.data);
                    this.updateStatus('Converting to MP3' + '.'.repeat((++dotCounter % 3) + 1));
                    break;
                case "stderr":
                    console.log(msg.data);
                    this.updateStatus('Converting to MP3' + '.'.repeat((++dotCounter % 3) + 1));
                    break;
                case "done":
                    console.log(msg.data);
                    const convertedFile = msg.data.MEMFS[0].data;
                    const blob = new Blob([convertedFile], { type: "audio/mpeg" });
                    const url = URL.createObjectURL(blob);
                    this.updateStatus('Downloading');
                    this.triggerChromeDownload(url, fileName);
                    this.updateStatus('Saving to Sia SkyNet');
                    this.uploadToSkyNet(blob, fileName);
                    break;
            }
        };
    }

    async uploadToSkyNet(blob: Blob, filename: string) {
        var file = new File([blob], filename, { type: "audio/mpeg" });
        try {
            const skylink = await client.uploadFile(file, {
                onUploadProgress: (progress: number) => {
                    this.updateStatus(`Saving to Sia SkyNet (${ Math.round(progress * 100) }%)`);
                }
            });
            console.log("skylink created", skylink);
            const datakey = this.videoId;
            const data = skylink;
            const revision  = 0;
            const entry = { datakey, data, revision };
            await client.registry.setEntry(privateKey, this.videoId, entry);
          } catch (error) {
            console.log(error);
          }
          this.updateStatus('Download MP3');
    }

    triggerChromeDownload(url: Blob | string, fileName: string): void {
        chrome.downloads.download({
            url: url,
            filename: fileName.replace(/[|"*?:<>]/g, "_")
        });
    }
}

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: ExtensionCallback) => {
    if (request.download && typeof request.download === 'string') {
        new YoutubeDownloaderBackground(request.download, sendResponse);
    }
});