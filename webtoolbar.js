// 初始化无障碍插件
document.addEventListener('DOMContentLoaded', function () {
  // 初始化无障碍插件
  const accessibilityPlugin = new AccessibilityPlugin({
    callbacks: {
      onFeatureToggle: (data) => {
        console.log('功能切换:', data);
      },
      onZoomChange: (data) => {
        console.log('缩放变化:', data);
      },
      onSpeechToggle: (data) => {
        console.log('语音切换:', data);
      }
    },
    targets: {
      zoomTarget: '.container',        // 只缩放主内容区域
      contrastTarget: '.container',    // 高对比度应用于整个页面
      textOnlyTarget: '.container',    // 只对内容区域应用纯文本模式
      largeCursorTarget: '.container',  // 大鼠标依然作用于整个页面
      mainContent: '.container'      // 主内容区域选择器
    },
  });

  // 将插件实例暴露到全局，以便其他脚本使用
  window.accessibilityPlugin = accessibilityPlugin;
});