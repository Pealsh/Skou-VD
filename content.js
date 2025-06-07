/**
 * 動画自動再生拡張機能
 * ページ遷移による動画の連続再生をサポート
 */
class AutoPlayExtension {
    constructor() {
      this.isEnabled = true;
      this.videoElement = null;
      this.checkInterval = null;
      this.observer = null;
      
      this.init();
    }
  
    /**
     * 初期化処理
     */
    init() {
      console.log('=== 自動再生拡張機能 開始 ===');
      console.log('現在のURL:', window.location.href);
      
      this.loadSettings();
      
      if (this.isVideoPage()) {
        this.startVideoMonitoring();
      }
      
      this.observeChanges();
      this.setupMessageListener();
      
      console.log('=== 拡張機能準備完了 ===');
    }
  
    /**
     * 動画ページかどうかを判定
     */
    isVideoPage() {
      const url = window.location.href;
      return url.includes('/movie/') || url.includes('/contents/courses/');
    }
  
    /**
     * 設定の読み込み
     */
    loadSettings() {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['autoPlayEnabled'], (result) => {
          this.isEnabled = result.autoPlayEnabled !== false;
          console.log('設定読み込み完了. 自動再生:', this.isEnabled);
        });
      }
    }
  
    /**
     * 動画の監視を開始
     */
    startVideoMonitoring() {
      console.log('動画監視を開始します...');
      
      this.stopVideoMonitoring();
      
      this.checkInterval = setInterval(() => {
        this.checkVideoStatus();
      }, 1000);
      
      setTimeout(() => this.checkVideoStatus(), 2000);
    }
  
    /**
     * 動画監視を停止
     */
    stopVideoMonitoring() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    }
  
    /**
     * 動画の状態をチェック
     */
    checkVideoStatus() {
      if (!this.isEnabled) return;
  
      const video = this.findVideoElement();
      
      if (video) {
        if (video.ended) {
          console.log('🎬 動画が終了しました！');
          this.handleVideoEnd();
        } else if (video.currentTime > 0 && !this.videoElement) {
          this.videoElement = video;
          console.log('動画要素を発見しました');
        }
      }
    }
  
    /**
     * 動画要素を探す
     */
    findVideoElement() {
      // iframe内の動画を探す
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.contentDocument) {
            const videos = iframe.contentDocument.querySelectorAll('video');
            if (videos.length > 0) {
              return videos[0];
            }
          }
        } catch (e) {
          // CORS制限でアクセスできない場合はスキップ
        }
      }
      
      // メインページの動画を探す
      const videos = document.querySelectorAll('video');
      return videos.length > 0 ? videos[0] : null;
    }
  
    /**
     * 動画終了時の処理
     */
    handleVideoEnd() {
      if (!this.isEnabled) {
        console.log('自動再生が無効です');
        return;
      }
      
      this.stopVideoMonitoring();
      console.log('次の動画を探します...');
      setTimeout(() => this.findAndPlayNextVideo(), 2000);
    }
  
    /**
     * 次の動画を探して再生
     */
    findAndPlayNextVideo() {
      console.log('次の動画のボタンを検索中...');
      
      const nextVideoInfo = this.findNextVideoInList();
      
      if (nextVideoInfo) {
        console.log('✅ 次の動画を発見:', nextVideoInfo.title);
        
        nextVideoInfo.element.click();
        this.showNotification('次の動画に移動: ' + nextVideoInfo.title);
        this.playVideoInCurrentPage();
      } else {
        console.log('❌ 次の動画が見つかりませんでした');
        this.showNotification('次の動画がありません');
      }
    }
  
    /**
     * リスト内で次の動画を探す
     */
    findNextVideoInList() {
      console.log('リスト内で次の動画を検索中...');
      
      const allListItems = document.querySelectorAll('li.sc-1y7jhg7-0');
      console.log('見つかったリスト項目数:', allListItems.length);
      
      const currentIndex = this.findCurrentVideoIndex(allListItems);
      
      if (currentIndex !== -1 && currentIndex + 1 < allListItems.length) {
        const nextLi = allListItems[currentIndex + 1];
        const nextLink = nextLi.querySelector('.sc-35qwhb-0');
        
        if (nextLink) {
          return {
            element: nextLink,
            title: nextLink.textContent.trim()
          };
        }
      }
      
      return null;
    }
  
    /**
     * 現在の動画のインデックスを探す
     */
    findCurrentVideoIndex(allListItems) {
      // 方法1: crtNbkクラスを持つ現在の動画を探す
      for (let i = 0; i < allListItems.length; i++) {
        const item = allListItems[i];
        const link = item.querySelector('.sc-35qwhb-0');
        
        if (link && link.classList.contains('crtNbk')) {
          console.log(`現在の動画（crtNbk）を発見: ${i}番目`, link.textContent.trim());
          return i;
        }
      }
      
      // 方法2: 最新の視聴済み項目を探す
      let latestIndex = -1;
      for (let i = 0; i < allListItems.length; i++) {
        const item = allListItems[i];
        
        const hasGreenIcon = item.querySelector('svg[color="#00c541"]');
        const hasProgressCircle = item.querySelector('.sc-qmabat-0');
        
        if (hasGreenIcon || hasProgressCircle) {
          latestIndex = i;
          const link = item.querySelector('.sc-35qwhb-0');
          console.log(`視聴済み/進行中を発見: ${i}番目`, link ? link.textContent.trim() : '不明');
        }
      }
      
      return latestIndex;
    }
  
    /**
     * 現在のページで動画を再生
     */
    playVideoInCurrentPage() {
      console.log('現在のページで動画を検索して再生します...');
      
      const tryPlay = (retryCount = 0) => {
        const video = this.findVideoElement();
        
        if (video) {
          console.log('動画を発見しました。再生を開始します...');
          
          video.play()
            .then(() => {
              console.log('✅ 動画の再生を開始しました');
              this.showNotification('動画再生開始');
              this.videoElement = video;
              this.startVideoMonitoring();
            })
            .catch(error => {
              console.log('動画の再生に失敗:', error);
              this.showNotification('動画再生に失敗');
            });
          
          return true;
        }
        
        if (retryCount < 2) {
          console.log(`動画が見つかりません。${retryCount + 1}秒後に再試行...`);
          setTimeout(() => tryPlay(retryCount + 1), (retryCount + 1) * 1000);
        } else {
          console.log('動画の再生に失敗しました');
          this.showNotification('動画が見つかりません');
        }
        
        return false;
      };
      
      tryPlay();
    }
  
    /**
     * 通知を表示
     */
    showNotification(message) {
      console.log('通知:', message);
      
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2196F3;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  
    /**
     * DOM変更の監視
     */
    observeChanges() {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const iframe = node.tagName === 'IFRAME' ? node : 
                             (node.querySelector ? node.querySelector('iframe') : null);
                
                if (iframe && this.isVideoPage()) {
                  console.log('新しいiframeが追加されました');
                  setTimeout(() => {
                    if (!this.checkInterval) {
                      this.startVideoMonitoring();
                    }
                  }, 1000);
                }
              }
            });
          }
        });
      });
  
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  
    /**
     * メッセージリスナーの設定
     */
    setupMessageListener() {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          return this.handleMessage(request, sender, sendResponse);
        });
      }
    }
  
    /**
     * メッセージ処理
     */
    handleMessage(request, sender, sendResponse) {
      switch (request.action) {
        case 'toggleAutoPlay':
          this.toggleAutoPlay(request.enabled);
          sendResponse({ success: true });
          break;
        
        case 'getStatus':
          sendResponse({ enabled: this.isEnabled });
          break;
        
        default:
          sendResponse({ error: 'Unknown action' });
      }
      
      return true;
    }
  
    /**
     * 自動再生のON/OFF切り替え
     */
    toggleAutoPlay(enabled) {
      this.isEnabled = enabled;
      console.log('設定変更:', this.isEnabled ? 'ON' : 'OFF');
      
      if (this.isEnabled && this.isVideoPage() && !this.checkInterval) {
        this.startVideoMonitoring();
      } else if (!this.isEnabled) {
        this.stopVideoMonitoring();
      }
    }
  
    /**
     * デバッグ用メソッド
     */
    getDebugInfo() {
      return {
        isEnabled: this.isEnabled,
        isVideoPage: this.isVideoPage(),
        hasMonitoring: !!this.checkInterval,
        hasVideo: !!this.videoElement,
        currentURL: window.location.href
      };
    }
  
    /**
     * 現在の動画インデックスを取得（デバッグ用）
     */
    getCurrentVideoIndex() {
      const crtNbkElement = document.querySelector('.crtNbk');
      if (!crtNbkElement) return -1;
      
      const link = crtNbkElement.parentElement;
      const ul = link.parentElement;
      return [...ul.children].indexOf(link);
    }
  
    /**
     * リスト項目の詳細情報を取得（デバッグ用）
     */
    getListItemsInfo() {
      const items = document.querySelectorAll('li.sc-1y7jhg7-0');
      return Array.from(items).map((item, i) => {
        const link = item.querySelector('.sc-35qwhb-0');
        const hasGreen = !!item.querySelector('svg[color="#00c541"]');
        const hasProgress = !!item.querySelector('.sc-qmabat-0');
        const isCurrent = link && link.classList.contains('crtNbk');
        
        return {
          index: i,
          title: link ? link.textContent.trim() : 'NO LINK',
          hasGreenIcon: hasGreen,
          hasProgress: hasProgress,
          isCurrent: isCurrent
        };
      });
    }
  }
  
  // 拡張機能のインスタンスを作成
  const autoPlayExtension = new AutoPlayExtension();
  
  // デバッグ用のグローバルオブジェクト
  window.autoPlayTest = {
    findNext: () => autoPlayExtension.findAndPlayNextVideo(),
    toggle: () => {
      autoPlayExtension.toggleAutoPlay(!autoPlayExtension.isEnabled);
      autoPlayExtension.showNotification(
        '自動再生: ' + (autoPlayExtension.isEnabled ? 'ON' : 'OFF')
      );
    },
    status: () => console.log('現在の状態:', autoPlayExtension.getDebugInfo()),
    getNowIndex: () => autoPlayExtension.getCurrentVideoIndex(),
    listItems: () => {
      const items = autoPlayExtension.getListItemsInfo();
      console.log('リスト項目:', items.length);
      items.forEach(item => {
        console.log(`${item.index}: ${item.title} (緑:${item.hasGreenIcon}, 進行:${item.hasProgress}, 現在:${item.isCurrent})`);
      });
    },
    playCurrentVideo: () => autoPlayExtension.playVideoInCurrentPage(),
    findCurrentLi: () => {
      const items = autoPlayExtension.getListItemsInfo();
      const current = items.find(item => item.isCurrent);
      if (current) {
        console.log(`✅ 現在のli要素: ${current.index}番目`, current.title);
        const next = items[current.index + 1];
        if (next) {
          console.log(`次のli要素: ${next.title}`);
        }
      } else {
        console.log('❌ 現在のli要素が見つかりませんでした');
      }
    },
    forceNext: () => {
      console.log('強制的に次の動画に移動...');
      autoPlayExtension.findAndPlayNextVideo();
    }
  };
  
  console.log('手動テスト: autoPlayTest.findNext() - 次の動画に移動');
  console.log('手動テスト: autoPlayTest.toggle() - ON/OFF切替');
  console.log('手動テスト: autoPlayTest.status() - 状態確認');
  console.log('手動テスト: autoPlayTest.listItems() - リスト項目確認');
  console.log('手動テスト: autoPlayTest.forceNext() - 強制的に次へ');