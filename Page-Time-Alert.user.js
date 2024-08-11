// ==UserScript==
// @name         网站使用时间追踪器（优化版）
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  在左上角显示在当前网站上花费的时间，并在超过指定时间后弹出提示框。用户可以选择继续、关闭页面或不再提示。优化了标签页切换时的计时逻辑。
// @author       你
// @match        *://www.youtube.com/*
// @match        *://www.bilibili.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    localStorage.setItem('timeTrackerDoNotShowAgain', 'false');
    const TIME_LIMIT = 10*60; // 设置超时时间（秒）
    const ALERT_TIMEOUT = 10000; // 提示框显示时间（毫秒）

    let secondsSpent = 0;
    let timeoutAlertShown = false;
    let alertTimeout;
    let countdownInterval;
    let nextAlertTime = TIME_LIMIT;
    let timerInterval;
    let isPageVisible = true;

    // 检查是否已选择不再提示
    let doNotShowAgain = localStorage.getItem('timeTrackerDoNotShowAgain') === 'true';

    // 创建计时器元素
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

    function closePage() {
        window.close();
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 1000);
    }

    function resetTimer() {
        secondsSpent = 0;
        nextAlertTime = TIME_LIMIT;
        timeoutAlertShown = false;
    }

    function createCustomAlert() {
        const alertDiv = document.createElement('div');
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '50%';
        alertDiv.style.left = '50%';
        alertDiv.style.transform = 'translate(-50%, -50%)';
        alertDiv.style.backgroundColor = 'white';
        alertDiv.style.padding = '20px';
        alertDiv.style.borderRadius = '10px';
        alertDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        alertDiv.style.zIndex = '10001';

        const message = document.createElement('p');
        message.textContent = '你在这个网站上待了很长时间，是否继续浏览？';
        alertDiv.appendChild(message);

        const warning = document.createElement('p');
        warning.textContent = '10秒内未操作将自动关闭页面。';
        alertDiv.appendChild(warning);

        const continueBtn = document.createElement('button');
        continueBtn.textContent = '继续';
        continueBtn.style.marginRight = '10px';
        continueBtn.addEventListener('click', () => {
            clearTimeout(alertTimeout);
            clearInterval(countdownInterval);
            document.body.removeChild(alertDiv);
            resetTimer();
        });
        alertDiv.appendChild(continueBtn);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭页面';
        closeBtn.style.marginRight = '10px';
        closeBtn.addEventListener('click', closePage);
        alertDiv.appendChild(closeBtn);

        const doNotShowAgainBtn = document.createElement('button');
        doNotShowAgainBtn.textContent = '不再提示';
        doNotShowAgainBtn.addEventListener('click', () => {
            localStorage.setItem('timeTrackerDoNotShowAgain', 'true');
            doNotShowAgain = true;
            clearTimeout(alertTimeout);
            clearInterval(countdownInterval);
            document.body.removeChild(alertDiv);
            resetTimer();
        });
        alertDiv.appendChild(doNotShowAgainBtn);

        const countdownElement = document.createElement('p');
        countdownElement.id = 'countdown';
        countdownElement.textContent = '10';
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

    function updateTimer() {
        if (isPageVisible) {
            secondsSpent++;
            const hours = Math.floor(secondsSpent / 3600);
            const minutes = Math.floor((secondsSpent % 3600) / 60);
            const seconds = secondsSpent % 60;
            timerDiv.textContent = `在此网站的时间：${hours}小时 ${minutes}分 ${seconds}秒`;

            if (secondsSpent >= nextAlertTime && !timeoutAlertShown && !doNotShowAgain) {
                timeoutAlertShown = true;
                createCustomAlert();
            }
        }
    }

    // 处理页面可见性变化
    document.addEventListener('visibilitychange', function() {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            if (!timerInterval) {
                timerInterval = setInterval(updateTimer, 1000);
            }
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    });

    // 初始化计时器
    timerInterval = setInterval(updateTimer, 1000);
})();
