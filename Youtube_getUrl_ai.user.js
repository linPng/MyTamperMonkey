// ==UserScript==
// @name         Video Platform Collector
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Collect video information from YouTube and mark low-value videos
// @author       Your name
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        ytd-thumbnail.ytd-rich-grid-media {
            position: relative;
        }

        ytd-rich-grid-media:has(> #thumbnail > ytd-thumbnail > a.time-wasting-video)
        ytd-playlist-thumbnail {
            display: none !important;
        }

        .time-wasting-video {
            filter: grayscale(100%) !important;
            transition: filter 0.3s;
        }

        .time-wasting-video:hover {
            filter: grayscale(50%) !important;
        }

        .video-warning {
            position: absolute !important;
            top: 5px !important;
            right: 5px !important;
            background: rgba(0, 0, 0, 0.8) !important;
            color: white !important;
            padding: 4px 8px !important;
            border-radius: 4px !important;
            font-size: 12px !important;
            z-index: 99999 !important;
            pointer-events: none !important;
        }
    `);

    const videoElementMap = new Map();

    function applyAnalysisResults(results) {
        results.forEach(result => {
            if (result.video_id && result.ai_analysis) {
                const videoElement = videoElementMap.get(result.video_id);
                if (videoElement && !result.ai_analysis.isWorthy) {
                    // 只处理主缩略图
                    const thumbnailContainer = videoElement.querySelector('#thumbnail > ytd-thumbnail');
                    if (thumbnailContainer) {
                        const mainThumbnail = thumbnailContainer.querySelector('a#thumbnail');
                        if (mainThumbnail) {
                            mainThumbnail.classList.add('time-wasting-video');

                            // 检查是否已经有警告标签
                            const existingWarning = mainThumbnail.querySelector('.video-warning');
                            if (!existingWarning) {
                                const warningElement = document.createElement('div');
                                warningElement.className = 'video-warning';
                                warningElement.textContent = '低价值内容';
                                warningElement.title = result.ai_analysis.reason;
                                mainThumbnail.appendChild(warningElement);
                            }
                        }
                    }
                }
            }
        });
    }

    function sendToAPI(videos) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'http://localhost:5010/api/videos/youtube',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(videos),
                timeout: 30000,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log('API响应:', data);
                        if (data.success) {
                            applyAnalysisResults(data.results);
                        }
                        resolve(data);
                    } catch (error) {
                        console.error('解析API响应出错:', error);
                        reject(error);
                    }
                },
                onerror: function(error) {
                    console.error('发送数据错误:', error);
                    reject(error);
                },
                ontimeout: function() {
                    console.error('请求超时');
                    reject(new Error('请求超时'));
                }
            });
        });
    }

    function processNewVideos() {
        const processedVideos = new Set([...videoElementMap.keys()]);
        const videos = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer');
        const videoDataList = [];

        videos.forEach((video, index) => {
            const linkElement = video.querySelector('a#thumbnail');
            if (!linkElement) return;

            const href = linkElement.getAttribute('href');
            const videoId = href ? href.split('v=')[1]?.split('&')[0] : '';
            if (!videoId || processedVideos.has(videoId)) return;

            const titleElement = video.querySelector('#video-title, .ytd-video-renderer');
            const timeElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
            const channelElement = video.querySelector('#channel-name yt-formatted-string, .ytd-channel-name');
            const channelLinkElement = video.querySelector('#channel-name a, #text-container.ytd-channel-name a');
            const viewCountElement = video.querySelector('#metadata-line span:first-child');
            const publishTimeElement = video.querySelector('#metadata-line span:last-child');

            if (!titleElement) return;

            videoElementMap.set(videoId, video);

            const videoData = {
                title: titleElement.textContent.trim(),
                video_id: videoId,
                url: href ? `https://www.youtube.com${href}` : '',
                duration: timeElement ? timeElement.textContent.trim() : '',
                channel: channelElement ? channelElement.textContent.trim() : '',
                channel_url: channelLinkElement ? 'https://www.youtube.com' + channelLinkElement.getAttribute('href') : '',
                viewCount: viewCountElement ? viewCountElement.textContent.trim() : '',
                publishTime: publishTimeElement ? publishTimeElement.textContent.trim() : ''
            };

            videoDataList.push(videoData);
            console.log(`收集新视频 ${index + 1}:`, videoData.title);
        });

        if (videoDataList.length > 0) {
            console.log(`发送 ${videoDataList.length} 个新视频数据到API`);
            sendToAPI(videoDataList).catch(error => {
                console.error('处理视频数据时出错:', error);
            });
        }
    }

    // 使用防抖函数避免频繁处理
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedProcessNewVideos = debounce(processNewVideos, 1000);

    // 页面加载完成时执行
    window.addEventListener('load', processNewVideos);

    // 监听URL变化和DOM变化
    let lastUrl = location.href;
    const observer = new MutationObserver((mutations) => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            videoElementMap.clear();
            processNewVideos();
        } else {
            debouncedProcessNewVideos();
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });
})();
