// ==UserScript==
// @name         YouTube Video Filter
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Mark low-value YouTube videos with detailed analysis
// @author       Your name
// @match        https://www.youtube.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

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
            max-width: 200px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            cursor: help !important;
            pointer-events: auto !important;
        }

        .full-analysis {
            display: none;
            position: absolute !important;
            top: 35px !important;
            right: 5px !important;
            background: rgba(0, 0, 0, 0.9) !important;
            color: white !important;
            padding: 8px !important;
            border-radius: 4px !important;
            font-size: 12px !important;
            z-index: 99999 !important;
            width: max-content !important;
            max-width: 300px !important;
            white-space: pre-line !important;
        }

        .video-warning:hover + .full-analysis {
            display: block !important;
        }
    `);

    const NEGATIVE_KEYWORDS = {
    '标题党': [
        "震惊", "惊呆", "吓人", "恐怖", "可怕", "细思极恐", "太吓人", "吓死",
        "最可怕", "让人绝望", "千万别", "不得了", "秒懂", "竟然", "居然",
        "万万没想到", "绝对想不到", "超乎想象", "难以置信", "不敢相信",
        "堪称", "只需", "一招", "超神", "逆天", "太强了", "绝了"
    ],
    '低质量内容': [
        "懒人", "速食", "教你", "一键", "简单", "速成", "一学就会",
        "吃法", "做法", "秘诀", "诀窍", "技巧", "攻略", "套路",
        "搞笑", "沙雕", "魔性", "尬", "抽风", "魔幻", "逗比", "搞怪",
        "甜狗", "狗粮", "笑趴", "笑死", "社死", "整活", "玩梗", "梗图"
    ],
    '标题堆砌': [
        "top", "排名", "record", "终身免单", "世界之最", "top10", "top5",
        "最强", "最新", "最全", "之最", "最好", "最牛", "世界第一",
        "排行榜", "盘点", "合集", "混剪", "cut", "混剪", "转载",
        "搬运", "补档", "总结", "汇总", "整理", "收藏"
    ],
    '营销话术': [
        "不看后悔", "点进来", "必看", "分享", "你不知道", "秘密", "赚钱",
        "涨粉", "经典语录", "揭秘", "大揭秘", "真相", "内幕", "独家",
        "不容错过", "建议收藏", "私密", "隐藏", "福利", "白送", "免费",
        "测试", "评测", "对比", "pk", "挑战", "奇葩", "疯狂"
    ],
    '争议煽动': [
        "敢说", "真敢", "要封", "被封", "起底", "狠狠", "暴露", "对线",
        "开撕", "互撕", "爆料", "瓜", "八卦", "惊天", "大秘密", "曝光",
        "造假", "打脸", "翻车", "崩溃", "狗血", "细思极恐", "细思恐极",
        "恐怖", "吓人", "惨", "惨不忍睹", "惨烈", "惨剧", "悲剧"
    ],
    '无价值内容': [
        "日常", "vlog", "生活记录", "随手", "随便", "乱拍", "碎片",
        "花絮", "片段", "个人", "旅游", "旅行", "游记", "美食",
        "吃播", "吃饭", "吃喝", "开箱", "购物", "种草", "拆箱"
    ],
    '标题堆tag': [
        "史上", "最佳", "最新", "最火", "最热", "最全", "最强",
        "完整版", "高清", "1080p", "4k", "60fps", "全程", "全集",
        "完结", "精选", "精彩", "珍藏", "收藏", "超清", "蓝光"
    ]
};

// 增加标题中的特殊模式检测
const NEGATIVE_PATTERNS = [
    /[!！]{2,}/, // 多个感叹号
    /[?？]{2,}/, // 多个问号
    /\.{3,}/, // 省略号
    /#.*#/, // 话题标签
    /【.*】/, // 方括号标题
    /［.*］/, // 其他括号
    /\[.*\]/, // 英文方括号
    /\(.*\)/, // 英文圆括号
    /（.*）/, // 中文圆括号
    /\|{2,}/, // 多个竖线
    /\/{2,}/, // 多个斜线
    /-{2,}/, // 多个横线
    /[0-9一二三四五六七八九十]+个?(?:技巧|方法|套路|秘诀|诀窍|原因|理由|方式|步骤)/, // 数字+方法类
    /[0-9一二三四五六七八九十]+分钟/, // 时长标题
    /第[0-9一二三四五六七八九十]+[集期]/ // 第X集/期
];

function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .normalize('NFKC') // 标准化Unicode字符
        .replace(/[!！?？,，.。:：;；\s]/g, '') // 移除标点和空格
        .replace(/[a-z]/g, c => c.toUpperCase()); // 英文转大写
}

function analyzeVideo(videoData) {
    const analysis = {
        isWorthy: true,
        details: [],
        foundKeywords: {
            negative: [],
            positive: []
        }
    };

    const normalizedTitle = normalizeText(videoData.title);
    const originalTitle = videoData.title; // 保留原始标题用于模式匹配

    // 检查负面关键词
    let negativeScore = 0;
    for (const [category, keywords] of Object.entries(NEGATIVE_KEYWORDS)) {
        const found = keywords.filter(kw =>
            normalizedTitle.includes(normalizeText(kw)));
        if (found.length > 0) {
            analysis.foundKeywords.negative.push(
                `${category}: ${found.join(', ')}`
            );
            negativeScore += found.length * 1.5;
        }
    }

    // 检查标题模式
    let foundPatterns = [];
    for (const pattern of NEGATIVE_PATTERNS) {
        if (pattern.test(originalTitle)) {
            foundPatterns.push('标题格式问题');
            negativeScore += 1;
            break; // 只计算一次格式问题
        }
    }

    // 重复词检查
    const words = originalTitle.split(/[\s,，.。!！?？]/);
    const wordCount = {};
    words.forEach(word => {
        if (word.length > 1) { // 忽略单字符
            wordCount[word] = (wordCount[word] || 0) + 1;
            if (wordCount[word] > 1) {
                negativeScore += 0.5;
                foundPatterns.push('词语重复');
            }
        }
    });

    // 检查标题长度
    const effectiveLength = normalizedTitle.length;
    if (effectiveLength > 40) {
        analysis.details.push(`标题过长(${effectiveLength}字符)`);
        negativeScore += Math.floor((effectiveLength - 40) / 10); // 每超过10个字符增加1分
    }

    // 时长检查（更严格）
    if (videoData.duration) {
        const minutes = parseDuration(videoData.duration);
        if (minutes < 2) {
            analysis.details.push(`视频过短(${minutes}分钟)`);
            negativeScore += 2;
        } else if (minutes > 30) {
            analysis.details.push(`视频过长(${minutes}分钟)`);
            negativeScore += Math.floor((minutes - 30) / 15); // 每超过15分钟增加1分
        }
    }

    // 观看量与发布时间关系检查
    const viewCount = parseViewCount(videoData.viewCount);
    if (videoData.publishTime) {
        if (videoData.publishTime.includes('年前') && viewCount < 10000) {
            analysis.details.push('老视频观看量过低');
            negativeScore += 2;
        }
    }

    if (foundPatterns.length > 0) {
        analysis.details.push(...foundPatterns);
    }

    // 更严格的判定标准
    if (negativeScore >= 1.5) { // 降低判定门槛
    analysis.isWorthy = false;
} else {
    analysis.isWorthy = true;
} // 只要负面分数达到2就判定为不值得看

    // 生成报告
    let report = [];
    if (analysis.foundKeywords.negative.length > 0) {
        report.push("负面特征:\n" + analysis.foundKeywords.negative.join('\n'));
    }
    if (analysis.details.length > 0) {
        report.push("其他问题:\n" + analysis.details.join('\n'));
    }
    if (negativeScore > 0) {
        report.push(`负面得分: ${negativeScore.toFixed(1)}`);
    }

    analysis.reason = report.join('\n\n');
    return analysis;
}

function getShortReason(analysis) {
    let reasons = [];

    // 添加关键词类别
    if (analysis.foundKeywords.negative.length > 0) {
        reasons.push(...analysis.foundKeywords.negative.map(kw =>
            kw.split(':')[0]));
    }

    // 添加其他问题
    if (analysis.details.length > 0) {
        reasons.push(...analysis.details.filter(d =>
            !d.includes('得分') && !d.includes('重复')));
    }

    if (reasons.length === 0) {
        return "低价值内容";
    }

    // 最多显示两个主要原因
    return reasons.slice(0, 2).join('、');
}
    function processVideo(videoElement) {
        const thumbnailContainer = videoElement.querySelector('#thumbnail > ytd-thumbnail');
        if (!thumbnailContainer) return;

        const mainThumbnail = thumbnailContainer.querySelector('a#thumbnail');
        if (!mainThumbnail) return;

        const titleElement = videoElement.querySelector('#video-title, .ytd-video-renderer');
        const timeElement = videoElement.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
        const viewCountElement = videoElement.querySelector('#metadata-line span:first-child');
        const publishTimeElement = videoElement.querySelector('#metadata-line span:last-child');

        if (!titleElement) return;

        const videoData = {
            title: titleElement.textContent.trim(),
            duration: timeElement ? timeElement.textContent.trim() : '',
            viewCount: viewCountElement ? viewCountElement.textContent.trim() : '',
            publishTime: publishTimeElement ? publishTimeElement.textContent.trim() : ''
        };

        const analysis = analyzeVideo(videoData);

        if (!analysis.isWorthy) {
            mainThumbnail.classList.add('time-wasting-video');

            if (!mainThumbnail.querySelector('.video-warning')) {
                // 添加简短警告
                const warningElement = document.createElement('div');
                warningElement.className = 'video-warning';
                warningElement.textContent = getShortReason(analysis);
                mainThumbnail.appendChild(warningElement);

                // 添加完整分析
                const fullAnalysis = document.createElement('div');
                fullAnalysis.className = 'full-analysis';
                fullAnalysis.textContent = analysis.reason;
                mainThumbnail.appendChild(fullAnalysis);
            }
        }
    }

    function parseDuration(duration) {
        const parts = duration.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]);
        } else if (parts.length === 3) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return 0;
    }

    function parseViewCount(viewCount) {
        if (!viewCount) return 0;
        const num = viewCount.replace(/[^0-9.]/g, '');
        const multiplier = viewCount.includes('万') ? 10000 :
                         viewCount.includes('k') ? 1000 :
                         viewCount.includes('m') ? 1000000 : 1;
        return parseFloat(num) * multiplier;
    }


    function processNewVideos() {
        const videos = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer');
        videos.forEach(processVideo);
    }

    // 使用防抖函数避免频繁处理
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedProcessNewVideos = debounce(processNewVideos, 1000);

    // 页面加载完成时执行
    window.addEventListener('load', processNewVideos);

    // 监听URL和DOM变化
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
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
