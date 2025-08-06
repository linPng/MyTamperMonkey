// ==UserScript==
// @name         Poe 自动替换反引号 (修复版)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  在 Poe 网站上自动将 ··· 替换为 ```
// @author       You
// @match        https://poe.com/*
// @match        https://*.poe.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let isProcessing = false;
    let lastValue = '';

    function replaceInElement(element) {
        if (isProcessing) return;

        let currentValue;
        let selectionStart, selectionEnd;

        // 获取当前值
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            currentValue = element.value || '';
            selectionStart = element.selectionStart;
            selectionEnd = element.selectionEnd;
        } else if (element.contentEditable === 'true') {
            currentValue = element.textContent || element.innerText || '';
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                selectionStart = range.startOffset;
                selectionEnd = range.endOffset;
            }
        } else {
            return;
        }

        // 只有当值真的包含 ··· 时才处理
        if (currentValue.includes('···')) {
            isProcessing = true;

            // 精确替换，避免产生额外字符
            const newValue = currentValue.split('···').join('```');

            try {
                if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                    element.value = newValue;

                    // 重新设置光标位置
                    if (typeof selectionStart === 'number') {
                        const diff = newValue.length - currentValue.length;
                        element.setSelectionRange(
                            selectionStart + (selectionStart > 0 ? diff : 0),
                            selectionEnd + (selectionEnd > 0 ? diff : 0)
                        );
                    }
                } else if (element.contentEditable === 'true') {
                    element.textContent = newValue;

                    // 重新设置光标
                    if (typeof selectionStart === 'number') {
                        const selection = window.getSelection();
                        const range = document.createRange();
                        const textNode = element.firstChild;
                        if (textNode) {
                            const diff = newValue.length - currentValue.length;
                            const newStart = Math.min(selectionStart + diff, textNode.textContent.length);
                            const newEnd = Math.min(selectionEnd + diff, textNode.textContent.length);
                            range.setStart(textNode, Math.max(0, newStart));
                            range.setEnd(textNode, Math.max(0, newEnd));
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }
                }

                // 触发事件让网站知道内容变化了
                const inputEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(inputEvent);

            } catch (e) {
                console.log('替换时出错:', e);
            }

            // 延迟重置标志
            setTimeout(() => {
                isProcessing = false;
            }, 100);
        }
    }

    // 使用事件委托监听
    function handleInputEvent(event) {
        if (isProcessing) return;

        const element = event.target;

        // 短暂延迟处理，确保输入完成
        setTimeout(() => {
            replaceInElement(element);
        }, 10);
    }

    // 监听输入事件
    document.addEventListener('input', handleInputEvent, true);

    // 也监听键盘事件作为备选
    document.addEventListener('keyup', (event) => {
        if (event.key === '·' || event.key === '…') {
            setTimeout(() => {
                replaceInElement(event.target);
            }, 20);
        }
    }, true);

    console.log('Poe 反引号替换脚本已启动');
})();
