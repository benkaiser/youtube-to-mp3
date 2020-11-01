declare const chrome: any;

class YoutubeDownloaderContent {
  private button?: HTMLElement;
  private disabled: boolean = false;

  constructor() {
    this.drawButtons();
    this.addListener();
  }

  reinitialize() {
    if (this.button) {
      this.disabled = false;
      this.button.remove();
      this.drawButtons();
    }
  }

  drawButtons() {
    const subscribeButton = document.querySelector('paper-button.ytd-subscribe-button-renderer');
    if (!subscribeButton) {
      setTimeout(this.drawButtons.bind(this), 500);
    } else {
      subscribeButton!.parentNode!.insertBefore(this.downloadButton(), subscribeButton!);
    }
  }

  downloadButton() {
    this.button = document.createElement('paper-button');
    this.button.className = 'ytd-subscribe-button-renderer';
    this.button.innerHTML = `Download MP3`;
    this.button.addEventListener('click', this.buttonClick.bind(this));
    return this.button;
  }

  buttonClick() {
    if (!this.disabled) {
      chrome.runtime.sendMessage({ download: window.location.href });
      this.disabled = true;
      if (this.button) {
        this.button.setAttribute('disabled', 'true');
      }
    }
  }

  addListener() {
    chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.url === window.location.href) {
          this.updateStatus(request.status);
        }
      });
  }

  updateStatus(status: string) {
    if (this.button) {
      this.button.textContent = status;
    }
  }
}

let youtubeDownloader: YoutubeDownloaderContent;

window.addEventListener('load', function () {
  youtubeDownloader = new YoutubeDownloaderContent();
});

// maybe listen for youtube text change or something? nav change not working
let url: string = window.location.href;
setInterval(() => {
  if (url !== window.location.href) {
    youtubeDownloader.reinitialize();
    url = window.location.href;
  }
}, 1000);