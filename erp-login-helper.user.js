// ==UserScript==
// @name         erp快速登录和验证码填写
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动填充登录信息并点击登录或仅填写验证码，并添加一个测试按钮重新加载页面
// @author       你的名字
// @include      /^https:\/\/erp\..*\/.*login.*/
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 配置账户和密码
    const account = '你的账户';
    const password = '你的密码';
    const ocrapiurl = 'http://39.98.125.240:5678/recognizeCaptchaErp';
    //const ocrapiurl = 'http://127.0.0.1:5678/recognizeCaptchaErp';

    // 调试信息
    console.log("脚本已加载");

    // 创建按钮
    const createButton = (text, id, onClick, styles = {}) => {
        console.log("创建按钮: " + text);
        return $('<button></button>')
            .text(text)
            .attr('id', id)
            .css(Object.assign({
                'z-index': 9999,
                'padding': '10px',
                'background-color': '#4CAF50',
                'color': 'white',
                'border': 'none',
                'cursor': 'pointer',
                'position': 'absolute'
            }, styles))
            .click(onClick);
    };

    // 模拟输入函数
    const simulateInput = (element, value) => {
        const inputEvent = new Event('input', { bubbles: true });
        element.value = value;
        element.dispatchEvent(inputEvent);
    };

    // 快速登录按钮点击事件
    const quickLoginButton = createButton('快速登录', 'quickLoginButton', function() {
        console.log("快速登录按钮被点击");
        // 填写账户和密码
        simulateInput($('input[placeholder="账号"]')[0], account);
        simulateInput($('input[placeholder="密码"]')[0], password);

        // 获取验证码图片的Base64编码
        const captchaImage = $('img.i-code')[0];
        const base64Image = captchaImage.src;
        console.log(base64Image);
        // 调用验证码识别接口
        GM_xmlhttpRequest({
            method: 'POST',
            url: ocrapiurl,
            data: JSON.stringify({ base64Image: base64Image }),
            headers: {
                'Content-Type': 'application/json'
            },
            onload: function(response) {
                try {
                    console.log("responseText: " + response.responseText);
                    const jsonResponse = JSON.parse(response.responseText);
                    const result = jsonResponse.result;
                    console.log("验证码识别结果: " + result);
                    // 填写验证码
                    simulateInput(document.querySelector('input[id=form_item_captcha]'), result);

                    // 点击登录按钮
                    const loginButton = document.querySelector('div.btn-login');
                    if (loginButton) {
                        if (typeof loginButton.click === 'function') {
                            loginButton.click();
                        } else {
                            // 如果 click() 方法不可用，尝试触发自定义事件
                            const event = document.createEvent('Event');
                            event.initEvent('click', true, true);
                            loginButton.dispatchEvent(event);
                        }
                        console.log('登录按钮已点击');
                    } else {
                        console.error('登录按钮未找到');
                    }
                } catch (e) {
                    console.error("验证码识别接口响应解析错误: ", e);
                }
            }
        });

    });

    // 填写验证码按钮点击事件
    const fillCaptchaButton = createButton('填写验证码', 'fillCaptchaButton', function() {
        console.log("填写验证码按钮被点击");
        // 获取验证码图片的Base64编码
        const captchaImage = $('img.i-code')[0];
        const base64Image = captchaImage.src;
        console.log(base64Image);
        // 调用验证码识别接口
        GM_xmlhttpRequest({
            method: 'POST',
            url: ocrapiurl,
            data: JSON.stringify({ base64Image: base64Image }),
            headers: {
                'Content-Type': 'application/json'
            },
            onload: function(response) {
                try {
                    console.log("responseText: " + response.responseText);
                    const jsonResponse = JSON.parse(response.responseText);
                    const result = jsonResponse.result;
                    console.log("验证码识别结果: " + result);
                    // 填写验证码
                    simulateInput(document.querySelector('input[id=form_item_captcha]'), result);
                } catch (e) {
                    console.error("验证码识别接口响应解析错误: ", e);
                }
            }
        });
    });

    // 添加测试按钮到页面
    const testButton = createButton('重新加载', 'testButton', function() {
        console.log("重新加载按钮被点击");
    });

    // 将按钮插入到页面
    $(window).on('load', function() {
        console.log("页面已加载");
        setTimeout(function() {
            const loginContainer = $('form.ant-form');
            if (loginContainer.length) {
                const loginButton = $('div.btn-login');
                if (loginButton.length) {
                    loginButton.after(quickLoginButton);
                    console.log("快速登录按钮已插入页面");
                } else {
                    console.log("快速登录目标元素未找到");
                }
                if ($('div.fr-ac').eq(1)) {
                    $('div.fr-ac').eq(1).after(fillCaptchaButton);
                    console.log("填写验证码按钮已插入页面");
                } else {
                    console.log("填写验证码目标元素未找到");
                }
                console.log("按钮已插入页面");
            } else {
                console.log("目标元素未找到");
            }
        }, 500);
    });
})();
