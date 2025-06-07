// 修正版：ページ遷移による自動再生拡張機能
console.log('=== 自動再生拡張機能 開始 ===');

// グローバル変数
let isAutoPlayEnabled = true;
let videoElement = null;
let checkInterval = null;

// 初期化
function initialize() {
  console.log('拡張機能を初期化中...');
  console.log('現在のURL:', window.location.href);
  
  // 設定を読み込み
  loadSettings();
  
  // 動画ページの場合は動画終了監視を開始
  if (isVideoPage()) {
    startVideoMonitoring();
  }
  
  // DOM変更を監視
  observeChanges();
}

// 動画ページかどうかを判定
function isVideoPage() {
  return window.location.href.includes('/movie/') || 
         window.location.href.includes('/contents/courses/');
}

// 設定の読み込み
function loadSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(['autoPlayEnabled'], (result) => {
      isAutoPlayEnabled = result.autoPlayEnabled !== false;
      console.log('設定読み込み完了. 自動再生:', isAutoPlayEnabled);
    });
  }
}

// 動画の監視を開始
function startVideoMonitoring() {
  console.log('動画監視を開始します...');
  
  // 既存の監視を停止
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  // 1秒ごとに動画の状態をチェック
  checkInterval = setInterval(() => {
    checkVideoStatus();
  }, 1000);
  
  // 初回チェック
  setTimeout(() => checkVideoStatus(), 2000);
}

// 動画の状態をチェック
function checkVideoStatus() {
  if (!isAutoPlayEnabled) {
    return;
  }
  
  // iframe内の動画を探す
  const iframes = document.querySelectorAll('iframe');
  let videoFound = false;
  
  iframes.forEach((iframe, index) => {
    try {
      if (iframe.contentDocument) {
        const videos = iframe.contentDocument.querySelectorAll('video');
        if (videos.length > 0) {
          const video = videos[0];
          videoFound = true;
          
          // 動画が終了したかチェック
          if (video.ended) {
            console.log('🎬 動画が終了しました！');
            handleVideoEnd();
          } else if (video.currentTime > 0 && !videoElement) {
            // 動画が見つかった場合は参照を保存
            videoElement = video;
            console.log('動画要素を発見しました');
          }
        }
      }
    } catch (e) {
      // CORS制限の場合は別の方法でチェック
      // console.log(`iframe ${index} にアクセスできません`);
    }
  });
  
  // iframe外の動画もチェック
  if (!videoFound) {
    const videos = document.querySelectorAll('video');
    if (videos.length > 0) {
      const video = videos[0];
      if (video.ended) {
        console.log('🎬 動画が終了しました！');
        handleVideoEnd();
      } else if (video.currentTime > 0 && !videoElement) {
        videoElement = video;
        console.log('動画要素を発見しました');
      }
    }
  }
}

// 動画終了時の処理
function handleVideoEnd() {
  if (!isAutoPlayEnabled) {
    console.log('自動再生が無効です');
    return;
  }
  
  // 動画終了の監視を停止
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  
  console.log('次の動画を探します...');
  setTimeout(findAndClickNextVideo, 2000);
}

// 次の動画のボタンを探してクリック
function findAndClickNextVideo() {
  console.log('次の動画のボタンを検索中...');
  
  // 動画ページにいる場合は親ページに戻る
//   if (window.location.href.includes('/movie/') || window.location.href.includes('/contents/courses/')) {
//     // 親ページに戻る
//     const backButton = document.querySelector('button[aria-label="ひとつ前のパンくずへ戻る"]');
//     if (backButton) {
//       console.log('リストページに戻ります...');
//       backButton.click();
      
//       // ページ遷移後に次の動画を探す
//       setTimeout(() => {
//         findNextVideoInList();
//       }, 1500);
//       return;
//     }
//   }
  
  // 既にリストページにいる場合
  findNextVideoInList();
}

