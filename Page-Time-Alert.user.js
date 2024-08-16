// ==UserScript==
// @name         网站使用时间追踪器（优化版2.0）
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  优化的网站使用时间追踪器,使用performance.now()和requestAnimationFrame提高精度和性能
// @author       你
// @match        *://www.youtube.com/*
// @match        *://www.bilibili.com/*
// @match        *://www.douyu.com/*
// @match        *://www.zhihu.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_CONFIG = {
        showContinueButton: true,
        showClosePageButton: true,
        showDoNotShowAgainButton: false
    };

    const TIME_LIMIT = 5 * 60; // 5分钟
    const ALERT_TIMEOUT = 10000; // 10秒
    const UPDATE_INTERVAL = 30000; // 30秒

    let startTime;
    let elapsedTime = 0;
    let lastUpdateTime = 0;
    let timeoutAlertShown = false;
    let alertTimeout;
    let countdownInterval;
    let nextAlertTime = TIME_LIMIT;
    let isPageVisible = true;

    const timerDiv = document.createElement('div');
    timerDiv.style.position = 'fixed';
    timerDiv.style.top = '10px';
    timerDiv.style.left = '10px';
    timerDiv.style.padding = '5px 10px';
    timerDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    timerDiv.style.color = 'white';
    timerDiv.style.zIndex = '10000';
    timerDiv.style.fontFamily = 'Arial, sans-serif';
    timerDiv.style.fontSize = '14px';
    timerDiv.style.borderRadius = '5px';
    document.body.appendChild(timerDiv);

    function updateTimer() {
        if (!isPageVisible) return;

        const now = performance.now();
        elapsedTime += now - startTime;
        startTime = now;

        const totalTime = getTodayUsageTime() + Math.floor(elapsedTime / 1000);
        const hours = Math.floor(totalTime / 3600);
        const minutes = Math.floor((totalTime % 3600) / 60);
        const seconds = totalTime % 60;

        timerDiv.textContent = `今日在此网站的总时间：${hours}小时 ${minutes}分 ${seconds}秒`;

        if (now - lastUpdateTime > UPDATE_INTERVAL) {
            updateUsageTime();
            lastUpdateTime = now;
        }

        if (totalTime >= nextAlertTime && !timeoutAlertShown) {
            timeoutAlertShown = true;
            createCustomAlert();
        }

        requestAnimationFrame(updateTimer);
    }

    function updateUsageTime() {
        const today = new Date().toDateString();
        const usageData = JSON.parse(localStorage.getItem('usageTime_' + window.location.hostname) || '{}');
        const sessionTime = Math.floor(elapsedTime / 1000);
        usageData[today] = (usageData[today] || 0) + sessionTime;
        localStorage.setItem('usageTime_' + window.location.hostname, JSON.stringify(usageData));
        elapsedTime = 0;
    }

    function getTodayUsageTime() {
        const today = new Date().toDateString();
        const usageData = JSON.parse(localStorage.getItem('usageTime_' + window.location.hostname) || '{}');
        return usageData[today] || 0;
    }

    function createCustomAlert() {
        const alertDiv = document.createElement('div');
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '50%';
        alertDiv.style.left = '50%';
        alertDiv.style.transform = 'translate(-50%, -50%)';
        alertDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        alertDiv.style.padding = '40px';
        alertDiv.style.borderRadius = '20px';
        alertDiv.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        alertDiv.style.zIndex = '10001';
        alertDiv.style.width = '80%';
        alertDiv.style.height = '80%';
        alertDiv.style.display = 'flex';
        alertDiv.style.flexDirection = 'column';
        alertDiv.style.justifyContent = 'center';
        alertDiv.style.alignItems = 'center';
        alertDiv.style.fontSize = '24px';
        alertDiv.style.textAlign = 'center';

        const message = document.createElement('p');
        message.textContent = '你在这个网站上待了很长时间，是否继续浏览？';
        message.style.marginBottom = '30px';
        alertDiv.appendChild(message);

        const warning = document.createElement('p');
        warning.textContent = '10秒内未操作将自动关闭页面。';
        warning.style.marginBottom = '30px';
        alertDiv.appendChild(warning);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '20px';
        alertDiv.appendChild(buttonContainer);

        const createButton = (text, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.padding = '15px 30px';
            button.style.fontSize = '20px';
            button.style.cursor = 'pointer';
            button.addEventListener('click', onClick);
            return button;
        };

        if (BUTTON_CONFIG.showContinueButton) {
            const continueBtn = createButton('继续', () => {
                clearTimeout(alertTimeout);
                clearInterval(countdownInterval);
                document.body.removeChild(alertDiv);
                nextAlertTime += TIME_LIMIT;
                timeoutAlertShown = false;
            });
            buttonContainer.appendChild(continueBtn);
        }

        if (BUTTON_CONFIG.showClosePageButton) {
            const closeBtn = createButton('关闭页面', closePage);
            buttonContainer.appendChild(closeBtn);
        }

        if (BUTTON_CONFIG.showDoNotShowAgainButton) {
            const doNotShowAgainBtn = createButton('不再提示', () => {
                localStorage.setItem('timeTrackerDoNotShowAgain', 'true');
                clearTimeout(alertTimeout);
                clearInterval(countdownInterval);
                document.body.removeChild(alertDiv);
                nextAlertTime = Infinity;
            });
            buttonContainer.appendChild(doNotShowAgainBtn);
        }

        const countdownElement = document.createElement('p');
        countdownElement.id = 'countdown';
        countdownElement.textContent = '10';
        countdownElement.style.marginTop = '30px';
        countdownElement.style.fontSize = '36px';
        alertDiv.appendChild(countdownElement);

        document.body.appendChild(alertDiv);

        let countdown = 10;
        countdownInterval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                closePage();
            }
        }, 1000);

        alertTimeout = setTimeout(() => {
            if (timeoutAlertShown) {
                closePage();
            }
        }, ALERT_TIMEOUT);
    }

    function closePage() {
        updateUsageTime();
        window.close();
    }

    document.addEventListener('visibilitychange', function() {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            startTime = performance.now();
            requestAnimationFrame(updateTimer);
        } else {
            updateUsageTime();
        }
    });

    window.addEventListener('beforeunload', updateUsageTime);

    // 初始化
    startTime = performance.now();
    requestAnimationFrame(updateTimer);

})();
