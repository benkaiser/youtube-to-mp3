/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

class YoutubeDownloaderContent {
    constructor() {
        this.disabled = false;
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
        const subscribeButton = document.querySelector('#meta paper-button.ytd-subscribe-button-renderer');
        if (!subscribeButton) {
            setTimeout(this.drawButtons.bind(this), 500);
        }
        else {
            subscribeButton.parentNode.insertBefore(this.downloadButton(), subscribeButton);
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
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.url === window.location.href) {
                this.updateStatus(request.status);
            }
        });
    }
    updateStatus(status) {
        if (this.button) {
            this.button.textContent = status;
            if (status == 'Download') {
                this.button.removeAttribute('disabled');
                this.disabled = false;
            }
        }
    }
}
let youtubeDownloader;
window.addEventListener('load', function () {
    youtubeDownloader = new YoutubeDownloaderContent();
});
// maybe listen for youtube text change or something? nav change not working
let url = window.location.href;
setInterval(() => {
    if (url !== window.location.href) {
        youtubeDownloader.reinitialize();
        url = window.location.href;
    }
}, 1000);

/******/ })()
;