// リスト内で次の動画を探す
function findNextVideoInList() {
  console.log('リスト内で次の動画を検索中...');
  
  // 全てのリスト項目を取得
  console.log(window.autoPlayTest.getNowIndex())
  const allListItems = document.querySelectorAll('li.sc-1y7jhg7-0');
  console.log('見つかったリスト項目数:', allListItems.length);
  
  // 現在の動画のli要素を探す
  let currentIndex = -1;
  
  // 方法1: crtNbkクラスを持つ現在の動画を探す
  for (let i = 0; i < allListItems.length; i++) {
    const item = allListItems[i];
    const link = item.querySelector('.sc-35qwhb-0');
    
    if (link && link.classList.contains('crtNbk')) {
      currentIndex = i;
      console.log(`現在の動画（crtNbk）を発見: ${i}番目`, link.textContent.trim());
      break;
    }
  }
  
  // 方法2: crtNbkが見つからない場合、最新の視聴済み項目を探す
  if (currentIndex === -1) {
    for (let i = 0; i < allListItems.length; i++) {
      const item = allListItems[i];
      
      // 視聴済み（緑色のアイコン）
      const hasGreenIcon = item.querySelector('svg[color="#00c541"]');
      // 進行中（円形プログレスバー）
      const hasProgressCircle = item.querySelector('.sc-qmabat-0');
      
      if (hasGreenIcon || hasProgressCircle) {
        currentIndex = i;
        const link = item.querySelector('.sc-35qwhb-0');
        console.log(`現在の動画（視聴済み/進行中）を発見: ${i}番目`, link ? link.textContent.trim() : '不明');
      }
    }
  }
  
  // 次のli要素を探す
  if (currentIndex !== -1 && currentIndex + 1 < allListItems.length) {
    const nextLi = allListItems[currentIndex + 1];
    const nextLink = nextLi.querySelector('.sc-35qwhb-0');
    
    if (nextLink) {
      const nextTitle = nextLink.textContent.trim();
      console.log('✅ 次のli要素を発見:', nextTitle);
      
      // 次のli要素をクリックして移動
      nextLink.click();
      showNotification('次の動画に移動: ' + nextTitle);
      
      // ページ移動後、その動画を再生
      setTimeout(() => {
        playVideoInCurrentPage();
      }, 2000);
      
      return;
    }
  }
  
  console.log('❌ 次の動画が見つかりませんでした');
  console.log('現在の動画インデックス:', currentIndex);
  console.log('総動画数:', allListItems.length);
  showNotification('次の動画がありません');
}

// 現在のページで動画を再生
function playVideoInCurrentPage() {
  console.log('現在のページで動画を検索して再生します...');
  
  // 動画要素を探して再生
  const findAndPlayVideo = () => {
    // メインページの動画
    let videos = document.querySelectorAll('video');
    
    // iframe内の動画も探す
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
      try {
        if (iframe.contentDocument) {
          const iframeVideos = iframe.contentDocument.querySelectorAll('video');
          if (iframeVideos.length > 0) {
            videos = iframeVideos;
            console.log(`iframe ${index} 内で動画を発見`);
          }
        }
      } catch (e) {
        console.log(`iframe ${index} にアクセスできません:`, e.message);
      }
    });
    
    if (videos.length > 0) {
      const video = videos[0];
      console.log('動画を発見しました。再生を開始します...');
      
      // 動画を再生
      video.play().then(() => {
        console.log('✅ 動画の再生を開始しました');
        showNotification('動画再生開始');
        
        // 動画監視を再開
        videoElement = video;
        startVideoMonitoring();
        
      }).catch(error => {
        console.log('動画の再生に失敗:', error);
        showNotification('動画再生に失敗');
      });
      
      return true;
    }
    
    return false;
  };
  
  // 動画が見つからない場合は再試行
  if (!findAndPlayVideo()) {
    console.log('動画が見つかりません。1秒後に再試行...');
    setTimeout(() => {
      if (!findAndPlayVideo()) {
        console.log('動画が見つかりません。2秒後に再試行...');
        setTimeout(() => {
          if (!findAndPlayVideo()) {
            console.log('動画の再生に失敗しました');
            showNotification('動画が見つかりません');
          }
        }, 2000);
      }
    }, 1000);
  }
}

