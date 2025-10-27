/**
 * 无障碍辅助功能插件
 * 用户可以自定义工具栏样式和布局
 * 
 * 配置示例：
 * new AccessibilityPlugin({
 *   targets: {
 *     zoomTarget: '.main-content',        // 缩放操作的目标元素选择器，默认为 'body'
 *     contrastTarget: '.app-container',   // 高对比度模式的目标元素选择器，默认为 'body'
 *     textOnlyTarget: '.content-area',    // 纯文本模式的目标元素选择器，默认为 'body'
 *     largeCursorTarget: 'body'          // 大鼠标模式的目标元素选择器，默认为 'body'
 *   }
 * });
 */

class AccessibilityPlugin {
	constructor(options = {}) {
		// 默认配置
		this.config = {
			// 元素选择器配置
			selectors: {
				// 工具栏相关
				toolbar: '#accessibility-toolbar',
				toolbarToggle: '#accessibility-trigger',
				toolbarContent: '.toolbar-content',

				// 去首页
				goHome: '#go-home',

				// 缩放控制
				zoomIn: '#zoom-in',
				zoomOut: '#zoom-out',
				zoomLevel: '#zoom-level',

				// 视觉辅助
				highContrast: '#high-contrast',
				textOnly: '#text-only',
				readingGuide: '#reading-guide',

				// 大字幕
				largeTooltip: '#large-tooltip',
				largeTooltipDisplay: '#large-tooltip-display',

				// 大鼠标
				largeCursor: '#large-cursor',

				// 语音控制
				speechSingle: '#speech-single',
				speechContinuous: '#speech-continuous',
				speechVolume: '#speech-volume',
				speechRate: '#speech-rate',

				// 导航
				navBack: '#nav-back',
				navForward: '#nav-forward',

				// 辅助线
				readingGuideLineHorizontal: '.reading-guide-line.horizontal',
				readingGuideLineVertical: '.reading-guide-line.vertical',

				// 关闭
				closeToolbar: '#close-toolbar',
				// 说明
				description: '#speech-description',
				resetAll: '#reset'
			},

			// CSS类名配置
			classes: {
				highContrast: 'high-contrast',
				textOnly: 'text-only',
				largeCursor: 'large-cursor',
				collapsed: 'collapsed',
				active: 'active'
			},

			// 默认值配置
			defaults: {
				zoom: 1,
				speechVolume: 0.7,
				speechRate: 1,
				speechMode: 'none' // 'continuous','single', 'none'
			},

			// 回调函数
			callbacks: {
				onStateChange: null, // 状态改变时回调
				onZoomChange: null,  // 缩放改变时回调
				onSpeechToggle: null, // 语音开关时回调
				onFeatureToggle: null // 功能开关时回调
			},

			// 键盘快捷键配置
			hotkeys: {
				// 导航
				goHome: 'Alt+KeyH',
				// 工具栏开关
				toggleToolbar: 'Alt+KeyA',
				// 缩放控制
				zoomIn: 'Alt+Equal',     // Alt + = (放大)
				zoomOut: 'Alt+Minus',    // Alt + - (缩小)
				// 语音控制
				toggleSpeechSingle: 'Alt+KeyS',    // Alt + S 切换语音
				// 切换语音模式（连读/指读）
				toggleSpeechContinuous: 'Alt+KeyM', // Alt + M 切换语音模式 (M = Mode)
				// 视觉辅助
				toggleHighContrast: 'Alt+KeyC', // Alt + C 切换高对比度
				toggleTextOnly: 'Alt+KeyT',     // Alt + T 切换纯文本模式
				// 辅助线与大字幕/大鼠标
				toggleReadingGuide: 'Alt+KeyR',  // Alt + R 切换阅读辅助线
				toggleLargeTooltip: 'Alt+KeyL',  // Alt + L 切换大字幕
				toggleLargeCursor: 'Alt+KeyU',   // Alt + U 切换大鼠标 (U = cUrSor)
				resetAll: 'Alt+Digit0', // Alt + 0 (重置)
				// 导航历史
				navBack: 'Alt+BracketLeft',   // Alt + [ 后退
				navForward: 'Alt+BracketRight',// Alt + ] 前进
				// 停止语音
				stopSpeech: 'Escape'
			},

			// 语音配置
			speech: {
				lang: 'zh-CN',
				pitch: 1,
				voiceIndex: -1 // -1 表示使用默认语音
			},

			// 目标元素配置
			targets: {
				zoomTarget: 'body',        // 缩放操作的目标元素选择器
				contrastTarget: 'body',    // 高对比度模式的目标元素选择器
				textOnlyTarget: 'body',    // 纯文本模式的目标元素选择器
				largeCursorTarget: 'body'  // 大鼠标模式的目标元素选择器
			},
			helpPath: 'help.html',
		};

		// 合并用户配置
		this.config = this.deepMerge(this.config, options);

		// 状态管理
		this.state = {
			isInitialized: false,
			currentZoom: this.config.defaults.zoom,
			speechMode: this.config.defaults.speechMode,
			speechVolume: this.config.defaults.speechVolume,
			speechRate: this.config.defaults.speechRate,
			highContrastEnabled: false,
			textOnlyEnabled: false,
			largeTooltipEnabled: false,
			readingGuideEnabled: false,
			largeCursorEnabled: false,
			isReading: false,
			toolbarCollapsed: true, // 默认工具栏是收起的（隐藏的）
			lastHoveredElement: null, // 上次悬浮的元素
			hoverDebounceTimer: null // 悬浮防抖计时器
		};

		// 语音合成相关
		this.speechSynthesis = window.speechSynthesis;
		this.currentUtterance = null;
		this.voices = [];

		// 元素引用缓存
		this.elements = {};

		// 事件监听器存储（用于清理）
		this.eventListeners = [];

		// 自动初始化
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => this.init());
		} else {
			this.init();
		}
	}

	/**
	 * 深度合并对象
	 */
	deepMerge(target, source) {
		const result = { ...target };
		for (const key in source) {
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				result[key] = this.deepMerge(target[key] || {}, source[key]);
			} else {
				result[key] = source[key];
			}
		}
		return result;
	}

	/**
	 * 初始化插件
	 */
	init() {
		if (this.state.isInitialized) return;

		try {
			this.markTouchDevice();
			this.bindElements();
			this.bindEvents();
			this.setupKeyboardNavigation();
			this.initializeSpeech();
			this.restoreState();

			this.state.isInitialized = true;
			this.triggerCallback('onStateChange', { type: 'initialized', state: this.state });

			console.log('无障碍辅助插件初始化完成');
		} catch (error) {
			console.error('无障碍插件初始化失败:', error);
		}
	}

	/**
	 * 标记触摸设备，供样式与逻辑分支使用
	 */
	markTouchDevice() {
		try {
			const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
			if (isTouch) {
				document.body.classList.add('touch-device');
			}
		} catch (e) {
			// noop
		}
	}

	/**
	 * 绑定DOM元素
	 */
	bindElements() {
		this.elements = {};
		// 绑定选择器中的控制元素
		for (const [key, selector] of Object.entries(this.config.selectors)) {
			this.elements[key] = document.querySelector(selector);
		}

		// 绑定目标元素
		this.targetElements = {};
		for (const [key, selector] of Object.entries(this.config.targets)) {
			this.targetElements[key] = document.querySelector(selector);
		}
	}

	/**
	 * 绑定事件监听器
	 */
	bindEvents() {
		// 工具栏切换
		this.addEventListenerSafe(this.elements.toolbarToggle, 'click', () => this.toggleToolbar());

		// 工具栏关闭按钮
		const closeBtn = this.elements.toolbar?.querySelector('.toolbar-close');
		this.addEventListenerSafe(closeBtn, 'click', () => this.toggleToolbar());

		// 关闭工具栏功能
		this.addEventListenerSafe(this.elements.closeToolbar, 'click', () => this.handleCloseToolbar());

		this.addEventListenerSafe(this.elements.goHome, 'click', () => this.goHome());

		// 缩放控制
		this.addEventListenerSafe(this.elements.zoomIn, 'click', () => this.zoomIn());
		this.addEventListenerSafe(this.elements.zoomOut, 'click', () => this.zoomOut());

		// 视觉辅助
		this.addEventListenerSafe(this.elements.highContrast, 'click', () => this.toggleHighContrast());
		this.addEventListenerSafe(this.elements.textOnly, 'click', () => this.toggleTextOnly());
		this.addEventListenerSafe(this.elements.readingGuide, 'click', () => this.toggleReadingGuide());

		// 大字幕和大鼠标
		this.addEventListenerSafe(this.elements.largeTooltip, 'click', () => this.toggleLargeTooltip());
		this.addEventListenerSafe(this.elements.largeCursor, 'click', () => this.toggleLargeCursor());

		// 语音控制
		this.addEventListenerSafe(this.elements.speechSingle, 'click', () => this.toggleSpeechSingle());
		this.addEventListenerSafe(this.elements.speechContinuous, 'click', () => this.toggleSpeechContinuous());

		// 音量和语速控制
		this.setupVolumeControl();
		this.setupRateControl();

		// 说明按钮功能
		const descriptionBtn = document.getElementById('speech-description');
		this.addEventListenerSafe(descriptionBtn, 'click', () => this.showDescription());

		// 重置功能
		this.addEventListenerSafe(this.elements.resetAll, 'click', () => this.handleResetAll());

		// 导航
		this.addEventListenerSafe(this.elements.navBack, 'click', () => this.navigateBack());
		this.addEventListenerSafe(this.elements.navForward, 'click', () => this.navigateForward());

		// 点击其他地方关闭滑块
		this.addEventListenerSafe(document, 'click', (e) => this.handleDocumentClick(e));

		// 添加工具栏项目点击效果
		this.setupToolbarItemClickEffects();

		// 全局事件
		this.addEventListenerSafe(document, 'mousemove', (e) => this.handleMouseMove(e));
		this.addEventListenerSafe(document, 'mouseover', (e) => this.handleMouseOver(e));
		this.addEventListenerSafe(document, 'mouseout', () => this.handleMouseOut());
		this.addEventListenerSafe(document, 'scroll', () => this.handleScroll());
		this.addEventListenerSafe(document, 'click', (e) => this.handleClick(e));

		this.addEventListenerSafe(document, 'touchmove', (e) => {
			if (!this.state.readingGuideEnabled) return;
			const t = e.touches && e.touches[0];
			if (!t) return;
			if (this.elements.readingGuideLineHorizontal) {
				this.elements.readingGuideLineHorizontal.style.top = `${t.clientY}px`;
			}
			if (this.elements.readingGuideLineVertical) {
				this.elements.readingGuideLineVertical.style.left = `${t.clientX}px`;
			}
		}, { passive: true });

		// ESC键关闭工具栏
		this.addEventListenerSafe(document, 'keydown', (e) => {
			if (e.key === 'Escape' && !this.state.toolbarCollapsed) {
				this.toggleToolbar();
			}
		});
	}

	/**
	 * 设置音量和语速控制
	 */
	setupVolumeControl() {
		const volumeControl = document.querySelector('#speech-volume');
		const volumeSlider = document.querySelector('#volume-slider');
		const volumeDisplay = document.querySelector('.volume-control');

		this.addEventListenerSafe(volumeControl, 'click', (e) => {
			e.stopPropagation();
			volumeDisplay?.classList.toggle('show');
			// 关闭语速控制
			document.querySelector('.rate-control')?.classList.remove('show');
		});

		// 触摸也可触发弹出
		this.addEventListenerSafe(volumeControl, 'touchstart', (e) => {
			e.stopPropagation();
			volumeDisplay?.classList.toggle('show');
			document.querySelector('.rate-control')?.classList.remove('show');
		}, { passive: true });

		this.addEventListenerSafe(volumeSlider, 'input', (e) => {
			this.setSpeechVolume(e.target.value);
		});
	}

	setupRateControl() {
		const rateControl = document.querySelector('#speech-rate');
		const rateSlider = document.querySelector('#rate-slider');
		const rateDisplay = document.querySelector('.rate-control');

		this.addEventListenerSafe(rateControl, 'click', (e) => {
			e.stopPropagation();
			rateDisplay?.classList.toggle('show');
			// 关闭音量控制
			document.querySelector('.volume-control')?.classList.remove('show');
		});

		this.addEventListenerSafe(rateControl, 'touchstart', (e) => {
			e.stopPropagation();
			rateDisplay?.classList.toggle('show');
			document.querySelector('.volume-control')?.classList.remove('show');
		}, { passive: true });

		this.addEventListenerSafe(rateSlider, 'input', (e) => {
			this.setSpeechRate(e.target.value);
		});
	}

	/**
	 * 处理文档点击事件，用于关闭滑块
	 */
	handleDocumentClick(e) {
		if (!e.target.closest('#speech-volume') && !e.target.closest('#speech-rate')) {
			document.querySelector('.volume-control')?.classList.remove('show');
			document.querySelector('.rate-control')?.classList.remove('show');
		}
	}

	/**
	 * 设置工具栏项目点击效果
	 */
	setupToolbarItemClickEffects() {
		document.querySelectorAll('.accessibility-toolbar-item').forEach(item => {
			this.addEventListenerSafe(item, 'click', () => {
				// 移除其他项目的活跃状态（除了可以同时激活的功能）
				const persistentFeatures = ['speech-volume', 'speech-rate', 'zoom-in', 'zoom-out', 'zoom-reset'];
				if (!persistentFeatures.includes(item.id)) {
					// 某些功能可以同时启用，不需要互斥
					const exclusiveFeatures = ['high-contrast', 'text-only'];
					if (exclusiveFeatures.includes(item.id)) {
						document.querySelectorAll('.accessibility-toolbar-item').forEach(otherItem => {
							if (exclusiveFeatures.includes(otherItem.id) && otherItem !== item) {
								otherItem.classList.remove('active');
							}
						});
					}
				}
			});

			// 触摸瞬时反馈
			this.addEventListenerSafe(item, 'touchstart', () => {
				item.classList.add('active');
				setTimeout(() => item.classList.remove('active'), 180);
			}, { passive: true });
		});
	}

	/**
	 * 更新工具栏项目状态
	 */
	updateToolbarItemState(feature, enabled) {
		const featureMap = {
			'highContrast': 'high-contrast',
			'textOnly': 'text-only',
			'readingGuide': 'reading-guide',
			'largeTooltip': 'large-tooltip',
			'largeCursor': 'large-cursor',
			'speechSingle': 'speech-single',
			'speechContinuous': 'speech-continuous'
		};

		const elementId = featureMap[feature];
		if (elementId) {
			const element = document.getElementById(elementId);
			if (element) {
				if (enabled) {
					element.classList.add('active');
				} else {
					element.classList.remove('active');
				}
			}
		}
	}

	/**
	 * 处理关闭工具栏按钮
	 */
	handleCloseToolbar() {
		const closeBtn = this.elements.closeToolbar;
		if (closeBtn) {
			closeBtn.classList.add('active');
			setTimeout(() => {
				closeBtn.classList.remove('active');
			}, 500);
		}
		this.handleResetAll();
		this.toggleToolbar();
	}

	/**
	 * 处理重置所有功能
	 */
	handleResetAll() {
		// 移除所有活跃状态
		document.querySelectorAll('.accessibility-toolbar-item.active').forEach(item => {
			item.classList.remove('active');
		});

		// 重置所有功能
		this.resetZoom();
		if (this.state.highContrastEnabled) {
			this.toggleHighContrast();
		}
		if (this.state.textOnlyEnabled) {
			this.toggleTextOnly();
		}
		if (this.state.readingGuideEnabled) {
			this.toggleReadingGuide();
		}
		if (this.state.largeTooltipEnabled) {
			this.toggleLargeTooltip();
		}
		if (this.state.largeCursorEnabled) {
			this.toggleLargeCursor();
		}
		if (this.state.speechMode !== 'none' && !document.body.classList.contains('touch-device')) {
			this.toggleSpeechMode('none');
		}

		// 重置滑块
		const volumeSlider = document.querySelector('#volume-slider');
		const rateSlider = document.querySelector('#rate-slider');
		if (volumeSlider) volumeSlider.value = 0.7;
		if (rateSlider) rateSlider.value = 1;
		this.setSpeechVolume(0.7);
		this.setSpeechRate(1);
		if (this.elements.resetAll) {
			this.elements.resetAll.classList.add('active');
			setTimeout(() => {
				this.elements.resetAll.classList.remove('active');
				this.speak('已重置所有无障碍功能');
			}, 1000);
		}
	}

	/**
	 * 显示使用说明
	 */
	showDescription() {
		window.open(window.location.origin + this.config.helpPath, "_blank")
		const descBtn = document.getElementById('speech-description');
		if (descBtn) {
			descBtn.classList.add('active');
			setTimeout(() => {
				descBtn.classList.remove('active');
			}, 3000);
		}
	}

	/**
	 * 安全添加事件监听器（避免null元素）
	 */
	addEventListenerSafe(element, event, handler, options) {
		if (element) {
			element.addEventListener(event, handler, options);
			this.eventListeners.push({ element, event, handler });
		}
	}

	/**
	 * 设置键盘导航
	 */
	setupKeyboardNavigation() {
		this.addEventListenerSafe(document, 'keydown', (e) => {
			const key = e.code;
			const hotkeys = this.config.hotkeys || {};
			const codeFromHotkey = (hk) => {
				if (!hk || typeof hk !== 'string') return null;
				const parts = hk.split('+');
				return parts.length > 1 ? parts[1] : parts[0];
			};
			if (e.altKey) {
				const mapping = {
					goHome: () => this.goHome(),
					toggleToolbar: () => this.toggleToolbar(),
					zoomIn: () => this.zoomIn(),
					zoomOut: () => this.zoomOut(),
					resetAll: () => this.handleResetAll(),
					toggleSpeechSingle: () => this.toggleSpeechSingle(),
					toggleSpeechContinuous: () => this.toggleSpeechContinuous(),
					toggleHighContrast: () => this.toggleHighContrast(),
					toggleTextOnly: () => this.toggleTextOnly(),
					toggleReadingGuide: () => this.toggleReadingGuide(),
					toggleLargeTooltip: () => this.toggleLargeTooltip(),
					toggleLargeCursor: () => this.toggleLargeCursor(),
					navBack: () => this.navigateBack(),
					navForward: () => this.navigateForward(),
				};

				for (const cfgKey in mapping) {
					const hk = hotkeys[cfgKey];
					const code = codeFromHotkey(hk);
					if (code && code === key) {
						e.preventDefault();
						try {
							mapping[cfgKey]();
						} catch (err) {
							console.error('快捷键捕获错误', cfgKey, err);
						}
						break;
					}
				}
			}
			// ESC键停止语音 (stopSpeech may be 'Escape' or similar)
			if (hotkeys.stopSpeech && key === hotkeys.stopSpeech) {
				if (this.state.isReading) {
					e.preventDefault();
					this.stopSpeech();
				}
			}
		});
	}

	/**
	 * 初始化语音功能
	 */
	initializeSpeech() {
		if (this.speechSynthesis) {
			// 等待语音列表加载
			const loadVoices = () => {
				this.voices = this.speechSynthesis.getVoices();
			};

			loadVoices();
			if (this.speechSynthesis.onvoiceschanged !== undefined) {
				this.speechSynthesis.onvoiceschanged = loadVoices;
			}
		}
	}

	/**
	 * 工具栏切换
	 */
	toggleToolbar(force) {
		const toolbar = this.elements.toolbar;
		const trigger = this.elements.toolbarToggle;
		if (!toolbar) return;

		const collapsed = (typeof force === 'boolean') ? !!force : !this.state.toolbarCollapsed;
		this.state.toolbarCollapsed = collapsed;

		if (this.state.toolbarCollapsed) {
			// 隐藏工具栏
			toolbar.classList.remove('show');
			trigger?.classList.remove('active');
			trigger?.setAttribute('aria-label', '打开无障碍工具栏');
			// 重新显示触发按钮
			if (trigger) trigger.style.display = '';
			// 桌面端顶部停靠会占位，移动端底部悬浮不占位
			if (!document.body.classList.contains('touch-device')) {
				const mainElement = document.querySelector('body');
				if (mainElement) mainElement.style.paddingTop = '0px';
			} else {
				const mainElement = document.querySelector('body');
				if (mainElement) mainElement.style.paddingBottom = '0px';
			}
		} else {
			// 显示工具栏
			toolbar.classList.add('show');
			trigger?.classList.add('active');
			trigger?.setAttribute('aria-label', '关闭无障碍工具栏');
			// 打开后隐藏触发按钮
			if (trigger) trigger.style.display = 'none';
			// 桌面端顶部停靠给出上边距；移动端底部悬浮不修改 body
			if (!document.body.classList.contains('touch-device')) {
				const mainElement = document.querySelector('body');
				if (mainElement) mainElement.style.paddingTop = '200px';
			} else {
				const mainElement = document.querySelector('body');
				if (mainElement) mainElement.style.paddingBottom = '120px';
			}
		}

		// 更新切换按钮图标
		const toggleIcon = this.elements.toolbarToggle?.querySelector('.icon');
		if (toggleIcon) {
			toggleIcon.style.transform = this.state.toolbarCollapsed ? 'rotate(0deg)' : 'rotate(45deg)';
		}

		this.triggerCallback('onFeatureToggle', {
			feature: 'toolbar',
			enabled: !this.state.toolbarCollapsed
		});

		this.speak('工具栏' + (this.state.toolbarCollapsed ? '已关闭' : '已打开'));
		this.saveState();
	}

	/**
	 * 返回首页
	*/
	goHome() {
		window.location.href = window.location.origin + window.location.pathname;
		this.speak('返回首页');
	}

	/**
	 * 缩放功能
	 */
	zoomIn() {
		this.state.currentZoom = Math.min(this.state.currentZoom + 0.1, 3);
		this.applyZoom('放大');
		this.saveState();
	}

	zoomOut() {
		this.state.currentZoom = Math.max(this.state.currentZoom - 0.1, 0.5);
		this.applyZoom('缩小');
		this.saveState();
	}

	resetZoom() {
		this.state.currentZoom = 1;
		this.applyZoom();
		this.saveState();
	}

	applyZoom(zoomtext) {
		const zoomTarget = this.targetElements.zoomTarget || document.body;

		zoomTarget.style.transform = `scale(${this.state.currentZoom})`;
		zoomTarget.style.transformOrigin = 'top left';
		zoomTarget.style.width = this.state.currentZoom > 1 ? '100%' : `${100 / this.state.currentZoom}%`;
		zoomTarget.style.height = `100vh`;

		// 更新显示
		if (this.elements.zoomLevel) {
			this.elements.zoomLevel.textContent = `${Math.round(this.state.currentZoom * 100)}%`;
		}

		// 调整工具栏位置和大小，保持固定定位不受页面缩放影响
		if (this.elements.toolbar) {
			const isVisible = this.elements.toolbar.classList.contains('show');
			const isTouch = document.body.classList.contains('touch-device');
			if (isVisible) {
				this.elements.toolbar.style.transform = 'translateY(0) scale(1)';
			} else {
				// 顶部/底部的隐藏方向不同
				this.elements.toolbar.style.transform = isTouch ? 'translateY(100%) scale(1)' : '';
			}
			this.elements.toolbar.style.transformOrigin = isTouch ? 'bottom center' : '';
		}

		// 同时调整触发按钮，保持在页面缩放时的固定位置
		if (this.elements.toolbarToggle) {
			this.elements.toolbarToggle.style.transform = 'scale(1)';
			this.elements.toolbarToggle.style.transformOrigin = 'center';
		}

		this.triggerCallback('onZoomChange', { zoom: this.state.currentZoom });
		if (this.state.currentZoom === 3) {
			this.speak(`页面已放到最大`);
			return;
		}
		if (this.state.currentZoom === 0.5) {
			this.speak(`页面已缩小至最小`);
			return;
		}
		if (zoomtext) {
			this.speak(`页面${zoomtext}至${Math.round(this.state.currentZoom * 100)}%`);
		}
	}

	/**
	 * 高对比度模式
	 */
	toggleHighContrast(force) {
		const enabled = (typeof force === 'boolean') ? !!force : !this.state.highContrastEnabled;
		this.state.highContrastEnabled = enabled;

		const contrastTarget = this.targetElements.contrastTarget || document.body;

		if (this.state.highContrastEnabled) {
			contrastTarget.classList.add(this.config.classes.highContrast);
			this.elements.highContrast?.classList.add(this.config.classes.active);
		} else {
			contrastTarget.classList.remove(this.config.classes.highContrast);
			this.elements.highContrast?.classList.remove(this.config.classes.active);
		}

		this.speak('高对比度模式' + (this.state.highContrastEnabled ? '已开启' : '已关闭'));
		this.updateToolbarItemState('highContrast', this.state.highContrastEnabled);
		this.triggerCallback('onFeatureToggle', {
			feature: 'highContrast',
			enabled: this.state.highContrastEnabled
		});
		this.saveState();
	}

	/**
	 * 纯文本模式
	 */
	toggleTextOnly(force) {
		const enabled = (typeof force === 'boolean') ? !!force : !this.state.textOnlyEnabled;
		this.state.textOnlyEnabled = enabled;

		const textOnlyTarget = this.targetElements.textOnlyTarget || document.body;

		if (this.state.textOnlyEnabled) {
			textOnlyTarget.classList.add(this.config.classes.textOnly);
			this.elements.textOnly?.classList.add(this.config.classes.active);
		} else {
			textOnlyTarget.classList.remove(this.config.classes.textOnly);
			this.elements.textOnly?.classList.remove(this.config.classes.active);
		}

		this.speak('纯文本模式' + (this.state.textOnlyEnabled ? '已开启，所有装饰性样式已移除' : '已关闭'));
		this.updateToolbarItemState('textOnly', this.state.textOnlyEnabled);
		this.triggerCallback('onFeatureToggle', {
			feature: 'textOnly',
			enabled: this.state.textOnlyEnabled
		});
		this.saveState();
	}

	/**
	 * 阅读辅助线
	 */
	toggleReadingGuide(force) {
		const enabled = (typeof force === 'boolean') ? !!force : !this.state.readingGuideEnabled;
		this.state.readingGuideEnabled = enabled;

		if (this.state.readingGuideEnabled) {
			this.elements.readingGuideLineHorizontal?.classList.add(this.config.classes.active);
			this.elements.readingGuideLineVertical?.classList.add(this.config.classes.active);
			this.elements.readingGuide?.classList.add(this.config.classes.active);
		} else {
			this.elements.readingGuideLineHorizontal?.classList.remove(this.config.classes.active);
			this.elements.readingGuideLineVertical?.classList.remove(this.config.classes.active);
			this.elements.readingGuide?.classList.remove(this.config.classes.active);
		}

		this.speak('阅读辅助线' + (this.state.readingGuideEnabled ? '已开启' : '已关闭'));
		this.updateToolbarItemState('readingGuide', this.state.readingGuideEnabled);
		this.triggerCallback('onFeatureToggle', {
			feature: 'readingGuide',
			enabled: this.state.readingGuideEnabled
		});
		this.saveState();
	}

	/**
	 * 大字幕功能
	 */
	toggleLargeTooltip(force) {
		const enabled = (typeof force === 'boolean') ? !!force : !this.state.largeTooltipEnabled;
		this.state.largeTooltipEnabled = enabled;

		if (this.state.largeTooltipEnabled) {
			this.elements.largeTooltipDisplay?.classList.add(this.config.classes.active);
			this.elements.largeTooltip?.classList.add(this.config.classes.active);
		} else {
			this.elements.largeTooltipDisplay?.classList.remove(this.config.classes.active);
			this.elements.largeTooltip?.classList.remove(this.config.classes.active);
			this.elements.largeTooltipDisplay.style.display = 'none';
		}

		this.speak('大字幕提示' + (this.state.largeTooltipEnabled ? '已开启' : '已关闭'));
		this.updateToolbarItemState('largeTooltip', this.state.largeTooltipEnabled);
		this.triggerCallback('onFeatureToggle', {
			feature: 'largeTooltip',
			enabled: this.state.largeTooltipEnabled
		});
		this.saveState();
	}


	/**
	 * 大鼠标功能
	 */
	toggleLargeCursor(force) {
		const enabled = (typeof force === 'boolean') ? !!force : !this.state.largeCursorEnabled;
		this.state.largeCursorEnabled = enabled;

		const largeCursorTarget = this.targetElements.largeCursorTarget || document.body;

		if (this.state.largeCursorEnabled) {
			largeCursorTarget.classList.add(this.config.classes.largeCursor);
			this.elements.largeCursor?.classList.add(this.config.classes.active);
		} else {
			largeCursorTarget.classList.remove(this.config.classes.largeCursor);
			this.elements.largeCursor?.classList.remove(this.config.classes.active);
		}

		this.speak('大鼠标' + (this.state.largeCursorEnabled ? '已开启' : '已关闭'));
		this.updateToolbarItemState('largeCursor', this.state.largeCursorEnabled);
		this.triggerCallback('onFeatureToggle', {
			feature: 'largeCursor',
			enabled: this.state.largeCursorEnabled
		});
		this.saveState();
	}

	/**
	 * 鼠标移动处理
	 */
	handleMouseMove(e) {
		if (this.state.readingGuideEnabled) {
			if (this.elements.readingGuideLineHorizontal) {
				this.elements.readingGuideLineHorizontal.style.top = `${e.clientY}px`;
			}
			if (this.elements.readingGuideLineVertical) {
				this.elements.readingGuideLineVertical.style.left = `${e.clientX}px`;
			}
		}
	}

	handleMouseOver(e) {
		// 大字幕功能
		if (this.state.largeTooltipEnabled && this.elements.largeTooltipDisplay) {
			const description = this.getElementDescription(e.target);
			if (description) {
				const content = this.elements.largeTooltipDisplay.querySelector('.tooltip-content');
				if (content) {
					content.textContent = description;
				}
				this.elements.largeTooltipDisplay.style.display = 'block';
			} else {
				// 如果没有描述内容，隐藏大字幕
				this.elements.largeTooltipDisplay.style.display = 'none';
			}
		}

		// 连读功能 - 悬停时开始阅读
		if (this.state.speechMode === 'continuous') {
			const target = e.target;
			
			// 避免对工具栏元素响应
			if (target.closest('.accessibility-toolbar') || target.closest('#accessibility-trigger')) {
				return;
			}
	
			// 避免重复播报同一个元素
			if (this.state.lastHoveredElement === target) {
				return;
			}
	
			// 清除之前的防抖计时器
			if (this.state.hoverDebounceTimer) {
				clearTimeout(this.state.hoverDebounceTimer);
			}
	
			// 设置防抖，延迟500ms开始连读（比指读模式稍长，避免过于敏感）
			this.state.hoverDebounceTimer = setTimeout(() => {
				// 如果已经在阅读，先停止
				if (this.state.isReading) {
					this.stopSpeech();
				}
				
				// 从当前悬停位置开始阅读
				this.startContinuousReadingFrom(target);
				this.state.lastHoveredElement = target;
			}, 500);
		}

		// 指读功能 - 悬浮时播报
		if (this.state.speechMode === 'single') {
			const target = e.target;
			// 避免对工具栏元素播报
			if (target.closest('.accessibility-toolbar') || target.closest('#accessibility-trigger')) {
				return;
			}

			// 避免重复播报同一个元素
			if (this.state.lastHoveredElement === target) {
				return;
			}

			// 清除之前的防抖计时器
			if (this.state.hoverDebounceTimer) {
				clearTimeout(this.state.hoverDebounceTimer);
			}

			// 设置防抖，延迟300ms播报
			this.state.hoverDebounceTimer = setTimeout(() => {
				const description = this.getElementDescriptionWithType(target);
				if (description) {
					this.speak(description);
					this.state.lastHoveredElement = target;
				}
			}, 300);
		}
	}

	handleMouseOut() {
		if (this.state.largeTooltipEnabled && this.elements.largeTooltipDisplay) {
			this.elements.largeTooltipDisplay.style.display = 'none';
		}
	
		// 清理连读和指读功能的状态
		if (this.state.speechMode !== 'none') {
			// 重置上次悬浮的元素
			this.state.lastHoveredElement = null;
			
			// 清除防抖计时器
			if (this.state.hoverDebounceTimer) {
				clearTimeout(this.state.hoverDebounceTimer);
			}
		}
	}

	handleScroll() {
		// 当zoomTarget是body时，滚动需要调整大字幕位置
		if (this.config.targets.zoomTarget === 'body' && this.state.largeTooltipEnabled && this.elements.largeTooltipDisplay) {
			// 获取当前滚动位置
			const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
			// 计算元素应该在的位置（视窗底部 - 元素距底部的距离）
			const newTop = scrollTop + window.innerHeight - 120;
			const element = this.elements.largeTooltipDisplay;
			element.style.top = `${newTop}px`;
		}
	}


	/**
	 * 获取元素描述
	 */
	getElementDescription(element) {
		if (!element || element === document.body) return '';
		if (this.targetElements.mainContent && element === this.targetElements.mainContent) {
			return '';
		}
	
		// 检查元素是否包含子元素，如果是容器元素则跳过
		if (this.shouldSkipElement(element)) {
			return '';
		}
	
		let text = '';
	
		// 获取元素自身的文本内容（不包括子元素）
		text = this.getDirectTextContent(element);
	
		// 如果没有通过直接文本获取到内容，再尝试其他属性
		if (!text) {
			if (element.alt) {
				text = element.alt;
			} else if (element.title) {
				text = element.title;
			} else if (element.tagName) {
				const tagNames = {
					'A': '链接',
					'BUTTON': '按钮',
					'INPUT': '输入框',
					'IMG': '图片',
					'VIDEO': '视频',
					'AUDIO': '音频',
					'SELECT': '下拉框',
				};
				text = tagNames[element.tagName] || element.tagName.toLowerCase();
			}
		}
	
		return text;
	}

	/**
	 * 获取带类型前缀的元素描述
	 */
	getElementDescriptionWithType(element) {
		if (!element || element === document.body) return '';
	
		// 检查元素是否包含子元素，如果是容器元素则跳过阅读
		if (this.shouldSkipElement(element)) {
			return '';
		}
	
		let text = '';
		let typePrefix = '';

		// 确定元素类型前缀
		if (element.tagName === 'BUTTON' || (element.tagName === 'INPUT' && element.type === 'button')) {
			typePrefix = '按钮：';
		} else if (element.tagName === 'A') {
			typePrefix = '链接：';
		} else if (element.tagName === 'INPUT') {
			const inputTypes = {
				'text': '文本输入框',
				'password': '密码输入框',
				'email': '邮箱输入框',
				'tel': '电话输入框',
				'number': '数字输入框',
				'search': '搜索框',
				'url': 'URL输入框'
			};
			typePrefix = (inputTypes[element.type] || '输入框') + '：';
		} else if (element.tagName === 'SELECT') {
			typePrefix = '下拉选择框：';
		} else if (element.tagName === 'TEXTAREA') {
			typePrefix = '文本区域：';
		} else if (element.tagName === 'IMG') {
			typePrefix = '图片：';
		} 
	
		// 获取元素自身的文本内容（不包括子元素）
		text = this.getDirectTextContent(element);
	
		// 如果没有有效文本内容，返回空字符串
		if (!text) {
			return '';
		}
	
		return typePrefix + text;
	}
	
	/**
	 * 判断是否应该跳过该元素的阅读/显示
	 */
	shouldSkipElement(element) {
		// 常见的容器元素标签
		const containerTags = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'NAV', 
							'UL', 'OL', 'TABLE', 'FORM', 'FIELDSET', 'DETAILS'];
		
		// 如果元素是容器标签且包含子元素，则跳过
		if (containerTags.includes(element.tagName)) {
			// 检查是否包含有意义的子元素
			const meaningfulChildren = Array.from(element.children).filter(child => {
				// 检查子元素是否有文本内容或是有意义的交互元素
				const childText = this.getDirectTextContent(child);
				const isInteractive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(child.tagName);
				return (childText && childText.trim().length > 0) || isInteractive;
			});
			
			// 如果有有意义的子元素，则跳过当前元素
			if (meaningfulChildren.length > 0) {
				return true;
			}
		}
		
		// 如果元素本身没有内容但包含子元素，也跳过
		const directText = this.getDirectTextContent(element);
		if (!directText && element.children.length > 0) {
			return true;
		}
		
		return false;
	}

	/**
	 * 获取元素的直接文本内容（不包括子元素的文本）
	 */
	getDirectTextContent(element) {
		let text = '';
		
		// 优先使用无障碍属性
		if (element.alt) {
			text = element.alt;
		} else if (element.title) {
			text = element.title;
		} else if (element.placeholder) {
			text = element.placeholder;
		} else if (element.value && element.value.trim()) {
			text = element.value.trim();
		} else {
			// 获取直接文本节点内容
			const directTextNodes = Array.from(element.childNodes).filter(node => 
				node.nodeType === Node.TEXT_NODE && node.textContent.trim()
			);
			
			if (directTextNodes.length > 0) {
				text = directTextNodes.map(node => node.textContent.trim()).join(' ').substring(0, 100);
			}
		}
		
		return text ? text.trim() : '';
	}

	toggleSpeechMode(force) {
		if (force !== 'none') {
			if (force === 'single') {
				this.speak('切换到指读模式');
				this.elements.speechSingle.classList.add(this.config.classes.active);
				this.elements.speechContinuous.classList.remove(this.config.classes.active);
			} else {
				this.speak('切换到连读模式，点击页面任意位置开始阅读');
				this.elements.speechContinuous.classList.add(this.config.classes.active);
				this.elements.speechSingle.classList.remove(this.config.classes.active);
			}
		} else {
			this.state.speechMode = 'none';
			this.speak('语音阅读已关闭');
			this.elements.speechSingle.classList.remove(this.config.classes.active);
			this.elements.speechContinuous.classList.remove(this.config.classes.active);
		}
		this.updateToolbarItemState('speechMode', this.state.speechMode);
		this.triggerCallback('onFeatureToggle', {
			feature: 'speechMode',
			state: this.state.speechMode
		});
		this.saveState();
	}

	toggleSpeechSingle() {
		if (this.state.speechMode === 'single') {
			this.state.speechMode = 'none';
			this.speak('语音指读已关闭');
			this.elements.speechSingle.classList.remove(this.config.classes.active);
		} else {
			this.state.speechMode = 'single';
			this.speak('切换到指读模式');
			this.elements.speechSingle.classList.add(this.config.classes.active);
			this.elements.speechContinuous.classList.remove(this.config.classes.active);
		}
		this.updateToolbarItemState('speechMode', this.state.speechMode);
		this.triggerCallback('onFeatureToggle', {
			feature: 'speechMode',
			state: this.state.speechMode
		});
		this.saveState();
	}

	toggleSpeechContinuous() {
		if (this.state.speechMode === 'continuous') {
			// 如果已经是连读模式，则关闭
			this.state.speechMode = 'none';
			this.stopSpeech(); // 停止当前阅读
			this.speak('语音连读已关闭');
			this.elements.speechContinuous?.classList.remove(this.config.classes.active);
		} else {
			// 切换到连读模式
			this.state.speechMode = 'continuous';
			this.speak('切换到连读模式，鼠标悬停在内容区域开始阅读');
			this.elements.speechContinuous?.classList.add(this.config.classes.active);
			this.elements.speechSingle?.classList.remove(this.config.classes.active);
		}
		
		this.updateToolbarItemState('speechContinuous', this.state.speechMode === 'continuous');
		this.triggerCallback('onFeatureToggle', {
			feature: 'speechMode',
			state: this.state.speechMode
		});
		this.saveState();
	}

	setSpeechVolume(volume) {
		this.state.speechVolume = parseFloat(volume);
		this.saveState();
	}

	setSpeechRate(rate) {
		this.state.speechRate = parseFloat(rate);
		this.saveState();
	}

	handleClick(e) {
		if (this.state.speechMode === 'none') return;
	
		// 避免对工具栏元素响应
		const target = e.target;
		if (target.closest('.accessibility-toolbar') || target.closest('#accessibility-trigger')) {
			return;
		}
	
		// 连读模式下，点击任意位置停止阅读
		if (this.state.speechMode === 'continuous' && this.state.isReading) {
			this.stopSpeech();
			this.speak('已停止阅读');
		}
		
		// 指读模式下，点击不影响（保持原有的悬停阅读）
	}

	readPageContent() {
		if (this.state.speechMode === 'none' || this.state.isReading) return;

		this.state.isReading = true;
		const content = this.extractPageContent();
		this.speak(content, () => {
			this.state.isReading = false;
		});
	}

	extractPageContent() {
		const mainContent = document.querySelector('main') || document.body;
		const walker = document.createTreeWalker(
			mainContent,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: (node) => {
					const parent = node.parentNode;
					if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
						return NodeFilter.FILTER_REJECT;
					}
					if (parent.closest('.accessibility-toolbar')) {
						return NodeFilter.FILTER_REJECT;
					}
					return NodeFilter.FILTER_ACCEPT;
				}
			}
		);

		let content = '';
		let node;
		while (node = walker.nextNode()) {
			const text = node.textContent.trim();
			if (text) {
				content += text + ' ';
			}
		}

		return content.trim();
	}

	// 新增方法：从指定元素开始连读
	startContinuousReadingFrom(startElement) {
		if (this.state.speechMode !== 'continuous' || this.state.isReading) return;

		this.state.isReading = true;
		const content = this.extractContentFromElement(startElement);
		
		if (!content) {
			this.speak('没有找到可阅读的内容');
			this.state.isReading = false;
			return;
		}
		
		this.speak(content, () => {
			this.state.isReading = false;
			// 阅读完成后可以添加提示
			this.speak('内容阅读完毕');
		});
	}

	// 新增方法：从指定元素开始提取内容
	extractContentFromElement(startElement) {
		// 找到包含主要内容的最接近的容器
		let contentContainer = this.findContentContainer(startElement);
		
		if (!contentContainer) {
			contentContainer = document.body;
		}
		
		// 创建文档片段来提取文本，从开始元素之后的内容
		const walker = document.createTreeWalker(
			contentContainer,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: (node) => {
					// 跳过脚本、样式和无障碍工具栏
					const parent = node.parentNode;
					if (parent.tagName === 'SCRIPT' || 
						parent.tagName === 'STYLE' || 
						parent.tagName === 'NOSCRIPT' ||
						parent.closest('.accessibility-toolbar') ||
						parent.closest('#accessibility-trigger')) {
						return NodeFilter.FILTER_REJECT;
					}
					
					// 跳过空白文本节点
					if (!node.textContent.trim()) {
						return NodeFilter.FILTER_REJECT;
					}
					
					// 跳过隐藏元素
					if (parent.offsetParent === null || 
						parent.style.display === 'none' || 
						parent.style.visibility === 'hidden' ||
						window.getComputedStyle(parent).display === 'none') {
						return NodeFilter.FILTER_REJECT;
					}
					
					// 检查节点是否在开始元素之后（按文档顺序）
					if (!this.isNodeAfterStartElement(node, startElement)) {
						return NodeFilter.FILTER_REJECT;
					}
					
					return NodeFilter.FILTER_ACCEPT;
				}
			}
		);

		let content = '';
		let node;
		const seenTexts = new Set(); // 避免重复内容
		
		while (node = walker.nextNode()) {
			const text = node.textContent.trim();
			
			// 避免重复的文本内容
			if (text && !seenTexts.has(text) && text.length > 1) {
				// 添加适当的标点分隔
				if (content && !content.endsWith('.') && !content.endsWith('!') && !content.endsWith('?')) {
					content += '。';
				}
				content += text + ' ';
				seenTexts.add(text);
				
				// 限制内容长度，避免过长的阅读
				if (content.length > 5000) {
					content += '...（内容过长，已截断）';
					break;
				}
			}
		}

		return content.trim();
	}

	// 新增方法：查找内容容器
	findContentContainer(element) {
		// 常见的内容容器标签
		const containerTags = ['ARTICLE', 'SECTION', 'MAIN', 'DIV', 'P', 'LI', 'BLOCKQUOTE'];
		
		let current = element;
		while (current && current !== document.body) {
			if (containerTags.includes(current.tagName) && 
				this.hasSubstantialContent(current)) {
				return current;
			}
			current = current.parentElement;
		}
		
		return document.body;
	}

	// 新增方法：检查元素是否有实质性内容
	hasSubstantialContent(element) {
		const text = element.textContent || '';
		return text.trim().length > 20; // 至少有20个字符
	}

	// 新增方法：检查节点是否在开始元素之后
	isNodeAfterStartElement(node, startElement) {
		// 简单的文档位置比较
		const nodeRange = document.createRange();
		nodeRange.selectNode(node);
		
		const startRange = document.createRange();
		startRange.selectNode(startElement);
		
		// 比较两个范围的位置
		const comparison = nodeRange.compareBoundaryPoints(Range.START_TO_START, startRange);
		
		return comparison >= 0; // 0表示相同节点，>0表示在之后
	}
	speak(text, onEnd = null) {
		if (!this.speechSynthesis) {
			console.warn('语音合成不可用');
			return;
		}

		// 停止当前朗读
		this.speechSynthesis.cancel();

		if (!text) return;

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.volume = this.state.speechVolume;
		utterance.rate = this.state.speechRate;
		utterance.pitch = this.config.speech.pitch;
		utterance.lang = this.config.speech.lang;

		// 选择语音
		if (this.config.speech.voiceIndex >= 0 && this.voices[this.config.speech.voiceIndex]) {
			utterance.voice = this.voices[this.config.speech.voiceIndex];
		}

		if (onEnd) {
			utterance.onend = onEnd;
		}

		this.currentUtterance = utterance;
		this.speechSynthesis.speak(utterance);
	}

	stopSpeech() {
		if (this.speechSynthesis) {
			this.speechSynthesis.cancel();
		}
		this.state.isReading = false;
		this.state.lastHoveredElement = null;
		
		// 清除可能存在的防抖计时器
		if (this.state.hoverDebounceTimer) {
			clearTimeout(this.state.hoverDebounceTimer);
			this.state.hoverDebounceTimer = null;
		}
	}

	/**
	 * 导航功能
	 */
	navigateBack() {
		if (window.history.length > 1) {
			window.history.back();
			this.speak('页面后退');
		} else {
			this.speak('无法后退');
		}
	}

	navigateForward() {
		window.history.forward();
		this.speak('页面前进');
	}

	/**
	 * 状态管理
	 */
	getState() {
		return { ...this.state };
	}

	setState(newState) {
		Object.assign(this.state, newState);
		this.triggerCallback('onStateChange', { type: 'update', state: this.state });
	}

	saveState() {
		try {
			sessionStorage.setItem('accessibility-plugin-state', JSON.stringify(this.state));
		} catch (error) {
			console.warn('无法保存状态到sessionStorage:', error);
		}
	}

	restoreState() {
		try {
			const savedState = sessionStorage.getItem('accessibility-plugin-state');
			if (savedState) {
				const parsedState = JSON.parse(savedState);
				Object.assign(this.state, parsedState);
				this.applyRestoredState();
			}
		} catch (error) {
			console.warn('无法从sessionStorage恢复状态:', error);
		}
	}

	applyRestoredState() {
		// 应用恢复的状态
		// 恢复缩放（applyZoom 会根据 state.currentZoom 应用）
		if (typeof this.state.currentZoom === 'number') {
			this.applyZoom();
		}

		// 在恢复期间静默 speak 与 saveState，避免语音提示和重复写入
		const origSpeak = this.speak;
		const origSave = this.saveState;
		this.speak = function () { };
		this.saveState = function () { };
		try {
			// 使用 force 参数恢复各个开关，避免基于toggle的翻转副作用
			this.toggleHighContrast(!!this.state.highContrastEnabled);
			this.toggleTextOnly(!!this.state.textOnlyEnabled);
			this.toggleLargeCursor(!!this.state.largeCursorEnabled);
			this.toggleLargeTooltip(!!this.state.largeTooltipEnabled);
			this.toggleReadingGuide(!!this.state.readingGuideEnabled);
			this.toggleSpeechMode(this.state.speechMode);
		} finally {
			// 恢复 speak 与 saveState 实现
			this.speak = origSpeak;
			this.saveState = origSave;
		}

		// 恢复语音相关设置（滑块）
		const volumeSlider = document.querySelector('#volume-slider');
		const rateSlider = document.querySelector('#rate-slider');
		if (volumeSlider) volumeSlider.value = this.state.speechVolume ?? this.config.defaults.speechVolume;
		if (rateSlider) rateSlider.value = this.state.speechRate ?? this.config.defaults.speechRate;

		// 恢复工具栏展开/收起状态 - 直接操作 DOM 避免 toggleToolbar 的副作用
		const toolbar = this.elements.toolbar;
		const trigger = this.elements.toolbarToggle;
		if (toolbar) {
			if (this.state.toolbarCollapsed) {
				toolbar.classList.remove('show');
				trigger?.classList.remove('active');
				if (trigger) trigger.style.display = '';
				if (!document.body.classList.contains('touch-device')) {
					document.body.style.paddingTop = '0px';
				} else {
					document.body.style.paddingBottom = '0px';
				}
			} else {
				toolbar.classList.add('show');
				trigger?.classList.add('active');
				if (trigger) trigger.style.display = 'none';
				if (!document.body.classList.contains('touch-device')) {
					document.body.style.paddingTop = '200px';
				} else {
					document.body.style.paddingBottom = '120px';
				}
				setTimeout(() => {
					const firstButton = toolbar.querySelector('.control-btn');
					if (firstButton) firstButton.focus();
				}, 300);
			}

			// 更新切换图标
			const toggleIcon = trigger?.querySelector('.icon');
			if (toggleIcon) toggleIcon.style.transform = this.state.toolbarCollapsed ? 'rotate(0deg)' : 'rotate(45deg)';
		}
	}

	/**
	 * 回调函数处理
	 */
	triggerCallback(callbackName, data) {
		const callback = this.config.callbacks[callbackName];
		if (typeof callback === 'function') {
			callback(data);
		}
	}

	/**
	 * 公共API方法
	 */

	// 设置缩放
	setZoom(zoom) {
		this.state.currentZoom = Math.max(0.5, Math.min(3, zoom));
		this.applyZoom();
		this.saveState();
	}

	// 启用/禁用功能
	enableFeature(feature) {
		switch (feature) {
			case 'highContrast':
				if (!this.state.highContrastEnabled) this.toggleHighContrast(true);
				break;
			case 'textOnly':
				if (!this.state.textOnlyEnabled) this.toggleTextOnly(true);
				break;
			case 'readingGuide':
				if (!this.state.readingGuideEnabled) this.toggleReadingGuide(true);
				break;
			case 'largeTooltip':
				if (!this.state.largeTooltipEnabled) this.toggleLargeTooltip(true);
				break;
			case 'largeCursor':
				if (!this.state.largeCursorEnabled) this.toggleLargeCursor(true);
				break;
		}
	}

	disableFeature(feature) {
		switch (feature) {
			case 'highContrast':
				if (this.state.highContrastEnabled) this.toggleHighContrast(false);
				break;
			case 'textOnly':
				if (this.state.textOnlyEnabled) this.toggleTextOnly(false);
				break;
			case 'readingGuide':
				if (this.state.readingGuideEnabled) this.toggleReadingGuide(false);
				break;
			case 'largeTooltip':
				if (this.state.largeTooltipEnabled) this.toggleLargeTooltip(false);
				break;
			case 'largeCursor':
				if (this.state.largeCursorEnabled) this.toggleLargeCursor(false);
				break;
		}
	}

	// 更新配置
	updateConfig(newConfig) {
		this.config = this.deepMerge(this.config, newConfig);
		this.bindElements(); // 重新绑定元素
	}

	/**
	 * 销毁方法
	 */
	destroy() {
		// 清理事件监听器
		this.eventListeners.forEach(({ element, event, handler }) => {
			element.removeEventListener(event, handler);
		});
		this.eventListeners = [];

		// 停止语音
		this.stopSpeech();

		// 重置样式 - 使用目标元素
		const zoomTarget = this.targetElements.zoomTarget || document.body;
		const contrastTarget = this.targetElements.contrastTarget || document.body;
		const textOnlyTarget = this.targetElements.textOnlyTarget || document.body;
		const largeCursorTarget = this.targetElements.largeCursorTarget || document.body;

		// 重置缩放样式
		zoomTarget.style.transform = '';
		zoomTarget.style.transformOrigin = '';
		zoomTarget.style.width = '';
		zoomTarget.style.height = '';

		// 移除CSS类
		contrastTarget.classList.remove(this.config.classes.highContrast);
		textOnlyTarget.classList.remove(this.config.classes.textOnly);
		largeCursorTarget.classList.remove(this.config.classes.largeCursor);

		// 保存状态
		this.saveState();

		this.state.isInitialized = false;
		this.triggerCallback('onStateChange', { type: 'destroyed', state: this.state });
	}
}

// 导出类和便捷初始化函数
window.AccessibilityPlugin = AccessibilityPlugin;

// 便捷初始化函数
window.initAccessibility = function (options = {}) {
	return new AccessibilityPlugin(options);
};
