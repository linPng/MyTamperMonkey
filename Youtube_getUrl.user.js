// ==UserScript==
// @name         Video Platform Collector
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Collect video information from YouTube
// @author       Your name
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    function sendToAPI(videos) {
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'http://localhost:5010/api/videos/youtube',
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(videos),
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('API响应:', data);
                } catch (error) {
                    console.error('解析API响应出错:', error);
                }
            },
            onerror: function(error) {
                console.error('发送数据错误:', error);
            }
        });
    }

    function getVideoInfo() {
        setTimeout(() => {
            const videos = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer');

            if (videos.length === 0) {
                console.log('未找到视频列表');
                return;
            }

            console.log(`找到 ${videos.length} 个视频`);
            const videoDataList = [];

            videos.forEach((video, index) => {
                const linkElement = video.querySelector('a#thumbnail');
                const titleElement = video.querySelector('#video-title, .ytd-video-renderer');
                const timeElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
                const channelElement = video.querySelector('#channel-name yt-formatted-string, .ytd-channel-name');
                const channelLinkElement = video.querySelector('#channel-name a, #text-container.ytd-channel-name a');
                const viewCountElement = video.querySelector('#metadata-line span:first-child');
                const publishTimeElement = video.querySelector('#metadata-line span:last-child');

                const href = linkElement ? linkElement.getAttribute('href') : '';
                const videoId = href ? href.split('v=')[1] : '';

                const videoData = {
                    title: titleElement ? titleElement.textContent.trim() : '无标题',
                    video_id: videoId,
                    url: href ? `https://www.youtube.com${href}` : '无链接',
                    duration: timeElement ? timeElement.textContent.trim() : '',
                    channel: channelElement ? channelElement.textContent.trim() : '',
                    channel_url: channelLinkElement ? 'https://www.youtube.com' + channelLinkElement.getAttribute('href') : '',
                    viewCount: viewCountElement ? viewCountElement.textContent.trim() : '',
                    publishTime: publishTimeElement ? publishTimeElement.textContent.trim() : ''
                };

                videoDataList.push(videoData);

                // 在控制台打印信息
                console.log(`视频 ${index + 1}:`);
                console.log('标题:', videoData.title);
                console.log('视频ID:', videoData.video_id);
                console.log('URL:', videoData.url);
                console.log('时长:', videoData.duration);
                console.log('频道:', videoData.channel);
                console.log('频道URL:', videoData.channel_url);
                console.log('观看次数:', videoData.viewCount);
                console.log('发布时间:', videoData.publishTime);
                console.log('------------------------');
            });

            // 发送数据到API
            sendToAPI(videoDataList);
        }, 3000);
    }

    // 页面加载完成时执行
    window.addEventListener('load', getVideoInfo);

    // 监听URL变化
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            getVideoInfo();
        }
    }).observe(document, {subtree: true, childList: true});

})();
