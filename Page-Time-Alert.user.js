// ==UserScript==
// @name         网站使用时间追踪器（优化版）
// @namespace    http://tampermonkey.net/
// @version      1.10
// @description  在左上角显示在当前网站上花费的时间，并在超过指定时间后弹出提示框。用户可以选择继续、关闭页面或不再提示。优化了标签页切换时的计时逻辑。
// @author       你
// @match        *://www.youtube.com/*
// @match        *://www.bilibili.com/*
// @match        *://www.douyu.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';


        // 检查当前时间是否在20:00至04:00之间
    function isInRestrictedTimeRange() {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 20 || hour < 4;
    }

    // 如果在限制时间范围内，直接关闭页面
    if (isInRestrictedTimeRange()) {
        window.close();
        return;
    }

    localStorage.setItem('timeTrackerDoNotShowAgain', 'false');

    // 根据当前网站设置不同的 TIME_LIMIT
    let TIME_LIMIT;
    if (window.location.hostname === 'www.douyu.com') {
        TIME_LIMIT = 0; // 斗鱼网站不设时间限制
    } else {
        TIME_LIMIT = 5 * 60; // 其他网站设置为5分钟
    }
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

    const continueBtn = createButton('继续', () => {
        clearTimeout(alertTimeout);
        clearInterval(countdownInterval);
        document.body.removeChild(alertDiv);
        resetTimer();
    });
    buttonContainer.appendChild(continueBtn);

    const closeBtn = createButton('关闭页面', closePage);
    buttonContainer.appendChild(closeBtn);

    const doNotShowAgainBtn = createButton('不再提示', () => {
        localStorage.setItem('timeTrackerDoNotShowAgain', 'true');
        doNotShowAgain = true;
        clearTimeout(alertTimeout);
        clearInterval(countdownInterval);
        document.body.removeChild(alertDiv);
        resetTimer();
    });
    buttonContainer.appendChild(doNotShowAgainBtn);

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
