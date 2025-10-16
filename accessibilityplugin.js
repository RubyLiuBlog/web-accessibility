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
				zoomReset: '#zoom-reset',
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
				speechToggle: '#speech-toggle',
				speechMode: '#speech-mode',
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
				description: '#speech-description'
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
				speechMode: 'continuous' // 'continuous' 或 'single'
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
				goHome: 'Alt+KeyH',
				toggleToolbar: 'Alt+KeyA',
				zoomIn: 'Alt+Equal',
				zoomOut: 'Alt+Minus',
				resetZoom: 'Alt+Digit0',
				toggleSpeech: 'Alt+KeyS',
				toggleHighContrast: 'Alt+KeyC',
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
			}
		};

		// 合并用户配置
		this.config = this.deepMerge(this.config, options);

		// 状态管理
		this.state = {
			isInitialized: false,
			currentZoom: this.config.defaults.zoom,
			speechEnabled: false,
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
		this.addEventListenerSafe(this.elements.zoomReset, 'click', () => this.resetZoom());

		// 视觉辅助
		this.addEventListenerSafe(this.elements.highContrast, 'click', () => this.toggleHighContrast());
		this.addEventListenerSafe(this.elements.textOnly, 'click', () => this.toggleTextOnly());
		this.addEventListenerSafe(this.elements.readingGuide, 'click', () => this.toggleReadingGuide());

		// 大字幕和大鼠标
		this.addEventListenerSafe(this.elements.largeTooltip, 'click', () => this.toggleLargeTooltip());
		this.addEventListenerSafe(this.elements.largeCursor, 'click', () => this.toggleLargeCursor());

		// 语音控制
		this.addEventListenerSafe(this.elements.speechToggle, 'click', () => this.toggleSpeech());
		this.addEventListenerSafe(this.elements.speechMode, 'click', () => this.toggleSpeechMode());

		// 音量和语速控制
		this.setupVolumeControl();
		this.setupRateControl();

		// 说明按钮功能
		const descriptionBtn = document.getElementById('speech-description');
		this.addEventListenerSafe(descriptionBtn, 'click', () => this.showDescription());

		// 重置功能
		this.addEventListenerSafe(this.elements.zoomReset, 'click', () => this.handleResetAll());

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
				this.elements.readingGuideLineHorizontal.style.top = t.clientY / this.state.currentZoom + 'px';
			}
			if (this.elements.readingGuideLineVertical) {
				this.elements.readingGuideLineVertical.style.left = t.clientX / this.state.currentZoom + 'px';
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
			'speech': 'speech-toggle',
			'speechMode': 'speech-mode'
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
		if (this.state.speechEnabled && !document.body.classList.contains('touch-device')) {
			this.toggleSpeech();
		}

		// 重置滑块
		const volumeSlider = document.querySelector('#volume-slider');
		const rateSlider = document.querySelector('#rate-slider');
		if (volumeSlider) volumeSlider.value = 0.7;
		if (rateSlider) rateSlider.value = 1;
		this.setSpeechVolume(0.7);
		this.setSpeechRate(1);

		const resetBtn = document.getElementById('zoom-reset');
		if (resetBtn) {
			resetBtn.classList.add('active');
			setTimeout(() => {
				resetBtn.classList.remove('active');
			}, 1000);
		}
	}

	/**
	 * 显示使用说明
	 */
	showDescription() {
		const description = `
            无障碍工具栏使用说明：
            - 放大/缩小：调整页面缩放比例
            - 对比色：切换高对比度模式，便于视觉障碍用户
            - 鼠标：启用大鼠标光标
            - 辅助线：显示阅读辅助线，跟随鼠标移动
            - 纯文本：移除所有装饰性样式，只保留基本文本格式
            - 大字幕：显示鼠标悬停元素的大字幕提示
            - 声音：调整语音朗读音量
            - 指读：启用点击朗读功能
            - 连读：切换连续朗读模式
            - 语速：调整语音朗读速度
            - 重置：恢复所有设置到默认状态
            - 关闭：隐藏工具栏
            
            快捷键：Alt+A 显示/隐藏工具栏
        `;

		this.speak(description);
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
			const hotkeys = this.config.hotkeys;

			// 检查快捷键
			if (e.altKey) {
				switch (key) {
					case hotkeys.goHome.split('+')[1]:
						e.preventDefault();
						this.goHome();
						break;
					case hotkeys.toggleToolbar.split('+')[1]:
						e.preventDefault();
						this.toggleToolbar();
						break;
					case hotkeys.zoomIn.split('+')[1]:
						e.preventDefault();
						this.zoomIn();
						break;
					case hotkeys.zoomOut.split('+')[1]:
						e.preventDefault();
						this.zoomOut();
						break;
					case hotkeys.resetZoom.split('+')[1]:
						e.preventDefault();
						this.resetZoom();
						break;
					case hotkeys.toggleSpeech.split('+')[1]:
						e.preventDefault();
						this.toggleSpeech();
						break;
					case hotkeys.toggleHighContrast.split('+')[1]:
						e.preventDefault();
						this.toggleHighContrast();
						break;
				}
			}

			// ESC键停止语音
			if (key === hotkeys.stopSpeech && this.state.isReading) {
				e.preventDefault();
				this.stopSpeech();
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
		window.location.href = window.location.origin;
		this.speak('返回首页');
	}

	/**
	 * 缩放功能
	 */
	zoomIn() {
		this.state.currentZoom = Math.min(this.state.currentZoom + 0.1, 3);
		this.applyZoom();
		this.saveState();
	}

	zoomOut() {
		this.state.currentZoom = Math.max(this.state.currentZoom - 0.1, 0.5);
		this.applyZoom();
		this.saveState();
	}

	resetZoom() {
		this.state.currentZoom = 1;
		this.applyZoom();
		this.saveState();
	}

	applyZoom() {
		const zoomTarget = this.targetElements.zoomTarget || document.body;

		zoomTarget.style.transform = `scale(${this.state.currentZoom})`;
		zoomTarget.style.transformOrigin = 'top left';
		zoomTarget.style.width = `${100 / this.state.currentZoom}%`;
		zoomTarget.style.height = `${100 / this.state.currentZoom}%`;

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
		this.speak(`页面缩放${Math.round(this.state.currentZoom * 100)}%`);
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
				this.elements.readingGuideLineHorizontal.style.top = e.clientY / this.state.currentZoom + 'px';
			}
			if (this.elements.readingGuideLineVertical) {
				this.elements.readingGuideLineVertical.style.left = e.clientX / this.state.currentZoom + 'px';
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
			}
		}

		// 指读功能 - 悬浮时播报
		if (this.state.speechEnabled) {
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

		// 清理指读功能的状态
		if (this.state.speechEnabled) {
			// 重置上次悬浮的元素
			this.state.lastHoveredElement = null;
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

		let text = '';

		if (element.alt) {
			text = element.alt;
		} else if (element.title) {
			text = element.title;
		} else if (element.textContent && element.textContent.trim()) {
			text = element.textContent.trim().substring(0, 100);
		} else if (element.tagName) {
			const tagNames = {
				'A': '链接',
				'BUTTON': '按钮',
				'INPUT': '输入框',
				'IMG': '图片',
				'VIDEO': '视频',
				'AUDIO': '音频',
				'DIV': '容器',
				'SELECT': '下拉框',
			};
			text = tagNames[element.tagName] || element.tagName.toLowerCase();
		}

		return text;
	}

	/**
	 * 获取带类型前缀的元素描述
	 */
	getElementDescriptionWithType(element) {
		if (!element || element === document.body) return '';

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

		// 获取元素文本内容
		if (element.alt) {
			text = element.alt;
		} else if (element.title) {
			text = element.title;
		} else if (element.textContent && element.textContent.trim()) {
			text = element.textContent.trim().substring(0, 100);
		} else if (element.tagName === 'IMG') {
			text = '无描述图片';
		} else if (element.placeholder) {
			text = element.placeholder;
		} else if (element.value && element.value.trim()) {
			text = element.value.trim().substring(0, 50);
		}

		// 如果没有有效文本内容，返回空字符串
		if (!text) {
			return '';
		}

		return typePrefix + text;
	}

	/**
	 * 语音功能
	 */
	toggleSpeech(force) {
		const enabled = (typeof force === 'boolean') ? !!force : !this.state.speechEnabled;
		this.state.speechEnabled = enabled;

		if (this.state.speechEnabled) {
			this.elements.speechToggle?.classList.add(this.config.classes.active);
		} else {
			this.elements.speechToggle?.classList.remove(this.config.classes.active);
			this.stopSpeech();
		}

		this.speak('语音朗读' + (this.state.speechEnabled ? '已开启' : '已关闭'));
		this.updateToolbarItemState('speech', this.state.speechEnabled);
		this.triggerCallback('onSpeechToggle', { enabled: this.state.speechEnabled });
		this.saveState();
	}

	toggleSpeechMode(force) {
		// force can be 'continuous' or 'single' or boolean true/false (true = continuous)
		if (typeof force === 'string') {
			this.state.speechMode = (force === 'continuous') ? 'continuous' : 'single';
		} else if (typeof force === 'boolean') {
			this.state.speechMode = force ? 'continuous' : 'single';
		} else {
			this.state.speechMode = this.state.speechMode === 'continuous' ? 'single' : 'continuous';
		}
		const modeText = this.state.speechMode === 'continuous' ? '连读' : '单读';
		this.speak(`切换到${modeText}模式`);

		this.updateToolbarItemState('speechMode', this.state.speechMode === 'continuous');
		this.triggerCallback('onFeatureToggle', {
			feature: 'speechMode',
			enabled: this.state.speechMode === 'continuous'
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
		if (!this.state.speechEnabled) return;

		// 避免对工具栏元素响应
		const target = e.target;
		if (target.closest('.accessibility-toolbar') || target.closest('#accessibility-trigger')) {
			return;
		}

		// 连读模式下，点击任意位置开始读取页面内容
		if (this.state.speechMode === 'continuous' && !this.state.isReading) {
			this.readPageContent();
		}
	}

	readPageContent() {
		if (!this.state.speechEnabled || this.state.isReading) return;

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
			localStorage.setItem('accessibility-plugin-state', JSON.stringify(this.state));
		} catch (error) {
			console.warn('无法保存状态到localStorage:', error);
		}
	}

	restoreState() {
		try {
			const savedState = localStorage.getItem('accessibility-plugin-state');
			if (savedState) {
				const parsedState = JSON.parse(savedState);
				Object.assign(this.state, parsedState);
				this.applyRestoredState();
			}
		} catch (error) {
			console.warn('无法从localStorage恢复状态:', error);
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
		this.speak = function(){};
		this.saveState = function(){};
		try {
			// 使用 force 参数恢复各个开关，避免基于toggle的翻转副作用
			this.toggleHighContrast(!!this.state.highContrastEnabled);
			this.toggleTextOnly(!!this.state.textOnlyEnabled);
			this.toggleLargeCursor(!!this.state.largeCursorEnabled);
			this.toggleLargeTooltip(!!this.state.largeTooltipEnabled);
			this.toggleReadingGuide(!!this.state.readingGuideEnabled);
			this.toggleSpeech(!!this.state.speechEnabled);
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
			case 'speech':
				if (!this.state.speechEnabled) this.toggleSpeech(true);
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
			case 'speech':
				if (this.state.speechEnabled) this.toggleSpeech(false);
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
