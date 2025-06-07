// ポップアップの制御スクリプト
document.addEventListener('DOMContentLoaded', async function() {
    const toggle = document.getElementById('autoPlayToggle');
    const status = document.getElementById('status');
    
    console.log('ポップアップ読み込み開始');
    
    try {
      // 現在の設定を読み込み
      const result = await chrome.storage.sync.get(['autoPlayEnabled']);
      const isEnabled = result.autoPlayEnabled !== false;
      toggle.checked = isEnabled;
      updateStatus(isEnabled);
      console.log('設定読み込み完了:', isEnabled);
      
      // 現在のタブ情報を取得
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab && currentTab.url.includes('nnn.ed.nico')) {
        status.textContent += ' (対象サイト)';
      } else {
        status.textContent += ' (対象外サイト)';
        status.style.color = '#orange';
      }
      
    } catch (error) {
      console.error('設定読み込みエラー:', error);
      updateStatus(true); // デフォルト値
    }
    
    // トグルの変更を監視
    toggle.addEventListener('change', async function() {
      const isEnabled = toggle.checked;
      console.log('トグル変更:', isEnabled);
      
      try {
        // 設定を保存
        await chrome.storage.sync.set({ autoPlayEnabled: isEnabled });
        updateStatus(isEnabled);
        
        // アクティブなタブのcontent scriptに設定変更を通知
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url.includes('nnn.ed.nico')) {
          try {
            await chrome.tabs.sendMessage(tabs[0].id, {
              action: 'toggleAutoPlay',
              enabled: isEnabled
            });
            console.log('content scriptに設定変更を通知しました');
          } catch (msgError) {
            console.log('content scriptへの通信エラー:', msgError);
          }
        }
      } catch (error) {
        console.error('設定保存エラー:', error);
      }
    });
    
    function updateStatus(isEnabled) {
      status.textContent = isEnabled ? '自動再生: ON' : '自動再生: OFF';
      status.style.color = isEnabled ? '#4CAF50' : '#f44336';
    }
  });