// 通知を表示
function showNotification(message) {
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
  
  // 3秒後に削除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// DOM変更の監視
function observeChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        // 新しいiframeが追加された場合
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const iframe = node.tagName === 'IFRAME' ? node : (node.querySelector ? node.querySelector('iframe') : null);
            if (iframe && isVideoPage()) {
              console.log('新しいiframeが追加されました');
              setTimeout(() => {
                if (!checkInterval) {
                  startVideoMonitoring();
                }
              }, 1000);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 設定変更の処理
function handleMessage(request, sender, sendResponse) {
  if (request.action === 'toggleAutoPlay') {
    isAutoPlayEnabled = request.enabled;
    console.log('設定変更:', isAutoPlayEnabled ? 'ON' : 'OFF');
    
    if (isAutoPlayEnabled && isVideoPage() && !checkInterval) {
      startVideoMonitoring();
    } else if (!isAutoPlayEnabled && checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    
    sendResponse({success: true});
  } else if (request.action === 'getStatus') {
    sendResponse({enabled: isAutoPlayEnabled});
  }
  return true;
}

// 手動テスト用の関数（デバッグ用）
window.autoPlayTest = {
  findNext: findAndClickNextVideo,
  toggle: () => {
    isAutoPlayEnabled = !isAutoPlayEnabled;
    console.log('自動再生:', isAutoPlayEnabled ? 'ON' : 'OFF');
    showNotification('自動再生: ' + (isAutoPlayEnabled ? 'ON' : 'OFF'));
    
    if (isAutoPlayEnabled && isVideoPage() && !checkInterval) {
      startVideoMonitoring();
    } else if (!isAutoPlayEnabled && checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  },
  status: () => {
    console.log('現在の状態:', {
      isEnabled: isAutoPlayEnabled,
      isVideoPage: isVideoPage(),
      hasMonitoring: !!checkInterval,
      hasVideo: !!videoElement,
      currentURL: window.location.href
    });
  },
  getNowIndex: () => {
    console.log(document.getElementsByClassName("sc-aXZVg sc-gEvEer sc-l5r9s4-0 dKubqp fteAEG bKupGM"))
    console.log(document.getElementsByClassName('crtNbk'));
    const item = document.getElementsByClassName('crtNbk')[0];
    console.log(item)
    const link = item.parentElement;
    console.log(link)
    const ul = link.parentElement;
    console.log(ul)
    const index = [...ul.children].indexOf(link);
    console.log(index)
    return index;
  },
  listItems: () => {
    const items = document.querySelectorAll('li.sc-1y7jhg7-0');
    console.log('リスト項目:', items.length);
    items.forEach((item, i) => {
      const link = item.querySelector('.sc-35qwhb-0');
      const hasGreen = item.querySelector('svg[color="#00c541"]');
      const hasProgress = item.querySelector('.sc-qmabat-0');
      const isCurrent = link && link.classList.contains('crtNbk');
      console.log(`${i}: ${link ? link.textContent.trim() : 'NO LINK'} (緑:${!!hasGreen}, 進行:${!!hasProgress}, crtNbk:${isCurrent})`);
    });
  },
  playCurrentVideo: () => {
    console.log('現在のページの動画を再生します...');
    playVideoInCurrentPage();
  },
  findCurrentLi: () => {
    const items = document.querySelectorAll('li.sc-1y7jhg7-0');
    console.log('現在のli要素を検索中...');
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const link = item.querySelector('.sc-35qwhb-0');
      
      if (link && link.classList.contains('crtNbk')) {
        console.log(`✅ 現在のli要素: ${i}番目`, link.textContent.trim());
        
        // 次の項目も確認
        if (i + 1 < items.length) {
          const nextItem = items[i + 1];
          const nextLink = nextItem.querySelector('.sc-35qwhb-0');
          console.log(`次のli要素: ${nextLink ? nextLink.textContent.trim() : 'NO LINK'}`);
        }
        return;
      }
    }
    
    console.log('❌ 現在のli要素が見つかりませんでした');
  },
  forceNext: () => {
    console.log('強制的に次の動画に移動...');
    findAndClickNextVideo();
  }
};

// メッセージリスナー
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener(handleMessage);
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('=== 拡張機能準備完了 ===');
console.log('手動テスト: autoPlayTest.findNext() - 次の動画に移動');
console.log('手動テスト: autoPlayTest.toggle() - ON/OFF切替');
console.log('手動テスト: autoPlayTest.status() - 状態確認');
console.log('手動テスト: autoPlayTest.listItems() - リスト項目確認');
console.log('手動テスト: autoPlayTest.forceNext() - 強制的に次へ');